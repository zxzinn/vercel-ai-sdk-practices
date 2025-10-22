export type DocumentStatus = "UPLOADING" | "PROCESSING" | "INDEXED" | "FAILED";

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
  documents: Document[];
  tags: Tag[];
}
