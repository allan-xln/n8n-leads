import axios from "axios";
import { env } from "../config/env.js";
import { buildGeographicStrategy } from "../services/geographicStrategyService.js";
import { getPlacesUsageFilePath, getPlacesUsageSnapshot, reserveGooglePlacesCall } from "../services/placesUsageStore.js";
import { normalizeText, normalizedIncludes, uniqueCompactStrings } from "../utils/text.js";

class GooglePlacesLeadProviderError extends Error {
  constructor(message, providerMeta = {}, options = {}) {
    super(message);
    this.name = "GooglePlacesLeadProviderError";
    this.providerMeta = providerMeta;
    this.code = options.code || null;
  }
}

const buyerIntentSegments = [
  {
    label: "transportadora",
    searchTerms: ["transportadora", "logistica", "transportes rodoviarios"],
    desiredOutcomes: ["automacao operacional", "triagem de atendimento", "integracoes entre sistemas"],
    painPoints: ["processos manuais na operacao", "repasse manual entre times"],
    companySize: "medium",
    digitalMaturity: "medium",
    budgetBand: "mid",
    urgency: "medium"
  },
  {
    label: "distribuidora",
    searchTerms: ["distribuidora", "atacadista", "comercio atacadista"],
    desiredOutcomes: ["integracoes comerciais", "automacao operacional", "organizacao de fluxos"],
    painPoints: ["operacao com retrabalho", "pedidos e atendimento manuais"],
    companySize: "medium",
    digitalMaturity: "medium",
    budgetBand: "mid",
    urgency: "medium"
  },
  {
    label: "industria",
    searchTerms: ["industria", "metalurgica", "fabrica"],
    desiredOutcomes: ["integracoes entre sistemas", "fluxos operacionais", "automacao de processos"],
    painPoints: ["controles manuais entre setores", "informacoes descentralizadas"],
    companySize: "medium",
    digitalMaturity: "medium",
    budgetBand: "high",
    urgency: "medium"
  },
  {
    label: "clinica medica",
    searchTerms: ["clinica medica", "clinica", "laboratorio"],
    desiredOutcomes: ["automacao de atendimento", "triagem", "bot de WhatsApp"],
    painPoints: ["atendimento repetitivo", "agendamento e confirmacao manuais"],
    companySize: "medium",
    digitalMaturity: "medium",
    budgetBand: "mid",
    urgency: "high"
  },
  {
    label: "clinica odontologica",
    searchTerms: ["clinica odontologica", "odontologia", "dentista"],
    desiredOutcomes: ["automacao de atendimento", "confirmacao automatizada", "bot de WhatsApp"],
    painPoints: ["alto volume de contato repetitivo", "agenda manual"],
    companySize: "small",
    digitalMaturity: "medium",
    budgetBand: "mid",
    urgency: "high"
  },
  {
    label: "escritorio contabil",
    searchTerms: ["escritorio contabil", "contabilidade"],
    desiredOutcomes: ["coleta automatizada", "integracoes", "organizacao operacional"],
    painPoints: ["muita troca manual de informacoes", "retrabalho documental"],
    companySize: "small",
    digitalMaturity: "medium",
    budgetBand: "mid",
    urgency: "medium"
  },
  {
    label: "imobiliaria",
    searchTerms: ["imobiliaria"],
    desiredOutcomes: ["triagem de atendimento", "bot comercial", "integracoes com CRM"],
    painPoints: ["alto volume de atendimento repetitivo", "distribuicao manual de leads"],
    companySize: "medium",
    digitalMaturity: "medium",
    budgetBand: "mid",
    urgency: "medium"
  },
  {
    label: "autopecas",
    searchTerms: ["autopecas"],
    desiredOutcomes: ["organizacao operacional", "automacao comercial", "integracoes"],
    painPoints: ["pedidos por varios canais", "processos manuais de atendimento"],
    companySize: "medium",
    digitalMaturity: "medium",
    budgetBand: "mid",
    urgency: "medium"
  },
  {
    label: "material de construcao",
    searchTerms: ["material de construcao", "loja de construcao"],
    desiredOutcomes: ["automacao comercial", "triagem de atendimento", "organizacao operacional"],
    painPoints: ["orcamentos manuais", "atendimento repetitivo em multiplos canais"],
    companySize: "medium",
    digitalMaturity: "medium",
    budgetBand: "mid",
    urgency: "medium"
  },
  {
    label: "escola particular",
    searchTerms: ["escola particular", "colegio particular"],
    desiredOutcomes: ["automacao de atendimento", "triagem", "organizacao de processos"],
    painPoints: ["alto volume de atendimento", "informacoes repetitivas por WhatsApp"],
    companySize: "medium",
    digitalMaturity: "medium",
    budgetBand: "mid",
    urgency: "medium"
  },
  {
    label: "clinica de estetica",
    searchTerms: ["clinica de estetica", "estetica", "harmonizacao facial"],
    desiredOutcomes: ["automacao de atendimento", "confirmacao automatizada", "bot de WhatsApp"],
    painPoints: ["alto volume de agendamentos", "triagem manual de procedimentos"],
    companySize: "small",
    digitalMaturity: "medium",
    budgetBand: "mid",
    urgency: "high"
  },
  {
    label: "pet shop",
    searchTerms: ["pet shop", "clinica veterinaria", "veterinario"],
    desiredOutcomes: ["automacao de atendimento", "confirmacao automatizada", "organizacao operacional"],
    painPoints: ["agendamentos manuais", "alto volume de contatos repetitivos"],
    companySize: "small",
    digitalMaturity: "medium",
    budgetBand: "mid",
    urgency: "medium"
  },
  {
    label: "oficina mecanica",
    searchTerms: ["oficina mecanica", "auto center", "mecanica automotiva"],
    desiredOutcomes: ["triagem de atendimento", "automacao comercial", "organizacao operacional"],
    painPoints: ["orcamentos manuais", "atendimento repetitivo em varios canais"],
    companySize: "medium",
    digitalMaturity: "medium",
    budgetBand: "mid",
    urgency: "medium"
  },
  {
    label: "academia",
    searchTerms: ["academia", "centro de treinamento", "pilates"],
    desiredOutcomes: ["automacao de atendimento", "bot comercial", "organizacao de processos"],
    painPoints: ["alto volume de leads e duvidas repetitivas", "follow-up manual"],
    companySize: "small",
    digitalMaturity: "medium",
    budgetBand: "mid",
    urgency: "medium"
  }
];

