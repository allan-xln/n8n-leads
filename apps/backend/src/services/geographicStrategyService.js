import { normalizeText, uniqueCompactStrings } from "../utils/text.js";

function uniqueNormalized(values = []) {
  const uniqueValues = uniqueCompactStrings(values);
  const seen = new Set();

  return uniqueValues.filter((value) => {
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function normalizeCityBuckets(config) {
  const legacyCities = uniqueNormalized(config.cities || []);
  const priorityCities = uniqueNormalized(config.priorityCities || []);
  const secondaryCities = uniqueNormalized(config.secondaryCities || []);

  if (priorityCities.length || secondaryCities.length) {
    return {
      priorityCities,
      secondaryCities,
      combinedCities: uniqueNormalized([...priorityCities, ...secondaryCities])
    };
  }

  return {
    priorityCities: legacyCities,
    secondaryCities: [],
    combinedCities: legacyCities
  };
}

export function buildGeographicStrategy(config) {
  const nationwide = Boolean(config.nationwide);
  const { priorityCities, secondaryCities, combinedCities } = normalizeCityBuckets(config);

  return {
    nationwide,
    priorityCities,
    secondaryCities,
    combinedCities,
    primaryFocusLabel: priorityCities.length ? priorityCities.join(", ") : nationwide ? "Brasil" : "Nao definido"
  };
}

export function normalizeConfigGeography(config) {
  const strategy = buildGeographicStrategy(config);

  return {
    ...config,
    nationwide: strategy.nationwide,
    priorityCities: strategy.priorityCities,
    secondaryCities: strategy.secondaryCities,
    cities: strategy.combinedCities
  };
}

export function getCityPriority(city, config) {
  const normalizedCity = normalizeText(city);
  const strategy = buildGeographicStrategy(config);

  if (strategy.priorityCities.some((entry) => normalizeText(entry) === normalizedCity)) {
    return "priority";
  }

  if (strategy.secondaryCities.some((entry) => normalizeText(entry) === normalizedCity)) {
    return "secondary";
  }

  if (strategy.nationwide) {
    return "nationwide";
  }

  return "outside";
}
