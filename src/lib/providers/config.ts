import type { Model } from "./types";

export interface ProviderConfig {
  id: string;
  name: string;
  models: Model[];
}

// Provider definitions with their display names
export const PROVIDER_DEFINITIONS = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "google", name: "Google" },
  { id: "alibaba", name: "Alibaba" },
  { id: "amazon", name: "Amazon" },
  { id: "cohere", name: "Cohere" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "meta", name: "Meta" },
  { id: "mistral", name: "Mistral" },
  { id: "perplexity", name: "Perplexity" },
  { id: "xai", name: "xAI" },
] as const;

export type ProviderId = (typeof PROVIDER_DEFINITIONS)[number]["id"];
