import { env } from "../config/env.js";
import { getWhatsAppProviderPlan } from "./whatsappProviderFactory.js";

function createDiagnosticsEntry(providerName, status, details = {}) {
  return {
    providerName,
    status,
    timestamp: new Date().toISOString(),
    ...details
  };
}

function createMockFallbackResult(fallbackProvider, payload, diagnostics, fallbackReason, attemptedPayload = null) {
  return {
    providerName: fallbackProvider.name,
    mode: fallbackProvider.mode,
    status: "mock-fallback",
    dispatched: false,
    fallbackUsed: true,
    fallbackReason,
    payload: fallbackProvider.createPayload(payload),
    diagnostics,
    attemptedPayload
  };
}

export async function createWhatsAppDispatchPreview(payload) {
  const { preferredProvider, fallbackProvider } = getWhatsAppProviderPlan();
  const diagnostics = [];

  if (preferredProvider.mode === "mock") {
    return {
      providerName: preferredProvider.name,
      mode: preferredProvider.mode,
      status: "mock-preview",
      dispatched: false,
      fallbackUsed: false,
      payload: preferredProvider.createPayload(payload),
      diagnostics: [createDiagnosticsEntry(preferredProvider.name, "preview")]
    };
  }

  const preferredPayload = preferredProvider.createPayload(payload);

  if (!preferredProvider.isReady()) {
    diagnostics.push(
      createDiagnosticsEntry(preferredProvider.name, "not-ready", {
        reason: "missing-whatsapp-provider-config"
      })
    );

    return createMockFallbackResult(
      fallbackProvider,
      payload,
      diagnostics,
      "missing-whatsapp-provider-config",
      preferredPayload
    );
  }

  if (!env.whatsappDispatchEnabled) {
    return {
      providerName: preferredProvider.name,
      mode: preferredProvider.mode,
      status: "preview-only",
      dispatched: false,
      fallbackUsed: false,
      payload: preferredPayload,
      diagnostics: [
        createDiagnosticsEntry(preferredProvider.name, "skipped", {
          reason: "whatsapp-dispatch-disabled"
        })
      ]
    };
  }

  try {
    const result = await preferredProvider.send(payload);
    diagnostics.push(
      createDiagnosticsEntry(preferredProvider.name, "sent", {
        statusCode: result.statusCode,
        requestUrl: result.diagnostics?.requestUrl || null,
        requestMethod: result.diagnostics?.requestMethod || null,
        destination: result.diagnostics?.destination || null,
        responseStatus: result.diagnostics?.responseStatus || null,
        timeoutMs: result.diagnostics?.timeoutMs || null
      })
    );

    return {
      providerName: preferredProvider.name,
      mode: preferredProvider.mode,
      status: "sent",
      dispatched: true,
      fallbackUsed: false,
      payload: preferredPayload,
      providerResponse: result.responsePreview,
      providerDiagnostics: result.diagnostics || null,
      diagnostics
    };
  } catch (error) {
    diagnostics.push(
      createDiagnosticsEntry(preferredProvider.name, "error", {
        reason: error.message,
        errorCode: error.code || null,
        requestUrl: error.diagnostics?.requestUrl || null,
        requestMethod: error.diagnostics?.requestMethod || null,
        destination: error.diagnostics?.destination || null,
        responseStatus: error.diagnostics?.responseStatus || null,
        timeoutMs: error.diagnostics?.timeoutMs || null
      })
    );

    if (fallbackProvider) {
      return createMockFallbackResult(fallbackProvider, payload, diagnostics, "whatsapp-provider-error", preferredPayload);
    }

    return {
      providerName: preferredProvider.name,
      mode: preferredProvider.mode,
      status: "error",
      dispatched: false,
      fallbackUsed: false,
      payload: preferredPayload,
      errorMessage: error.message,
      errorCode: error.code || null,
      providerDiagnostics: error.diagnostics || null,
      diagnostics
    };
  }
}
