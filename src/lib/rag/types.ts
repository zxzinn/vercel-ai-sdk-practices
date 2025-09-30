// RAG Document - 原始文档
export interface RAGDocument {
  id: string;
  content: string;
  metadata: DocumentMetadata;
}

// 文档元数据
export interface DocumentMetadata {
  filename: string;
  fileType: string;
  uploadedAt: Date;
  size: number;
  chunkIndex?: number;
  totalChunks?: number;
  [key: string]: unknown;
}

// RAG Source - 检索结果中的单个来源
export interface RAGSource {
  id: string;
  content: string;
  score: number; // 相似度分数（距离的倒数，越大越相似）
  distance: number; // Chromadb 返回的原始距离（越小越相似）
  metadata: DocumentMetadata;
}

// RAG Query 选项
export interface RAGQueryOptions {
  topK?: number;
  scoreThreshold?: number;
  collectionName?: string;
}

// RAG Query 结果
export interface RAGQueryResult {
  sources: RAGSource[];
  query: string;
  totalResults: number;
}

// RAG Ingest 选项
export interface RAGIngestOptions {
  collectionName?: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

// RAG Ingest 结果
export interface RAGIngestResult {
  documentIds: string[];
  totalChunks: number;
  collectionName: string;
}

// Embedding 相关
export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  usage?: {
    tokens: number;
  };
}

// Chromadb 查询结果（基于原型测试）
export interface ChromaQueryResult {
  ids: string[][];
  documents: (string | null)[][];
  distances: (number | null)[][];
  metadatas: (Record<string, unknown> | null)[][];
}

// Vector Store 提供商
export type VectorStoreProvider = "chroma";
export type EmbeddingProvider = "cohere";