const hardExcludeTerms = [
  "software house",
  "desenvolvimento de software",
  "fabrica de software",
  "empresa de ti",
  "suporte de ti",
  "assistencia tecnica",
  "assistencia tecnica de informatica",
  "consultoria de ti",
  "automacao industrial",
  "automacao comercial",
  "marketing digital",
  "agencia de marketing",
  "agencia de trafego",
  "criacao de sites",
  "desenvolvedor",
  "programador",
  "informatica",
  "manutencao de computadores",
  "bots de whatsapp",
  "integracao de sistemas",
  "consultoria em tecnologia",
  "erp software"
];

const suspiciousCompetitorTerms = [
  "tecnologia",
  "sistemas",
  "software",
  "digital",
  "automacao",
  "integracao",
  "whatsapp",
  "ti",
  "informatica",
  "developer"
];

const operationalBuyerTerms = [
  "transport",
  "distrib",
  "atacad",
  "industr",
  "metal",
  "clin",
  "laborat",
  "contab",
  "imobili",
  "autopec",
  "construc",
  "logist",
  "escola",
  "colegio",
  "estet",
  "pet",
  "veter",
  "oficin",
  "mecanic",
  "academ",
  "pilates"
];

const genericBuyerSegmentDefaults = {
  desiredOutcomes: ["automacao de processos", "triagem de atendimento", "integracoes entre sistemas"],
  painPoints: ["processos manuais", "atendimento repetitivo", "retrabalho operacional"],
  companySize: "medium",
  digitalMaturity: "medium",
  budgetBand: "mid",
  urgency: "medium"
};

function toArrayUnique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function buildLocationQueries(config) {
  const strategy = buildGeographicStrategy(config);
  const locations = [...strategy.priorityCities, ...strategy.secondaryCities];

  if (strategy.nationwide) {
    locations.push("Brasil");
  }

  if (!locations.length) {
    locations.push(...(config.cities || []));
  }

  return toArrayUnique(locations);
}

function matchesConfiguredNiche(segment, niche) {
  const candidates = [segment.label, ...(segment.searchTerms || [])];
  return candidates.some((candidate) => normalizedIncludes(candidate, niche));
}

function createGenericBuyerSegment(niche) {
  return {
    label: niche,
    searchTerms: [niche],
    ...genericBuyerSegmentDefaults
  };
}

function buildConfiguredSegments(config) {
  const configuredNiches = uniqueCompactStrings(config.niches || []);

  if (!configuredNiches.length) {
    return buyerIntentSegments;
  }

  return configuredNiches.map((niche) => {
    const matchedSegment = buyerIntentSegments.find((segment) => matchesConfiguredNiche(segment, niche));
    return matchedSegment || createGenericBuyerSegment(niche);
  });
}

