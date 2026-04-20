export const mockWhatsAppProvider = {
  name: "mockWhatsAppProvider",
  mode: "mock",
  isReady() {
    return true;
  },
  createPayload({ destinationWhatsApp, digest, summary }) {
    const normalizedDestination = String(destinationWhatsApp || "").replace(/\D/g, "");

    return {
      destination: normalizedDestination,
      originalDestination: destinationWhatsApp || "",
      messagePreview: `Lead digest: ${summary.totalQualified} leads qualificados, ${summary.highPriorityCount} prioritarios. ${digest.headline}`,
      status: normalizedDestination ? "mock-preview-ready" : "missing-destination"
    };
  }
};
