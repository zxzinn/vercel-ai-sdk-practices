"use client";

import { SearchResultsCarousel } from "./search-results-carousel";

interface SearchSource {
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

interface SearchOutput {
  query: string;
  totalResults: number;
  sources: SearchSource[];
}

interface SearchResultsContainerProps {
  output: SearchOutput;
}

export function SearchResultsContainer({
  output,
}: SearchResultsContainerProps) {
  if (
    !output ||
    !Array.isArray(output.sources) ||
    output.sources.length === 0
  ) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        No results found for your search
      </div>
    );
  }

  return (
    <div className="w-full py-4">
      <SearchResultsCarousel sources={output.sources} query={output.query} />
    </div>
  );
}
