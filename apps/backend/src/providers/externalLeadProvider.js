import axios from "axios";
import { env } from "../config/env.js";
import { buildGeographicStrategy } from "../services/geographicStrategyService.js";

class LeadProviderHttpError extends Error {
  constructor(message, providerMeta = {}, options = {}) {
    super(message);
    this.name = "LeadProviderHttpError";
    this.providerMeta = providerMeta;
    this.code = options.code || null;
  }
}

function buildUrl(baseUrl, path) {
  return new URL(path.replace(/^\//, ""), `${baseUrl.replace(/\/$/, "")}/`).toString();
}

function getValueByPath(source, path) {
  if (!path) {
    return source;
  }

  return path.split(".").reduce((current, key) => {
    if (current && typeof current === "object") {
      return current[key];
    }

    return undefined;
  }, source);
}

function buildProviderPayload(config, options, geographicStrategy) {
  return {
    niches: config.niches,
    cities: config.cities,
    nationwide: geographicStrategy.nationwide,
    priorityCities: geographicStrategy.priorityCities,
    secondaryCities: geographicStrategy.secondaryCities,
    geography: {
      nationwide: geographicStrategy.nationwide,
      priorityCities: geographicStrategy.priorityCities,
      secondaryCities: geographicStrategy.secondaryCities,
      cities: geographicStrategy.combinedCities,
      primaryFocusLabel: geographicStrategy.primaryFocusLabel
    },
    limit: options.limit || config.leadLimit,
    requestContext: {
      runTime: config.runTime,
      destinationWhatsApp: config.destinationWhatsApp,
      primaryFocusLabel: geographicStrategy.primaryFocusLabel,
      reason: options.reason || "unspecified"
    }
  };
}

function buildHeaders() {
  const headers = {
    ...env.leadExternalApiHeaders
  };

  if (env.leadExternalApiToken) {
    headers[env.leadExternalApiAuthHeader] = env.leadExternalApiAuthScheme
      ? `${env.leadExternalApiAuthScheme} ${env.leadExternalApiToken}`
      : env.leadExternalApiToken;
  }

  return headers;
}

function formatAxiosError(error) {
  if (!axios.isAxiosError(error)) {
    return {
      message: error.message,
      code: error.code || null,
      responseStatus: null
    };
  }

  if (error.code === "ECONNABORTED") {
    return {
      message: `HTTP lead provider timed out after ${env.leadExternalApiTimeoutMs}ms.`,
      code: error.code,
      responseStatus: error.response?.status || null
    };
  }

  const status = error.response?.status;
  const apiMessage = error.response?.data?.message || error.response?.data?.error;
  return {
    message: `HTTP lead provider failed (${status || "network-error"}): ${apiMessage || error.message}`,
    code: error.code || null,
    responseStatus: status || null
  };
}

function extractLeadsFromResponse(responseData) {
  const configuredValue = getValueByPath(responseData, env.leadExternalApiResponsePath);

  if (Array.isArray(configuredValue)) {
    return configuredValue;
  }

  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.leads)) {
    return responseData.leads;
  }

  if (Array.isArray(responseData?.items)) {
    return responseData.items;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  throw new Error(
    `HTTP lead provider response does not contain a lead array at "${env.leadExternalApiResponsePath}".`
  );
}

export const externalLeadProvider = {
  name: env.leadExternalApiProviderName,
  kind: "http",
  isEnabled() {
    return env.externalProviderEnabled;
  },
  async fetchLeads(config, options = {}) {
    if (!env.leadExternalApiBaseUrl) {
      throw new LeadProviderHttpError("External lead provider enabled without API base URL.", {
        providerName: env.leadExternalApiProviderName,
        requestMethod: env.leadExternalApiMethod,
        responsePath: env.leadExternalApiResponsePath,
        timeoutMs: env.leadExternalApiTimeoutMs
      });
    }

    const geographicStrategy = buildGeographicStrategy(config);
    const payload = buildProviderPayload(config, options, geographicStrategy);
    const requestUrl = buildUrl(env.leadExternalApiBaseUrl, env.leadExternalApiPath);
    const providerMeta = {
      providerName: env.leadExternalApiProviderName,
      requestUrl,
      requestMethod: env.leadExternalApiMethod,
      responsePath: env.leadExternalApiResponsePath,
      timeoutMs: env.leadExternalApiTimeoutMs,
      nationwide: geographicStrategy.nationwide,
      priorityCities: geographicStrategy.priorityCities,
      secondaryCities: geographicStrategy.secondaryCities,
      primaryFocusLabel: geographicStrategy.primaryFocusLabel
    };
    const requestConfig = {
      method: env.leadExternalApiMethod.toLowerCase(),
      url: requestUrl,
      headers: buildHeaders(),
      timeout: env.leadExternalApiTimeoutMs
    };

    if (env.leadExternalApiMethod === "GET") {
      requestConfig.params = payload;
    } else {
      requestConfig.data = payload;
    }

    try {
      const response = await axios(requestConfig);
      const leads = extractLeadsFromResponse(response.data);

      return {
        leads,
        __providerMeta: {
          ...providerMeta,
          responseStatus: response.status,
          responseContentType: response.headers?.["content-type"] || null
        }
      };
    } catch (error) {
      const formattedError = formatAxiosError(error);

      throw new LeadProviderHttpError(
        formattedError.message,
        {
          ...providerMeta,
          responseStatus: formattedError.responseStatus
        },
        {
          code: formattedError.code
        }
      );
    }
  }
};