function buildQueryPlan(config) {
  const locations = buildLocationQueries(config);
  const configuredSegments = buildConfiguredSegments(config);
  const plan = [];

  // Interleave niches per city so the capped run stays diversified.
  for (const location of locations) {
    for (const segment of configuredSegments) {
      const term = segment.searchTerms[0];
      plan.push({
        buyerSegment: segment,
        location,
        textQuery: location === "Brasil" ? `${term} no Brasil` : `${term} em ${location}, Brasil`
      });
    }
  }

  return plan.slice(0, Math.max(1, env.googlePlacesMaxCallsPerRun));
}

function buildHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": env.googlePlacesApiKey,
    "X-Goog-FieldMask": env.googlePlacesFieldMask
  };
}

function getAddressComponent(place, type) {
  return (place.addressComponents || []).find((component) => Array.isArray(component.types) && component.types.includes(type));
}

function getNormalizedPlaceText(place) {
  return normalizeText(
    [
      place.displayName?.text,
      place.primaryTypeDisplayName?.text,
      place.primaryType,
      ...(place.types || []),
      place.formattedAddress
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizedPhraseMatch(source, term) {
  const normalizedSource = normalizeText(source);
  const normalizedTerm = normalizeText(term);

  if (!normalizedSource || !normalizedTerm) {
    return false;
  }

  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedTerm)}([^a-z0-9]|$)`);
  return pattern.test(normalizedSource);
}

function countMatches(source, terms) {
  return terms.reduce((total, term) => (normalizedPhraseMatch(source, term) ? total + 1 : total), 0);
}

function classifyPlace(place, query) {
  const normalizedText = getNormalizedPlaceText(place);
  const exactExclusion = hardExcludeTerms.some((term) => normalizedPhraseMatch(normalizedText, term));
  const competitorHits = countMatches(normalizedText, suspiciousCompetitorTerms);
  const buyerHits = countMatches(normalizedText, operationalBuyerTerms) + countMatches(normalizedText, query.buyerSegment.searchTerms);
  const hasWebsite = Boolean(place.websiteUri || place.googleMapsUri);
  const isOperationalCandidate = buyerHits > 0 || ["STORE","OPERATIONAL"].includes(place.businessStatus);

  return {
    exactExclusion,
    competitorHits,
    buyerHits,
    hasWebsite,
    isOperationalCandidate,
    buyerIntentScore: buyerHits * 12 + (hasWebsite ? 6 : 0) + (isOperationalCandidate ? 8 : 0),
    competitiveRiskScore: (exactExclusion ? 100 : 0) + competitorHits * 18
  };
}

function mapPlaceToLead(place, query) {
  const city =
    getAddressComponent(place, "locality")?.longText ||
    getAddressComponent(place, "administrative_area_level_2")?.longText ||
    query.location ||
    "Nao informado";
  const region =
    getAddressComponent(place, "administrative_area_level_1")?.shortText ||
    getAddressComponent(place, "administrative_area_level_1")?.longText ||
    "NA";
  const placeName = place.displayName?.text || "Empresa sem nome";
  const classification = classifyPlace(place, query);
  const ambiguityPenalty = classification.competitorHits > 0 && classification.buyerHits === 0 ? 15 : 0;
  const contactPhone = place.nationalPhoneNumber || place.internationalPhoneNumber || "";

  return {
    id: place.id || place.name || `${placeName}-${city}`,
    companyName: placeName,
    segment: query.buyerSegment.label,
    city,
    region,
    contactName: "Contato nao informado",
    contactPhone,
    website: place.websiteUri || place.googleMapsUri || "",
    painPoints: query.buyerSegment.painPoints,
    desiredOutcomes: query.buyerSegment.desiredOutcomes,
    companySize: query.buyerSegment.companySize,
    digitalMaturity: classification.hasWebsite ? "medium" : query.buyerSegment.digitalMaturity,
    budgetBand: query.buyerSegment.budgetBand,
    urgency: query.buyerSegment.urgency,
    source: "google_places",
    metadata: {
      buyerSegment: query.buyerSegment.label,
      searchQuery: query.textQuery,
      placeTypes: place.types || [],
      placePrimaryType: place.primaryType || null,
      placeFormattedAddress: place.formattedAddress || null,
      businessStatus: place.businessStatus || null,
      buyerIntentScore: classification.buyerIntentScore,
      competitiveRiskScore: classification.competitiveRiskScore,
      competitorHits: classification.competitorHits,
      buyerHits: classification.buyerHits,
      ambiguityPenalty,
      suspiciousCompetitor: classification.competitorHits > 0,
      exactCompetitorExclusion: classification.exactExclusion
    }
  };
}

function shouldDiscardPlace(place, query) {
  const classification = classifyPlace(place, query);
  return classification.exactExclusion || classification.competitiveRiskScore >= 90;
}

function dedupeLeads(leads) {
  const seen = new Set();

  return leads.filter((lead) => {
    if (seen.has(lead.id)) {
      return false;
    }

    seen.add(lead.id);
    return true;
  });
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
      message: `Google Places provider timed out after ${env.googlePlacesTimeoutMs}ms.`,
      code: error.code,
      responseStatus: error.response?.status || null
    };
  }

  const status = error.response?.status;
  const apiMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
  return {
    message: `Google Places provider failed (${status || "network-error"}): ${apiMessage}`,
    code: error.code || null,
    responseStatus: status || null
  };
}

async function executePlacesQuery(query, providerMeta) {
  const reservation = await reserveGooglePlacesCall();
  const usageSnapshot = reservation.state;

  if (reservation.reservationRejected) {
    throw new GooglePlacesLeadProviderError(
      "Google Places quota blocked before request.",
      {
        ...providerMeta,
        quotaBlocked: true,
        quotaReason: reservation.rejectionReason,
        usageFilePath: getPlacesUsageFilePath(),
        usageSnapshot
      },
      {
        code: reservation.rejectionReason
      }
    );
  }

  const response = await axios({
    method: "post",
    url: env.googlePlacesApiUrl,
    headers: buildHeaders(),
    data: {
      textQuery: query.textQuery,
      languageCode: env.googlePlacesLanguageCode,
      regionCode: env.googlePlacesRegionCode,
      pageSize: Math.max(1, Math.min(20, env.googlePlacesMaxResultsPerQuery))
    },
    timeout: env.googlePlacesTimeoutMs
  });

  return {
    places: Array.isArray(response.data?.places) ? response.data.places : [],
    response,
    usageSnapshot
  };
}

export const googlePlacesLeadProvider = {
  name: "googlePlacesLeadProvider",
  kind: "google_places",
  isEnabled() {
    return env.externalProviderEnabled && env.leadExternalApiProviderKind === "google_places";
  },
  async fetchLeads(config) {
    if (!env.googlePlacesApiKey) {
      throw new GooglePlacesLeadProviderError("Google Places provider enabled without API key.", {
        providerName: "googlePlacesLeadProvider",
        requestUrl: env.googlePlacesApiUrl,
        requestMethod: "POST",
        timeoutMs: env.googlePlacesTimeoutMs
      });
    }

    const strategy = buildGeographicStrategy(config);
    const queryPlan = buildQueryPlan(config);
    const providerMeta = {
      providerName: "googlePlacesLeadProvider",
      requestUrl: env.googlePlacesApiUrl,
      requestMethod: "POST",
      responsePath: "places",
      timeoutMs: env.googlePlacesTimeoutMs,
      nationwide: strategy.nationwide,
      priorityCities: strategy.priorityCities,
      secondaryCities: strategy.secondaryCities,
      primaryFocusLabel: strategy.primaryFocusLabel,
      queryCountPlanned: queryPlan.length,
      usageFilePath: getPlacesUsageFilePath()
    };

    const collected = [];
    let lastResponse = null;
    let lastUsageSnapshot = null;
    let queryCountExecuted = 0;
    let discardedCompetitors = 0;

    for (const query of queryPlan) {
      try {
        const result = await executePlacesQuery(query, providerMeta);
        lastResponse = result.response;
        lastUsageSnapshot = result.usageSnapshot;
        queryCountExecuted += 1;

        for (const place of result.places) {
          if (place.businessStatus === "CLOSED_PERMANENTLY") {
            continue;
          }

          if (shouldDiscardPlace(place, query)) {
            discardedCompetitors += 1;
            continue;
          }

          collected.push(mapPlaceToLead(place, query));
        }

        if (collected.length >= config.leadLimit * 8) {
          break;
        }
      } catch (error) {
        if (error instanceof GooglePlacesLeadProviderError) {
          throw error;
        }

        const formattedError = formatAxiosError(error);

        throw new GooglePlacesLeadProviderError(
          formattedError.message,
          {
            ...providerMeta,
            responseStatus: formattedError.responseStatus,
            usageSnapshot: lastUsageSnapshot,
            queryCountExecuted,
            discardedCompetitors
          },
          {
            code: formattedError.code
          }
        );
      }
    }

    const leads = dedupeLeads(collected).slice(0, config.leadLimit * 8);

    return {
      leads,
      __providerMeta: {
        ...providerMeta,
        responseStatus: lastResponse?.status || null,
        responseContentType: lastResponse?.headers?.["content-type"] || null,
        queryCountExecuted,
        discardedCompetitors,
        usageSnapshot: lastUsageSnapshot || (await getPlacesUsageSnapshot())
      }
    };
  }
};
