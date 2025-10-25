/**
 * Feature flags for experimental and development features
 * These features are hidden in production unless explicitly enabled
 */

export const FeatureFlags = {
  EXPERIMENTS: process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTS === "true",
} as const;

export function isExperimentalEnabled(): boolean {
  return FeatureFlags.EXPERIMENTS;
}

export function requireExperiments(): void {
  if (!isExperimentalEnabled()) {
    throw new Error("Experimental features are not enabled");
  }
}
