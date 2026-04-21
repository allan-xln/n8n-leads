import axios from "axios";
import { env } from "../config/env.js";
import { isValidWhatsAppPhone, normalizeWhatsAppPhone } from "../utils/phone.js";

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

function extractValidationEntries(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.numbers)) {
    return payload.numbers;
  }

  return [];
}

function toUniqueCandidateNumbers(leads) {
  return [...new Set(
    leads
      .map((lead) => normalizeWhatsAppPhone(lead.contactPhone || lead.metadata?.contactPhone || ""))
      .filter(isValidWhatsAppPhone)
  )];
}

export async function verifyLeadWhatsAppNumbers(leads) {
  if (!env.whatsappLeadVerificationEnabled) {
    return {
      leads,
      checkedCount: 0,
      verifiedCount: leads.length,
      skipped: true,
      reason: "verification-disabled"
    };
  }

  if (env.whatsappApiProviderKind !== "evolution") {
    return {
      leads,
      checkedCount: 0,
      verifiedCount: leads.length,
      skipped: true,
      reason: "provider-not-supported"
    };
  }

  if (!env.whatsappApiBaseUrl || !env.whatsappApiInstance || !env.whatsappApiToken) {
    throw new Error("WhatsApp verification requires Evolution base URL, instance and API token.");
  }

  const candidateNumbers = toUniqueCandidateNumbers(leads);

  if (!candidateNumbers.length) {
    return {
      leads: [],
      checkedCount: 0,
      verifiedCount: 0,
      skipped: false,
      reason: "no-valid-phone-candidates"
    };
  }

  const requestUrl = buildUrl(env.whatsappApiBaseUrl, env.whatsappNumberCheckPath);
  const existsByNumber = new Map();

  for (let index = 0; index < candidateNumbers.length; index += env.whatsappNumberCheckBatchSize) {
    const numbers = candidateNumbers.slice(index, index + env.whatsappNumberCheckBatchSize);
    const response = await axios({
      method: "post",
      url: requestUrl,
      headers: buildHeaders(),
      data: { numbers },
      timeout: env.whatsappApiTimeoutMs
    });
    const entries = extractValidationEntries(response.data);

    for (const entry of entries) {
      const number = normalizeWhatsAppPhone(entry?.number || "");

      if (!number) {
        continue;
      }

      existsByNumber.set(number, entry?.exists === true);
    }
  }

  return {
    leads: leads.filter((lead) => {
      const number = normalizeWhatsAppPhone(lead.contactPhone || lead.metadata?.contactPhone || "");
      return number && existsByNumber.get(number) === true;
    }),
    checkedCount: candidateNumbers.length,
    verifiedCount: [...existsByNumber.values()].filter(Boolean).length,
    skipped: false,
    reason: null
  };
}
