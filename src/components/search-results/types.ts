export interface SearchSource {
  id: string;
  content: string;
  score: string;
  distance: string;
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
