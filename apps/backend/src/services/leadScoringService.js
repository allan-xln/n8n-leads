import { getCityPriority } from "./geographicStrategyService.js";
import { normalizeText, normalizedIncludes } from "../utils/text.js";

const offerBySegment = {
  clinicas: "Automacao de atendimento e confirmacao via WhatsApp",
  "escritorios contabeis": "Fluxos de coleta documental e integracoes com ERP",
  "suporte de ti": "Triagem automatizada e integracao com service desk",
  integracoes: "Projeto de integracao entre sistemas e APIs",
  bots: "Reestruturacao e manutencao de bots comerciais",
  "fluxos operacionais": "Mapeamento e automacao de processos operacionais",
  varejo: "Bot comercial com CRM e operacao de pedidos",
  industria: "Automacao operacional e dashboards de producao",
  logistica: "Alertas operacionais e automacao de roteiros",
  "escritorios juridicos": "Intake automatizado e workflow documental"
};

const outcomeOfferRules = [
  {
    match: "bot",
    offer: "Bot comercial com qualificacao e distribuicao automatizada"
  },
  {
    match: "integr",
    offer: "Projeto de integracao entre sistemas, CRM e APIs"
  },
  {
    match: "automat",
    offer: "Automacao operacional com n8n, APIs e fluxos de atendimento"
  },
  {
    match: "triag",
    offer: "Fluxo de triagem automatizada e suporte operacional"
  }
];

function getPriority(score) {
  if (score >= 85) {
    return "high";
  }

  if (score >= 65) {
    return "medium";
  }

  return "low";
}

function getLeadFit(lead, config) {
  const normalizedSegment = normalizeText(lead.segment);
  const nicheEntries = config.niches.map((niche) => normalizeText(niche));
  const exactNicheMatch = nicheEntries.some((niche) => normalizedSegment === niche);
  const partialNicheMatch = nicheEntries.some((niche) => normalizedIncludes(normalizedSegment, niche));
  const cityPriority = getCityPriority(lead.city, config);
  const cityMatch = cityPriority === "priority" || cityPriority === "secondary" || cityPriority === "nationwide";

  return {
    normalizedSegment,
    exactNicheMatch,
    partialNicheMatch,
    cityMatch,
    cityPriority
  };
}

function determineSuggestedOffer(lead, normalizedSegment) {
  const desiredOutcomes = lead.desiredOutcomes.map((item) => normalizeText(item));

  for (const rule of outcomeOfferRules) {
    if (desiredOutcomes.some((item) => item.includes(rule.match))) {
      return rule.offer;
    }
  }

  return offerBySegment[normalizedSegment] || "Diagnostico de automacao e integracoes";
}

