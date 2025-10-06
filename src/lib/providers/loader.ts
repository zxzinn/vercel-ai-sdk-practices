// Import all provider models
import { alibabaModels } from "./alibaba";
import { amazonModels } from "./amazon";
import { anthropicModels } from "./anthropic";
import { cohereModels } from "./cohere";
import { PROVIDER_DEFINITIONS } from "./config";
import { deepseekModels } from "./deepseek";
import { googleModels } from "./google";
import { metaModels } from "./meta";
import { mistralModels } from "./mistral";
import { openaiModels } from "./openai";
import { perplexityModels } from "./perplexity";
import type { Provider } from "./types";
import { xaiModels } from "./xai";

// Model registry - maps provider IDs to their model arrays
const MODEL_REGISTRY = {
  alibaba: alibabaModels,
  amazon: amazonModels,
  anthropic: anthropicModels,
  cohere: cohereModels,
  deepseek: deepseekModels,
  google: googleModels,
  meta: metaModels,
  mistral: mistralModels,
  openai: openaiModels,
  perplexity: perplexityModels,
  xai: xaiModels,
} as const;

/**
 * Dynamically loads all providers with their models
 * Automatically filters out providers with no models
 */
export function loadAllProviders(): Provider[] {
  return PROVIDER_DEFINITIONS.map(({ id, name }) => ({
    id,
    name,
    models: MODEL_REGISTRY[id as keyof typeof MODEL_REGISTRY] || [],
  })).filter((provider) => provider.models.length > 0); // Only include providers with models
}

/**
 * Gets the first available model ID for fallback purposes
 */
export function getDefaultModelId(): string {
  const providers = loadAllProviders();
  const firstProvider = providers.find((p) => p.models.length > 0);
  return firstProvider?.models[0]?.id || "";
}

/**
 * Gets a flat list of all models from all providers
 */
export function getAllModels() {
  const providers = loadAllProviders();
  return providers.flatMap((provider) => provider.models);
}
