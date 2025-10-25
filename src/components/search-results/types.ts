export interface SearchSource {
  id: string;
  content: string;
  score: number;
  distance: number;
  metadata: {
    filename: string;
    fileType: string;
    chunkIndex?: number;
    totalChunks?: number;
  };
}

export interface SearchOutput {
  query: string;
  totalResults: number;
  sources: SearchSource[];
}
