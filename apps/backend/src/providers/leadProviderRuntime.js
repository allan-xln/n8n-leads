import { normalizeText, uniqueCompactStrings } from "../utils/text.js";

function toStringArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return uniqueCompactStrings(value);
  }

  return uniqueCompactStrings([value]);
}

function createFallbackId(lead, providerName) {
  const companyToken = normalizeText(lead.companyName || lead.name || "empresa-sem-nome").replace(/\s+/g, "-");
  const cityToken = normalizeText(lead.city || "cidade-indefinida").replace(/\s+/g, "-");

  return `${providerName}-${companyToken}-${cityToken}`;
}

function normalizeLead(rawLead, providerName) {
  const lead = typeof rawLead === "object" && rawLead ? rawLead : {};
  const companyName = lead.companyName || lead.name || lead.company || "Empresa sem nome";

  return {
    id: lead.id || createFallbackId(lead, providerName),
    companyName,
    segment: lead.segment || lead.niche || lead.category || "geral",
    city: lead.city || lead.locationCity || "Nao informado",
    region: lead.region || lead.state || "NA",
    contactName: lead.contactName || lead.contact || "Contato nao informado",
    contactPhone: lead.contactPhone || lead.phone || "",
    website: lead.website || lead.site || "",
    painPoints: toStringArray(lead.painPoints || lead.pains),
    desiredOutcomes: toStringArray(lead.desiredOutcomes || lead.objectives),
    companySize: lead.companySize || "small",
    digitalMaturity: lead.digitalMaturity || "medium",
    budgetBand: lead.budgetBand || "mid",
    urgency: lead.urgency || "medium",
    source: lead.source || providerName,
    metadata: lead.metadata && typeof lead.metadata === "object" ? lead.metadata : undefined
  };
}

function extractLeadList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.leads)) {
    return payload.leads;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function extractProviderMeta(payload) {
  if (payload && typeof payload === "object" && payload.__providerMeta && typeof payload.__providerMeta === "object") {
    return payload.__providerMeta;
  }

  return {};
}

export async function executeLeadProvider(provider, config, options = {}) {
  const startedAt = Date.now();

  if (typeof provider.isEnabled === "function" && !provider.isEnabled()) {
    return {
      providerName: provider.name,
      kind: provider.kind || "unknown",
      status: "skipped",
      leadCount: 0,
      usedAsFallback: Boolean(options.fallbackMode),
      skippedReason: "provider-disabled",
      latencyMs: Date.now() - startedAt,
      leads: []
    };
  }

  try {
    const payload = await provider.fetchLeads(config, options);
    const rawLeads = extractLeadList(payload);
    const providerMeta = extractProviderMeta(payload);
    const leads = rawLeads.map((lead) => normalizeLead(lead, provider.name));

    return {
      providerName: provider.name,
      kind: provider.kind || "unknown",
      status: "ok",
      leadCount: leads.length,
      usedAsFallback: Boolean(options.fallbackMode),
      skippedReason: null,
      latencyMs: Date.now() - startedAt,
      providerMeta,
      leads: leads.map((lead) => ({
        ...lead,
        providerName: provider.name
      }))
    };
  } catch (error) {
    return {
      providerName: provider.name,
      kind: provider.kind || "unknown",
      status: "error",
      leadCount: 0,
      usedAsFallback: Boolean(options.fallbackMode),
      skippedReason: null,
      latencyMs: Date.now() - startedAt,
      errorMessage: error.message,
      errorCode: error.code || null,
      providerMeta: error.providerMeta || {},
      leads: []
    };
  }
}
