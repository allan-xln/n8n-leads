import { getLeadProviderPlan } from "../providers/leadProviderFactory.js";
import { executeLeadProvider } from "../providers/leadProviderRuntime.js";
import { qualifyLead } from "./leadScoringService.js";
import { getLeadHistory } from "./leadStore.js";
import { normalizeText } from "../utils/text.js";
import { isValidWhatsAppPhone, normalizeWhatsAppPhone } from "../utils/phone.js";

function average(values) {
  if (!values.length) {
    return 0;
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  return Number((sum / values.length).toFixed(1));
}

function uniqueById(leads) {
  const seen = new Set();
  return leads.filter((lead) => {
    const fingerprint = createLeadFingerprint(lead);
    const keys = [
      lead.id ? `id:${lead.id}` : "",
      lead.contactPhone ? `phone:${normalizeWhatsAppPhone(lead.contactPhone)}` : "",
      fingerprint ? `fingerprint:${fingerprint}` : ""
    ].filter(Boolean);

    if (!keys.length || keys.some((key) => seen.has(key))) {
      return false;
    }

    keys.forEach((key) => seen.add(key));
    return true;
  });
}

function createLeadFingerprint(lead) {
  return normalizeText([lead.companyName || "", lead.city || "", lead.segment || ""].join("|"));
}

function hasValidWhatsApp(lead) {
  return isValidWhatsAppPhone(lead.contactPhone || lead.metadata?.contactPhone || "");
}

function isNewLead(lead, historyKeys) {
  const fingerprint = createLeadFingerprint(lead);
  const keys = [
    lead.id ? `id:${lead.id}` : "",
    lead.contactPhone ? `phone:${normalizeWhatsAppPhone(lead.contactPhone)}` : "",
    fingerprint ? `fingerprint:${fingerprint}` : ""
  ].filter(Boolean);

  if (!keys.length) {
    return false;
  }

  return keys.every((key) => !historyKeys.has(key));
}

function groupBySegment(leads) {
  const groups = new Map();

  for (const lead of leads) {
    const segment = lead.segment || "geral";

    if (!groups.has(segment)) {
      groups.set(segment, []);
    }

    groups.get(segment).push(lead);
  }

  return groups;
}

function selectDiversifiedLeads(leads, limit) {
  const sortedLeads = [...leads].sort((left, right) => right.score - left.score);
  const grouped = groupBySegment(sortedLeads);
  const segmentOrder = [...grouped.entries()]
    .sort((left, right) => right[1][0].score - left[1][0].score)
    .map(([segment]) => segment);
  const selected = [];

  while (selected.length < limit) {
    let addedInRound = false;

    for (const segment of segmentOrder) {
      const segmentLeads = grouped.get(segment) || [];

      if (!segmentLeads.length) {
        continue;
      }

      selected.push(segmentLeads.shift());
      addedInRound = true;

      if (selected.length >= limit) {
        break;
      }
    }

    if (!addedInRound) {
      break;
    }
  }

  return selected;
}

export async function runLeadQualification(config, options = {}) {
  const { primaryProviders, fallbackProvider } = getLeadProviderPlan();
  const leadHistory = await getLeadHistory();
  const historyKeys = new Set();

  for (const lead of leadHistory.leads) {
    if (lead.id) {
      historyKeys.add(`id:${lead.id}`);
    }

    if (lead.contactPhone) {
      historyKeys.add(`phone:${lead.contactPhone}`);
    }

    if (lead.fingerprint) {
      historyKeys.add(`fingerprint:${lead.fingerprint}`);
    }
  }

  if (!primaryProviders.length && !fallbackProvider) {
    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalQualified: 0,
        averageScore: 0,
        highPriorityCount: 0
      },
      digest: {
        headline: "Nenhum provider de leads esta configurado.",
        recommendations: [
          "Ative o provider mock para operacao local.",
          "Configure o provider externo com URL e token validos para producao.",
          "Revise as variaveis de ambiente antes da proxima execucao."
        ],
        topSegments: []
      },
      providerDiagnostics: [
        {
          providerName: "leadProviderPlan",
          kind: "system",
          status: "error",
          leadCount: 0,
          errorMessage: "No lead providers configured.",
          usedAsFallback: false,
          latencyMs: 0,
          skippedReason: null
        }
      ],
      leads: []
    };
  }

  const primaryResults = await Promise.all(primaryProviders.map((provider) => executeLeadProvider(provider, config, options)));
  const successfulPrimaryLeadCount = primaryResults.reduce((total, result) => total + result.leadCount, 0);
  const shouldRunFallback = Boolean(fallbackProvider) && successfulPrimaryLeadCount === 0;
  const fallbackResults = shouldRunFallback
    ? [await executeLeadProvider(fallbackProvider, config, { ...options, fallbackMode: true })]
    : [];
  const providerResults = [...primaryResults, ...fallbackResults];

  const combinedLeads = uniqueById(providerResults.flatMap((result) => result.leads))
    .filter(hasValidWhatsApp)
    .filter((lead) => isNewLead(lead, historyKeys));
  const scoredLeads = combinedLeads
    .map((lead) => qualifyLead(lead, config))
    .sort((left, right) => right.score - left.score);
  const qualified = selectDiversifiedLeads(scoredLeads, options.limit || config.leadLimit);

  const highPriorityLeads = qualified.filter((lead) => lead.priority === "high");
  const topSegments = [...new Set(qualified.map((lead) => lead.segment))].slice(0, 3);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalQualified: qualified.length,
      averageScore: average(qualified.map((lead) => lead.score)),
      highPriorityCount: highPriorityLeads.length
    },
    digest: {
      headline: `${qualified.length} leads qualificados para ${config.destinationWhatsApp || "destino nao configurado"}.`,
      recommendations: [
        "Priorizar abordagem consultiva nos leads high priority nas primeiras horas do dia.",
        "Usar a oferta sugerida como gancho inicial no contato comercial.",
        "Separar os leads com score abaixo de 65 para nutricao posterior."
      ],
      topSegments
    },
    providerDiagnostics: providerResults.map((result) => ({
      providerName: result.providerName,
      kind: result.kind,
      status: result.status,
      leadCount: result.leadCount,
      errorMessage: result.errorMessage || null,
      errorCode: result.errorCode || null,
      usedAsFallback: result.usedAsFallback,
      latencyMs: result.latencyMs,
      skippedReason: result.skippedReason || null,
      requestUrl: result.providerMeta?.requestUrl || null,
      requestMethod: result.providerMeta?.requestMethod || null,
      responseStatus: result.providerMeta?.responseStatus || null,
      responsePath: result.providerMeta?.responsePath || null,
      timeoutMs: result.providerMeta?.timeoutMs || null,
      primaryFocusLabel: result.providerMeta?.primaryFocusLabel || null,
      nationwide: result.providerMeta?.nationwide ?? null,
      priorityCities: result.providerMeta?.priorityCities || [],
      secondaryCities: result.providerMeta?.secondaryCities || [],
      responseContentType: result.providerMeta?.responseContentType || null,
      queryCountPlanned: result.providerMeta?.queryCountPlanned || null,
      queryCountExecuted: result.providerMeta?.queryCountExecuted || null,
      discardedCompetitors: result.providerMeta?.discardedCompetitors || 0,
      usageFilePath: result.providerMeta?.usageFilePath || null,
      usageSnapshot: result.providerMeta?.usageSnapshot || null,
      quotaBlocked: result.providerMeta?.quotaBlocked || false,
      quotaReason: result.providerMeta?.quotaReason || null
    })),
    leadFilters: {
      whatsappOnly: true,
      historyDeduplication: true
    },
    leads: qualified
  };
}
