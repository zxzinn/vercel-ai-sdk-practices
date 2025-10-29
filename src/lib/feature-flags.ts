/**
 * Feature flags for experimental and development features
 * These features are hidden in production unless explicitly enabled
 */

export const FeatureFlags = {
  EXPERIMENTS: process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTS === "true",
} as const;

export type FeatureFlagKey = keyof typeof FeatureFlags;

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return FeatureFlags[flag];
}

export function isExperimentalEnabled(): boolean {
  return FeatureFlags.EXPERIMENTS;
}

export function requireExperiments(): void {
  if (!isExperimentalEnabled()) {
    throw new Error("Experimental features are not enabled");
  }
}