export function qualifyLead(lead, config) {
  let score = 28;
  const positiveSignals = [];
  const negativeSignals = [];
  const scoreBreakdown = [];
  const desiredOutcomes = lead.desiredOutcomes.map((item) => normalizeText(item));
  const painPoints = lead.painPoints.map((item) => normalizeText(item));
  const { normalizedSegment, exactNicheMatch, partialNicheMatch, cityMatch, cityPriority } = getLeadFit(lead, config);
  const buyerIntentScore = Number(lead.metadata?.buyerIntentScore || 0);
  const competitiveRiskScore = Number(lead.metadata?.competitiveRiskScore || 0);
  const competitorHits = Number(lead.metadata?.competitorHits || 0);
  const buyerHits = Number(lead.metadata?.buyerHits || 0);
  const ambiguityPenalty = Number(lead.metadata?.ambiguityPenalty || 0);
  const suspiciousCompetitor = Boolean(lead.metadata?.suspiciousCompetitor);
  const exactCompetitorExclusion = Boolean(lead.metadata?.exactCompetitorExclusion);

  function addScore(label, points, signal, type = "positive") {
    score += points;
    scoreBreakdown.push({ label, points });

    if (!signal) {
      return;
    }

    if (type === "positive") {
      positiveSignals.push(signal);
      return;
    }

    negativeSignals.push(signal);
  }

  if (exactNicheMatch) {
    addScore("niche-exact-match", 24, "alinhado de forma direta ao nicho prioritario");
  } else if (partialNicheMatch) {
    addScore("niche-partial-match", 14, "alinhado parcialmente ao nicho prioritario");
  } else {
    addScore("niche-miss", -8, "segmento fora do foco principal atual", "negative");
  }

  if (cityPriority === "priority") {
    addScore("city-priority-match", 14, "na cidade prioritaria");
  } else if (cityPriority === "secondary") {
    addScore("city-secondary-match", 7, "na area secundaria de atuacao");
  } else if (cityPriority === "nationwide") {
    addScore("city-nationwide", 1, "fora do foco principal, mas aceito em cobertura nacional");
  } else {
    addScore("city-outside-priority", -8, "fora da regiao prioritaria", "negative");
  }

  if (painPoints.length >= 3) {
    addScore("pain-points-strong", 14, "multiplas dores operacionais claras");
  } else if (painPoints.length >= 2) {
    addScore("pain-points-medium", 10, "dores operacionais relevantes");
  } else if (painPoints.length === 1) {
    addScore("pain-points-light", 4, "dor operacional identificada");
  } else {
    addScore("pain-points-missing", -10, "pouca visibilidade de dor concreta", "negative");
  }

  if (desiredOutcomes.some((item) => item.includes("integr"))) {
    addScore("integration-demand", 8, "demanda por integracoes");
  }

  if (desiredOutcomes.some((item) => item.includes("automat"))) {
    addScore("automation-demand", 8, "busca explicita por automacao");
  }

  if (desiredOutcomes.some((item) => item.includes("bot") || item.includes("whatsapp"))) {
    addScore("conversational-demand", 7, "abertura para bot ou canal conversacional");
  }

  if (lead.urgency === "high") {
    addScore("urgency-high", 12, "janela de decisao curta");
  } else if (lead.urgency === "medium") {
    addScore("urgency-medium", 6, "momento comercial oportuno");
  } else {
    addScore("urgency-low", -4, "urgencia baixa", "negative");
  }

  if (lead.budgetBand === "high") {
    addScore("budget-high", 14, "faixa de investimento favoravel");
  } else if (lead.budgetBand === "mid") {
    addScore("budget-mid", 8, "orcamento potencialmente viavel");
  } else {
    addScore("budget-low", -8, "orcamento mais sensivel", "negative");
  }

  if (lead.digitalMaturity === "high") {
    addScore("maturity-high", 8, "maturidade digital alta");
  } else if (lead.digitalMaturity === "medium") {
    addScore("maturity-medium", 4, "maturidade digital suficiente");
  } else {
    addScore("maturity-low", -6, "maturidade digital baixa", "negative");
  }

  if (lead.companySize === "large") {
    addScore("company-size-large", 8, "operacao com maior potencial de ticket");
  } else if (lead.companySize === "medium") {
    addScore("company-size-medium", 5, "operacao com boa capacidade de contratacao");
  } else {
    addScore("company-size-small", 2, "empresa de menor porte, mas viavel");
  }

  if (lead.website) {
    addScore("website-present", 4, "presenca digital identificada");
  } else {
    addScore("website-missing", -3, "presenca digital pouco clara", "negative");
  }

  if (lead.budgetBand === "low" && lead.digitalMaturity === "low") {
    addScore("budget-and-maturity-risk", -6, "baixo budget combinado com maturidade digital baixa", "negative");
  }

  if (lead.urgency === "high" && (lead.budgetBand === "high" || lead.budgetBand === "mid")) {
    addScore("buying-window", 6, "janela favoravel para proposta comercial");
  }

  if (painPoints.some((item) => item.includes("manual") || item.includes("planilha") || item.includes("retrabalho"))) {
    addScore("manual-operations", 6, "operacao ainda muito manual");
  }

  if (buyerIntentScore >= 24) {
    addScore("buyer-intent-strong", 12, "perfil comprador com operacao e sinais de dor");
  } else if (buyerIntentScore >= 12) {
    addScore("buyer-intent-medium", 6, "perfil comprador potencial identificado");
  }

  if (buyerHits >= 2) {
    addScore("buyer-profile-operational", 8, "segmento operacional com potencial de processos repetitivos");
  }

  if (exactCompetitorExclusion) {
    addScore("competitor-exact-exclusion", -70, "forte indicio de concorrente direto", "negative");
  } else if (competitiveRiskScore >= 36) {
    addScore("competitor-high-risk", -30, "empresa muito proxima da oferta vendida", "negative");
  } else if (competitorHits > 0 || suspiciousCompetitor) {
    addScore("competitor-ambiguity", -14, "sinais de concorrencia ou ambiguidade de fit", "negative");
  }

  if (ambiguityPenalty > 0) {
    addScore("buyer-ambiguity-penalty", -8, "poucos sinais claros de comprador", "negative");
  }

  const cappedScore = Math.max(0, Math.min(score, 100));
  const priority = getPriority(cappedScore);
  const suggestedOffer = determineSuggestedOffer(lead, normalizedSegment);
  const combinedSignals = [
    ...positiveSignals,
    ...negativeSignals.map((signal) => `risco: ${signal}`)
  ];
  const positiveSummary = positiveSignals.slice(0, 3).join(", ") || "aderencia comercial razoavel";
  const negativeSummary = negativeSignals[0] ? ` Ponto de atencao: ${negativeSignals[0]}.` : "";
  const painSummary = lead.painPoints.slice(0, 2).join(" e ") || "necessidades operacionais ainda pouco detalhadas";
  const justification = `${lead.companyName} apresenta ${painSummary}. O lead foi classificado como ${priority} por combinar ${positiveSummary}.${negativeSummary}`;

  return {
    ...lead,
    score: cappedScore,
    signals: combinedSignals,
    positiveSignals,
    negativeSignals,
    scoreBreakdown,
    cityPriority,
    suggestedOffer,
    priority,
    justification
  };
}
