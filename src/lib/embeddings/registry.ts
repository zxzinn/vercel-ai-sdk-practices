export interface EmbeddingModelDefinition {
  id: string;
  name: string;
  provider: string;
  dimensions: number[];
  defaultDim: number;
  maxTokens: number;
  costPer1M?: number;
  description?: string;
}

// ============================================================================
// OpenAI Embeddings
// ============================================================================

export const openaiEmbeddingModels: EmbeddingModelDefinition[] = [
  {
    id: "openai/text-embedding-3-large",
    name: "Text Embedding 3 Large",
    provider: "openai",
    dimensions: [256, 512, 1024, 1536, 3072],
    defaultDim: 3072,
    maxTokens: 8191,
    costPer1M: 0.13,
    description: "Most capable embedding model with configurable dimensions",
  },
  {
    id: "openai/text-embedding-3-small",
    name: "Text Embedding 3 Small",
    provider: "openai",
    dimensions: [512, 1536],
    defaultDim: 1536,
    maxTokens: 8191,
    costPer1M: 0.02,
    description: "Fast and affordable for most use cases",
  },
  {
    id: "openai/text-embedding-ada-002",
    name: "Text Embedding Ada 002",
    provider: "openai",
    dimensions: [1536],
    defaultDim: 1536,
    maxTokens: 8191,
    costPer1M: 0.1,
    description: "Legacy model, use embedding-3-small instead",
  },
];

// ============================================================================
// Cohere Embeddings
// ============================================================================

export const cohereEmbeddingModels: EmbeddingModelDefinition[] = [
  {
    id: "cohere/embed-v4.0",
    name: "Embed V4.0",
    provider: "cohere",
    dimensions: [256, 512, 1024, 1536],
    defaultDim: 1536,
    maxTokens: 128000,
    costPer1M: 0.12,
    description: "Latest multilingual multimodal embedding model",
  },
  {
    id: "cohere/embed-english-v3.0",
    name: "Embed English V3.0",
    provider: "cohere",
    dimensions: [1024],
    defaultDim: 1024,
    maxTokens: 512,
    costPer1M: 0.1,
    description: "Optimized for English text",
  },
  {
    id: "cohere/embed-multilingual-v3.0",
    name: "Embed Multilingual V3.0",
    provider: "cohere",
    dimensions: [1024],
    defaultDim: 1024,
    maxTokens: 512,
    costPer1M: 0.1,
    description: "Supports 100+ languages",
  },
];

// ============================================================================
// Google (Gemini) Embeddings
// ============================================================================

export const googleEmbeddingModels: EmbeddingModelDefinition[] = [
  {
    id: "google/gemini-embedding-001",
    name: "Gemini Embedding 001",
    provider: "google",
    dimensions: [768, 1536, 3072],
    defaultDim: 3072,
    maxTokens: 2048,
    costPer1M: 0.15,
    description: "Latest multilingual embedding with MRL support",
  },
  {
    id: "google/text-embedding-004",
    name: "Text Embedding 004",
    provider: "google",
    dimensions: [768],
    defaultDim: 768,
    maxTokens: 2048,
    description: "Legacy Gecko model, discontinuing Nov 2025",
  },
];

// ============================================================================
// Voyage AI Embeddings
// ============================================================================

export const voyageEmbeddingModels: EmbeddingModelDefinition[] = [
  {
    id: "voyage/voyage-3-large",
    name: "Voyage 3 Large",
    provider: "voyage",
    dimensions: [256, 512, 1024, 2048],
    defaultDim: 2048,
    maxTokens: 32000,
    description: "State-of-the-art general-purpose embedding",
  },
  {
    id: "voyage/voyage-3",
    name: "Voyage 3",
    provider: "voyage",
    dimensions: [256, 512, 1024, 2048],
    defaultDim: 1024,
    maxTokens: 32000,
    costPer1M: 0.06,
    description: "High-performance general-purpose embedding",
  },
  {
    id: "voyage/voyage-3-lite",
    name: "Voyage 3 Lite",
    provider: "voyage",
    dimensions: [256, 512, 1024, 2048],
    defaultDim: 512,
    maxTokens: 32000,
    costPer1M: 0.02,
    description: "Fast and cost-effective embedding",
  },
  {
    id: "voyage/voyage-code-3",
    name: "Voyage Code 3",
    provider: "voyage",
    dimensions: [256, 512, 1024, 2048],
    defaultDim: 1024,
    maxTokens: 32000,
    description: "Specialized for code retrieval tasks",
  },
];

// ============================================================================
// Mistral Embeddings
// ============================================================================

export const mistralEmbeddingModels: EmbeddingModelDefinition[] = [
  {
    id: "mistral/mistral-embed",
    name: "Mistral Embed",
    provider: "mistral",
    dimensions: [1024],
    defaultDim: 1024,
    maxTokens: 8000,
    description: "High-accuracy embedding for RAG and semantic search",
  },
];

// ============================================================================
// Registry
// ============================================================================

export const EMBEDDING_MODEL_REGISTRY: EmbeddingModelDefinition[] = [
  ...openaiEmbeddingModels,
  ...cohereEmbeddingModels,
  ...googleEmbeddingModels,
  ...voyageEmbeddingModels,
  ...mistralEmbeddingModels,
];

// ============================================================================
// Helper Functions
// ============================================================================

export function getEmbeddingModel(
  id: string,
): EmbeddingModelDefinition | undefined {
  return EMBEDDING_MODEL_REGISTRY.find((m) => m.id === id);
}

export function validateDimension(modelId: string, dimension: number): boolean {
  const model = getEmbeddingModel(modelId);
  return model?.dimensions.includes(dimension) ?? false;
}

export function getModelsByProvider(
  provider: string,
): EmbeddingModelDefinition[] {
  return EMBEDDING_MODEL_REGISTRY.filter((m) => m.provider === provider);
}

export function getAllProviders(): string[] {
  return Array.from(new Set(EMBEDDING_MODEL_REGISTRY.map((m) => m.provider)));
}
