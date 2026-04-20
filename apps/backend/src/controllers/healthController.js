import { env } from "../config/env.js";

export function getHealth(_request, response) {
  response.json({
    status: "ok",
    service: "lead-qualification-backend",
    timestamp: new Date().toISOString(),
    timezone: env.appTimezone,
    mockProviderEnabled: env.mockProviderEnabled,
    mockProviderMode: env.mockProviderMode,
    externalProviderEnabled: env.externalProviderEnabled,
    whatsappDispatchEnabled: env.whatsappDispatchEnabled,
    whatsappProvider: env.whatsappProvider
  });
}
