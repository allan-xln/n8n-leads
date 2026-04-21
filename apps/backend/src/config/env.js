import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../../../");

dotenv.config({
  path: path.join(rootDir, ".env")
});

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
}

function toJsonObject(value, fallback = {}) {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
}

function toString(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value;
}

function envString(name, fallback = "") {
  return process.env[name] === undefined ? fallback : process.env[name];
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  appTimezone: process.env.APP_TIMEZONE || "America/Sao_Paulo",
  backendHost: process.env.BACKEND_HOST || "0.0.0.0",
  backendPort: toNumber(process.env.BACKEND_PORT, 8095),
  backendPublicUrl: process.env.BACKEND_PUBLIC_URL || "http://localhost:8095",
  dataDir: path.resolve(rootDir, process.env.DATA_DIR || "./data"),
  leadBatchDefaultLimit: toNumber(process.env.LEAD_BATCH_DEFAULT_LIMIT, 20),
  leadBatchMaxLimit: toNumber(process.env.LEAD_BATCH_MAX_LIMIT, 50),
  leadDefaultRuntime: process.env.LEAD_DEFAULT_RUNTIME || "05:00",
  mockProviderEnabled: process.env.MOCK_PROVIDER_ENABLED !== "false",
  mockProviderMode: process.env.MOCK_PROVIDER_MODE || "fallback",
  externalProviderEnabled: process.env.EXTERNAL_PROVIDER_ENABLED === "true",
  leadExternalApiProviderKind: process.env.LEAD_EXTERNAL_API_PROVIDER_KIND || "generic",
  leadExternalApiProviderName: process.env.LEAD_EXTERNAL_API_PROVIDER_NAME || "externalLeadProvider",
  leadExternalApiBaseUrl: process.env.LEAD_EXTERNAL_API_BASE_URL || "",
  leadExternalApiToken: process.env.LEAD_EXTERNAL_API_TOKEN || "",
  leadExternalApiMethod: (process.env.LEAD_EXTERNAL_API_METHOD || "POST").toUpperCase(),
  leadExternalApiPath: process.env.LEAD_EXTERNAL_API_PATH || "/leads/search",
  leadExternalApiResponsePath: process.env.LEAD_EXTERNAL_API_RESPONSE_PATH || "leads",
  leadExternalApiTimeoutMs: toNumber(process.env.LEAD_EXTERNAL_API_TIMEOUT_MS, 12000),
  leadExternalApiAuthScheme: envString("LEAD_EXTERNAL_API_AUTH_SCHEME", "Bearer"),
  leadExternalApiAuthHeader: process.env.LEAD_EXTERNAL_API_AUTH_HEADER || "Authorization",
  leadExternalApiHeaders: toJsonObject(process.env.LEAD_EXTERNAL_API_HEADERS_JSON, {}),
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || "",
  googlePlacesApiUrl: process.env.GOOGLE_PLACES_API_URL || "https://places.googleapis.com/v1/places:searchText",
  googlePlacesFieldMask:
    process.env.GOOGLE_PLACES_FIELD_MASK ||
    "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.businessStatus,places.primaryType,places.types,places.googleMapsUri,places.nationalPhoneNumber,places.internationalPhoneNumber",
  googlePlacesTimeoutMs: toNumber(process.env.GOOGLE_PLACES_TIMEOUT_MS, toNumber(process.env.LEAD_EXTERNAL_API_TIMEOUT_MS, 12000)),
  googlePlacesLanguageCode: process.env.GOOGLE_PLACES_LANGUAGE_CODE || "pt-BR",
  googlePlacesRegionCode: process.env.GOOGLE_PLACES_REGION_CODE || "BR",
  googlePlacesMaxResultsPerQuery: toNumber(process.env.GOOGLE_PLACES_MAX_RESULTS_PER_QUERY, 5),
  googlePlacesMaxCallsPerRun: toNumber(process.env.GOOGLE_PLACES_MAX_CALLS_PER_RUN, 8),
  googlePlacesDailyCallLimit: toNumber(process.env.GOOGLE_PLACES_DAILY_CALL_LIMIT, 100),
  googlePlacesMonthlyCallLimit: toNumber(process.env.GOOGLE_PLACES_MONTHLY_CALL_LIMIT, 2000),
  whatsappProvider: process.env.WHATSAPP_PROVIDER || "mock",
  whatsappDispatchEnabled: toBoolean(process.env.WHATSAPP_DISPATCH_ENABLED, false),
  whatsappApiProviderName: process.env.WHATSAPP_API_PROVIDER_NAME || "httpWhatsAppProvider",
  whatsappApiProviderKind:
    process.env.WHATSAPP_API_PROVIDER_KIND ||
    process.env.WHATSAPP_API_MODE ||
    (process.env.WHATSAPP_PROVIDER === "evolution" ? "evolution" : "generic"),
  whatsappApiBaseUrl: process.env.WHATSAPP_API_BASE_URL || "",
  whatsappApiToken: process.env.WHATSAPP_API_TOKEN || "",
  whatsappApiPath: process.env.WHATSAPP_API_PATH || "/messages",
  whatsappApiTimeoutMs: toNumber(process.env.WHATSAPP_API_TIMEOUT_MS, 10000),
  whatsappApiAuthScheme: envString("WHATSAPP_API_AUTH_SCHEME", "Bearer"),
  whatsappApiAuthHeader: process.env.WHATSAPP_API_AUTH_HEADER || "Authorization",
  whatsappApiHeaders: toJsonObject(process.env.WHATSAPP_API_HEADERS_JSON, {}),
  whatsappApiInstance: process.env.WHATSAPP_API_INSTANCE || "",
  whatsappApiDestinationField: process.env.WHATSAPP_API_DESTINATION_FIELD || "to",
  whatsappApiMessageField: process.env.WHATSAPP_API_MESSAGE_FIELD || "message",
  whatsappApiResponsePath: process.env.WHATSAPP_API_RESPONSE_PATH || "",
  whatsappApiExtraBody: toJsonObject(process.env.WHATSAPP_API_EXTRA_BODY_JSON, {}),
  whatsappApiSourceNumber: toString(process.env.WHATSAPP_API_SOURCE_NUMBER, ""),
  whatsappLeadVerificationEnabled: toBoolean(
    process.env.WHATSAPP_LEAD_VERIFICATION_ENABLED,
    (process.env.WHATSAPP_API_PROVIDER_KIND || process.env.WHATSAPP_API_MODE || process.env.WHATSAPP_PROVIDER) === "evolution"
  ),
  whatsappNumberCheckPath: process.env.WHATSAPP_NUMBER_CHECK_PATH || "/chat/whatsappNumbers/{instance}",
  whatsappNumberCheckBatchSize: toNumber(process.env.WHATSAPP_NUMBER_CHECK_BATCH_SIZE, 20)
};
