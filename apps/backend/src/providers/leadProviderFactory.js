import { env } from "../config/env.js";
import { externalLeadProvider } from "./externalLeadProvider.js";
import { googlePlacesLeadProvider } from "./googlePlacesLeadProvider.js";
import { mockLeadProvider } from "./mockLeadProvider.js";

function shouldRunMockAsPrimary(primaryProviders) {
  if (!env.mockProviderEnabled) {
    return false;
  }

  if (!primaryProviders.length) {
    return true;
  }

  return env.mockProviderMode === "always";
}

export function getLeadProviderPlan() {
  const primaryProviders = [];

  if (env.externalProviderEnabled) {
    if (env.leadExternalApiProviderKind === "google_places") {
      primaryProviders.push(googlePlacesLeadProvider);
    } else {
      primaryProviders.push(externalLeadProvider);
    }
  }

  if (shouldRunMockAsPrimary(primaryProviders)) {
    primaryProviders.push(mockLeadProvider);
  }

  const shouldUseMockFallback =
    env.mockProviderEnabled &&
    env.mockProviderMode !== "always" &&
    primaryProviders.some((provider) => provider.name !== mockLeadProvider.name);

  return {
    primaryProviders,
    fallbackProvider: shouldUseMockFallback ? mockLeadProvider : null
  };
}

export function getLeadProviders() {
  const { primaryProviders, fallbackProvider } = getLeadProviderPlan();

  if (fallbackProvider) {
    return [...primaryProviders, fallbackProvider];
  }

  return primaryProviders;
}
