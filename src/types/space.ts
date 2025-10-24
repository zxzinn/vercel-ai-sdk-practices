export type DocumentStatus = "UPLOADING" | "PROCESSING" | "INDEXED" | "FAILED";

export type SpaceStatus =
  | "INITIALIZING"
  | "ACTIVE"
  | "INACTIVE"
  | "ERROR"
  | "DELETING";

export type VectorProvider =
  | "MILVUS"
  | "PINECONE"
  | "QDRANT"
  | "WEAVIATE"
  | "CHROMA";

export interface EmbeddingModel {
  id: string;
  name: string;
  provider: string;
  dimensions: number[];
  defaultDim: number;
  maxTokens: number;
  costPer1M: number | null;
  description: string | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export interface DocumentTag {
  tag: Tag;
}

export interface Document {
  id: string;
  fileName: string;
  fileType: string;
  size: number;
  status: DocumentStatus;
  totalChunks: number;
  uploadedAt: string;
  tags: DocumentTag[];
}

export interface SpaceListItem {
  id: string;
  name: string;
  description: string | null;
  status: SpaceStatus;
  vectorProvider: VectorProvider;
  embeddingDim: number;
  vectorCount: number;
  storageSize: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    documents: number;
    tags: number;
  };
}

export interface SpaceSelectorItem {
  id: string;
  name: string;
  _count: {
    documents: number;
  };
}

export interface Space {
  id: string;
  name: string;
  description: string | null;
  status: SpaceStatus;
  vectorProvider: VectorProvider;
  vectorConfig: Record<string, unknown> | null;
  collectionName: string | null;
  embeddingModelId: string;
  embeddingModel: EmbeddingModel;
  embeddingDim: number;
  errorMessage: string | null;
  lastSyncAt: string | null;
  vectorCount: number;
  storageSize: string;
  createdAt: string;
  updatedAt: string;
  documents: Document[];
  tags: Tag[];
}
