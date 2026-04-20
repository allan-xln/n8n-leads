import axios from "axios";
import { env } from "../config/env.js";

class WhatsAppProviderHttpError extends Error {
  constructor(message, diagnostics = {}, options = {}) {
    super(message);
    this.name = "WhatsAppProviderHttpError";
    this.diagnostics = diagnostics;
    this.code = options.code || null;
  }
}

function buildUrl(baseUrl, path) {
  let resolvedPath = path;

  if (env.whatsappApiProviderKind === "evolution" && env.whatsappApiInstance) {
    if (resolvedPath.includes("{instance}")) {
      resolvedPath = resolvedPath.replace("{instance}", env.whatsappApiInstance);
    } else {
      resolvedPath = `${resolvedPath.replace(/\/$/, "")}/${env.whatsappApiInstance}`;
    }
  }

  return new URL(resolvedPath.replace(/^\//, ""), `${baseUrl.replace(/\/$/, "")}/`).toString();
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

function normalizeWhatsAppNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("55")) {
    return digits;
  }

  if (digits.length === 11 || digits.length === 10) {
    return `55${digits}`;
  }

  return digits;
}

function normalizeContactActionNumber(value) {
  const normalized = normalizeWhatsAppNumber(value);

  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("55") && normalized.length >= 12) {
    return normalized;
  }

  return "";
}

function buildLeadContactLine(lead, index) {
  const rawPhone = lead.contactPhone || lead.metadata?.contactPhone || "";
  const normalizedPhone = normalizeContactActionNumber(rawPhone);
  const phoneLabel = rawPhone || "telefone nao encontrado";
  const actionLink = normalizedPhone ? `https://wa.me/${normalizedPhone}` : lead.website || "sem whatsapp direto";

  return `${index + 1}. ${lead.companyName} | nicho: ${lead.segment} | contato: ${phoneLabel} | acao: ${actionLink}`;
}

function buildMessage({ digest, summary, leads }) {
  const lines = [
    `Lead digest: ${summary.totalQualified} leads qualificados.`,
    `${summary.highPriorityCount} leads em alta prioridade.`,
    digest.headline
  ];

  if (leads.length) {
    lines.push("Leads prontos para contato:");
    lines.push(...leads.map((lead, index) => buildLeadContactLine(lead, index)));
  }

  if (digest?.recommendations?.length) {
    lines.push(`Acao sugerida: ${digest.recommendations[0]}`);
  }

  return lines.join("\n");
}

function buildHeaders() {
  const headers = {
    "Content-Type": "application/json",
    ...env.whatsappApiHeaders
  };

  if (env.whatsappApiToken) {
    headers[env.whatsappApiAuthHeader] = env.whatsappApiAuthScheme
      ? `${env.whatsappApiAuthScheme} ${env.whatsappApiToken}`
      : env.whatsappApiToken;
  }

  return headers;
}

function buildRequestBody({ destinationNumber, message, digest, summary, leads }) {
  if (env.whatsappApiProviderKind === "evolution") {
    return {
      number: destinationNumber,
      text: message,
      delay: 1200,
      metadata: {
        sourceNumber: env.whatsappApiSourceNumber || null,
        totalQualified: summary.totalQualified,
        highPriorityCount: summary.highPriorityCount,
        topLeadId: leads[0]?.id || null,
        headline: digest.headline
      },
      ...env.whatsappApiExtraBody
    };
  }

  return {
    [env.whatsappApiDestinationField]: destinationNumber,
    [env.whatsappApiMessageField]: message,
    metadata: {
      sourceNumber: env.whatsappApiSourceNumber || null,
      totalQualified: summary.totalQualified,
      highPriorityCount: summary.highPriorityCount,
      topLeadId: leads[0]?.id || null,
      headline: digest.headline
    },
    ...env.whatsappApiExtraBody
  };
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
      message: `WhatsApp provider timed out after ${env.whatsappApiTimeoutMs}ms.`,
      code: error.code,
      responseStatus: error.response?.status || null
    };
  }

  const status = error.response?.status;
  const apiMessage = error.response?.data?.message || error.response?.data?.error || error.response?.data?.response?.message;

  return {
    message: `WhatsApp provider failed (${status || "network-error"}): ${apiMessage || error.message}`,
    code: error.code || null,
    responseStatus: status || null
  };
}

export const httpWhatsAppProvider = {
  name: env.whatsappApiProviderName,
  mode: "http",
  isReady() {
    return Boolean(env.whatsappApiBaseUrl);
  },
  createPayload({ destinationWhatsApp, digest, summary, leads = [] }) {
    const destinationNumber = normalizeWhatsAppNumber(destinationWhatsApp);
    const message = buildMessage({ digest, summary, leads });
    const requestUrl = env.whatsappApiBaseUrl ? buildUrl(env.whatsappApiBaseUrl, env.whatsappApiPath) : "";
    const requestBody = buildRequestBody({
      destinationNumber,
      message,
      digest,
      summary,
      leads
    });

    return {
      destination: destinationNumber,
      originalDestination: destinationWhatsApp || "",
      providerBaseUrl: env.whatsappApiBaseUrl || "",
      providerKind: env.whatsappApiProviderKind,
      authConfigured: Boolean(env.whatsappApiToken),
      request: {
        method: "POST",
        url: requestUrl,
        headers: {
          ...env.whatsappApiHeaders,
          [env.whatsappApiAuthHeader]: env.whatsappApiToken
            ? env.whatsappApiAuthScheme
              ? `${env.whatsappApiAuthScheme} <configured-token>`
              : "<configured-token>"
            : "<not-configured>"
        },
        body: requestBody
      }
    };
  },
  async send(payload) {
    const requestPayload = this.createPayload(payload);
    const diagnostics = {
      providerName: env.whatsappApiProviderName,
      providerKind: env.whatsappApiProviderKind,
      requestUrl: requestPayload.request.url,
      requestMethod: requestPayload.request.method,
      timeoutMs: env.whatsappApiTimeoutMs,
      destination: requestPayload.destination,
      responsePath: env.whatsappApiResponsePath || null
    };

    if (!requestPayload.destination) {
      throw new WhatsAppProviderHttpError("WhatsApp destination is missing or invalid.", diagnostics);
    }

    try {
      const response = await axios({
        method: "post",
        url: requestPayload.request.url,
        headers: buildHeaders(),
        data: requestPayload.request.body,
        timeout: env.whatsappApiTimeoutMs
      });

      return {
        statusCode: response.status,
        responsePreview: env.whatsappApiResponsePath
          ? getValueByPath(response.data, env.whatsappApiResponsePath)
          : response.data,
        diagnostics: {
          ...diagnostics,
          responseStatus: response.status,
          responseContentType: response.headers?.["content-type"] || null
        }
      };
    } catch (error) {
      const formattedError = formatAxiosError(error);

      throw new WhatsAppProviderHttpError(
        formattedError.message,
        {
          ...diagnostics,
          responseStatus: formattedError.responseStatus
        },
        {
          code: formattedError.code
        }
      );
    }
  }
};
