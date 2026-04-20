import { env } from "../config/env.js";
import { httpWhatsAppProvider } from "../providers/httpWhatsAppProvider.js";
import { mockWhatsAppProvider } from "../providers/mockWhatsAppProvider.js";

export function getWhatsAppProviderPlan() {
  const preferredProvider = env.whatsappProvider === "http" || env.whatsappApiBaseUrl ? httpWhatsAppProvider : mockWhatsAppProvider;
  const fallbackProvider = preferredProvider.name === mockWhatsAppProvider.name ? null : mockWhatsAppProvider;

  return {
    preferredProvider,
    fallbackProvider
  };
}

export function getWhatsAppProvider() {
  return getWhatsAppProviderPlan().preferredProvider;
}
