import type { VectorProvider } from "@/generated/prisma";
import { MilvusProvider } from "./providers/milvus";
import type { IVectorProvider, MilvusConfig } from "./types";

/**
 * Provider registry - add new providers here
 */
const PROVIDER_REGISTRY = {
  MILVUS: MilvusProvider,
  // Add more providers as they're implemented:
  // PINECONE: PineconeProvider,
  // QDRANT: QdrantProvider,
  // WEAVIATE: WeaviateProvider,
  // CHROMA: ChromaProvider,
} as const;

/**
 * Get default configuration for a provider
 * Returns minimal defaults - actual config should come from database
 */
function getDefaultConfig(provider: VectorProvider): Record<string, unknown> {
  switch (provider) {
    case "MILVUS":
      return {
        database: "default",
        indexType: "HNSW",
        metricType: "IP",
        M: 16,
        efConstruction: 200,
      };

    case "PINECONE":
      throw new Error("Pinecone provider not yet implemented");

    case "QDRANT":
      throw new Error("Qdrant provider not yet implemented");

    case "WEAVIATE":
      throw new Error("Weaviate provider not yet implemented");

    case "CHROMA":
      throw new Error("Chroma provider not yet implemented");

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Merge default config with user-provided config
 */
function mergeConfig(
  provider: VectorProvider,
  userConfig?: Record<string, unknown> | null,
): Record<string, unknown> {
  const defaultConfig = getDefaultConfig(provider);

  if (!userConfig) {
    throw new Error(
      `Vector configuration missing for ${provider}. ` +
        `Spaces must be created with valid provider connection details (url, token, etc.).`,
    );
  }

  return { ...defaultConfig, ...userConfig };
}

/**
 * Create and initialize a vector provider instance
 */
export async function createVectorProvider(
  provider: VectorProvider,
  userConfig?: Record<string, unknown> | null,
): Promise<IVectorProvider> {
  const ProviderClass =
    PROVIDER_REGISTRY[provider as keyof typeof PROVIDER_REGISTRY];

  if (!ProviderClass) {
    throw new Error(
      `Provider ${provider} not found in registry. Available: ${Object.keys(PROVIDER_REGISTRY).join(", ")}`,
    );
  }

  const instance = new ProviderClass();
  const config = mergeConfig(provider, userConfig);

  await instance.initialize(config);

  return instance;
}

/**
 * Get list of available providers
 */
export function getAvailableProviders(): VectorProvider[] {
  return Object.keys(PROVIDER_REGISTRY) as VectorProvider[];
}

/**
 * Check if a provider is available (implemented)
 */
export function isProviderAvailable(provider: VectorProvider): boolean {
  return provider in PROVIDER_REGISTRY;
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(
  provider: VectorProvider,
  config: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (provider) {
    case "MILVUS": {
      const milvusConfig = config as Partial<MilvusConfig>;

      if (!milvusConfig.url) errors.push("url is required");
      if (!milvusConfig.token) errors.push("token is required");

      if (
        milvusConfig.indexType &&
        !["HNSW", "IVF_FLAT", "IVF_SQ8", "IVF_PQ"].includes(
          milvusConfig.indexType,
        )
      ) {
        errors.push("Invalid indexType");
      }
      if (
        milvusConfig.metricType &&
        !["IP", "L2", "COSINE"].includes(milvusConfig.metricType)
      ) {
        errors.push("Invalid metricType");
      }
      break;
    }

    // Add validation for other providers...
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
