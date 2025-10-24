export interface RAGDocument {
  id: string;
  content: string;
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  filename: string;
  fileType: string;
  uploadedAt: Date;
  size: number;
  storageUrl?: string;
  chunkIndex?: number;
  totalChunks?: number;
  [key: string]: unknown;
}

export interface RAGSource {
  id: string;
  content: string;
  score: number;
  distance: number;
  metadata: DocumentMetadata;
}

export interface RAGQueryOptions {
  topK?: number;
  scoreThreshold?: number;
  collectionName?: string;
}

export interface RAGQueryResult {
  sources: RAGSource[];
  query: string;
  totalResults: number;
}

export interface RAGIngestOptions {
  collectionName?: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface RAGIngestResult {
  documentIds: string[];
  totalChunks: number;
  collectionName: string;
  documentsChunks: Array<{ documentId: string; chunks: number }>; // Per-document chunk counts
}

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  usage?: {
    tokens: number;
  };
}

export interface MilvusSearchResult {
  id: string;
  score: number;
  content: string;
  metadata: Record<string, unknown>;
}

export type VectorStoreProvider = "milvus";
export type EmbeddingProvider = "cohere";
