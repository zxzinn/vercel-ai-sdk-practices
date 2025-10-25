"use client";

import { SearchResultsCarousel } from "./search-results-carousel";
import type { SearchOutput } from "./types";

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
