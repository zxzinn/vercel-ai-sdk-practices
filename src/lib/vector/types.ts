import type { VectorProvider as PrismaVectorProvider } from "@/generated/prisma";

// Re-export Prisma enum
export { VectorProvider as VectorProviderType } from "@/generated/prisma";

// Provider-specific configuration types
export interface MilvusConfig {
  url: string;
  token: string;
  database?: string;
  indexType?: "FLAT" | "HNSW" | "IVF_FLAT" | "IVF_SQ8" | "IVF_PQ";
  metricType?: "IP" | "L2" | "COSINE" | "HAMMING" | "JACCARD";
  // HNSW specific parameters
  M?: number;
  efConstruction?: number;
  // IVF specific parameters
  nlist?: number;
  nprobe?: number;
  // IVF_PQ specific parameters
  m?: number;
  nbits?: number;
  // HNSW search parameter
  ef?: number;
}

export interface PineconeConfig {
  apiKey: string;
  environment: string;
  indexName?: string;
}

export interface QdrantConfig {
  url: string;
  apiKey?: string;
  collectionName?: string;
}

export interface WeaviateConfig {
  url: string;
  apiKey?: string;
  scheme?: "http" | "https";
}

export interface ChromaConfig {
  url?: string;
  tenant?: string;
  database?: string;
}

// Union type for all provider configs
export type VectorProviderConfig =
  | { provider: "MILVUS"; config: MilvusConfig }
  | { provider: "PINECONE"; config: PineconeConfig }
  | { provider: "QDRANT"; config: QdrantConfig }
  | { provider: "WEAVIATE"; config: WeaviateConfig }
  | { provider: "CHROMA"; config: ChromaConfig };

// Document for vector operations
export interface VectorDocument {
  id: string;
  content: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

// Search options
export interface SearchOptions {
  topK?: number;
  scoreThreshold?: number;
  filter?: Record<string, unknown>;
  // HNSW search parameter
  ef?: number;
}

// Search result
export interface SearchResult {
  id: string;
  content: string;
  score: number;
  distance: number;
  metadata: Record<string, unknown>;
}

// Collection schema
export interface CollectionSchema {
  name: string;
  dimension: number;
  description?: string;
  indexType?: string;
  metricType?: string;
}

/**
 * Abstract interface for vector database providers
 * All providers must implement this interface
 */
export interface IVectorProvider {
  readonly name: PrismaVectorProvider;

  /**
   * Initialize the provider with configuration
   */
  initialize(config: Record<string, unknown>): Promise<void>;

  /**
   * Check if a collection exists
   */
  hasCollection(name: string): Promise<boolean>;

  /**
   * Create a new collection with the specified schema
   */
  createCollection(schema: CollectionSchema): Promise<void>;

  /**
   * Delete a collection
   */
  deleteCollection(name: string): Promise<void>;

  /**
   * List all collections
   */
  listCollections(): Promise<string[]>;

  /**
   * Insert documents into a collection
   */
  insert(collectionName: string, documents: VectorDocument[]): Promise<void>;

  /**
   * Delete documents from a collection
   */
  delete(
    collectionName: string,
    filter: Record<string, unknown>,
  ): Promise<void>;

  /**
   * Search for similar vectors in a collection
   */
  search(
    collectionName: string,
    vector: number[],
    options?: SearchOptions,
  ): Promise<SearchResult[]>;

  /**
   * Get collection statistics
   */
  getCollectionStats(
    name: string,
  ): Promise<{ count: number; dimension: number }>;

  /**
   * Clean up resources
   */
  cleanup(): Promise<void>;
}
