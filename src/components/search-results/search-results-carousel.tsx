"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { SearchResultCard } from "./search-result-card";
import type { SearchSource } from "./types";

interface SearchResultsCarouselProps {
  sources: SearchSource[];
  query: string;
}

export function SearchResultsCarousel({
  sources,
  query,
}: SearchResultsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      // Check scroll position after a brief delay
      setTimeout(checkScroll, 300);
    }
  };

  if (!sources || sources.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No search results found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">
          Search Results ({sources.length})
        </h3>
        <p className="text-xs text-muted-foreground">Query: {query}</p>
      </div>

      {/* Carousel Container */}
      <div className="relative flex items-center gap-2">
        {/* Left Button */}
        <Button
          variant="outline"
          size="icon"
          className="flex-shrink-0"
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>

        {/* Cards Container - No Scrollbar */}
        <div
          ref={scrollContainerRef}
          className="flex-1 flex gap-3 overflow-x-hidden snap-x snap-mandatory scroll-smooth"
          onScroll={checkScroll}
          onLoad={checkScroll}
        >
          {sources.map((source, index) => (
            <SearchResultCard
              key={source.id}
              rank={index + 1}
              source={source}
            />
          ))}
        </div>

        {/* Right Button */}
        <Button
          variant="outline"
          size="icon"
          className="flex-shrink-0"
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
