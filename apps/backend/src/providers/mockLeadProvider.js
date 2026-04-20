import path from "node:path";
import { env } from "../config/env.js";
import { readJsonFile } from "../utils/fileStore.js";
import { buildGeographicStrategy, getCityPriority } from "../services/geographicStrategyService.js";
import { normalizeText, normalizedIncludes } from "../utils/text.js";

const mockLeadsPath = path.join(env.dataDir, "mock-leads.json");

function calculateRelevance(lead, config) {
  const segment = normalizeText(lead.segment);
  const pains = (lead.painPoints || []).map(normalizeText);
  const outcomes = (lead.desiredOutcomes || []).map(normalizeText);
  const cityPriority = getCityPriority(lead.city, config);

  let relevance = 0;

  for (const niche of config.niches) {
    const normalizedNiche = normalizeText(niche);
    if (segment === normalizedNiche) {
      relevance += 35;
    } else if (normalizedIncludes(segment, normalizedNiche)) {
      relevance += 22;
    }
  }

  if (cityPriority === "priority") {
    relevance += 18;
  } else if (cityPriority === "secondary") {
    relevance += 10;
  } else if (cityPriority === "outside") {
    relevance -= 10;
  }

  relevance += Math.min(pains.length, 3) * 6;
  relevance += Math.min(outcomes.length, 3) * 5;

  if (lead.urgency === "high") {
    relevance += 10;
  } else if (lead.urgency === "medium") {
    relevance += 5;
  }

  if (lead.budgetBand === "high") {
    relevance += 8;
  } else if (lead.budgetBand === "mid") {
    relevance += 4;
  }

  return relevance;
}

export const mockLeadProvider = {
  name: "mockLeadProvider",
  kind: "mock",
  isEnabled() {
    return env.mockProviderEnabled;
  },
  async fetchLeads(config, options = {}) {
    const leads = await readJsonFile(mockLeadsPath, []);
    const niches = config.niches.map(normalizeText);
    const strategy = buildGeographicStrategy(config);

    const scored = leads
      .map((lead) => {
        const segment = normalizeText(lead.segment);
        const nicheMatch = niches.some((niche) => segment.includes(niche) || niche.includes(segment));
        const cityPriority = getCityPriority(lead.city, config);
        const cityMatch = cityPriority === "priority" || cityPriority === "secondary" || strategy.nationwide;
        const relevance = calculateRelevance(lead, config);

        return {
          lead,
          nicheMatch,
          cityMatch,
          cityPriority,
          relevance
        };
      })
      .sort((left, right) => right.relevance - left.relevance);

    const limit = options.limit || config.leadLimit;

    const strictMatches = scored
      .filter((item) => item.nicheMatch || item.cityMatch || item.cityPriority === "nationwide")
      .map((item) => item.lead);

    if (strictMatches.length > 0) {
      return strictMatches.slice(0, limit);
    }

    if (options.fallbackMode) {
      return scored.map((item) => item.lead).slice(0, limit);
    }

    return [];
  }
};
