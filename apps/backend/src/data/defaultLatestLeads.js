export const defaultLatestLeads = {
  generatedAt: null,
  reason: "not-run-yet",
  summary: {
    totalQualified: 0,
    averageScore: 0,
    highPriorityCount: 0
  },
  digest: {
    headline: "Nenhum lote executado ainda.",
    recommendations: [],
    topSegments: []
  },
  providerDiagnostics: [],
  whatsappDispatch: {
    providerName: "mockWhatsAppProvider",
    mode: "mock",
    status: "not-run-yet",
    dispatched: false,
    fallbackUsed: false,
    payload: {
      destination: "",
      messagePreview: "",
      status: "not-run-yet"
    },
    diagnostics: []
  },
  leads: []
};
