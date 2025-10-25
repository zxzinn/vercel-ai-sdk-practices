"use client";

import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SearchResultSource {
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

interface SearchResultCardProps {
  rank: number;
  source: SearchResultSource;
}

function getRelevanceBadge(score: number) {
  if (score >= 0.8) return { label: "Highly Relevant", color: "bg-green-500" };
  if (score >= 0.6) return { label: "Relevant", color: "bg-amber-500" };
  return { label: "Potentially Relevant", color: "bg-red-500" };
}

export function SearchResultCard({ rank, source }: SearchResultCardProps) {
  const score = parseFloat(source.score);
  const relevance = getRelevanceBadge(score);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "min-w-80 flex-shrink-0 rounded-lg border p-4 transition-all",
            "hover:shadow-md hover:border-foreground/50 cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "bg-card",
          )}
        >
          <div className="space-y-3">
            {/* Header with rank and filename */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-semibold">
                  #{rank}
                </Badge>
                <span className="text-sm font-medium truncate">
                  {source.metadata.filename}
                </span>
              </div>
            </div>

            {/* Score and Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Relevance
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {score.toFixed(2)}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    relevance.color,
                  )}
                  style={{ width: `${Math.min(score, 1) * 100}%` }}
                />
              </div>
            </div>

            {/* Badge */}
            <Badge variant="outline" className="w-fit text-xs">
              {relevance.label}
            </Badge>
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 max-h-80 p-0 flex flex-col" align="start">
        {/* Fixed Header */}
        <div className="space-y-4 p-4 border-b flex-shrink-0">
          {/* Title */}
          <div>
            <h3 className="font-semibold text-sm">
              {source.metadata.filename}
            </h3>
            <p className="text-xs text-muted-foreground">
              Rank #{rank} • Score: {score.toFixed(3)}
            </p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            {source.metadata.chunkIndex !== undefined && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Chunk
                </p>
                <p className="text-sm font-semibold">
                  {source.metadata.chunkIndex + 1}/{source.metadata.totalChunks}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Distance
              </p>
              <p className="text-sm font-semibold">{source.distance}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Score</p>
              <p className="text-sm font-semibold">{score.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Type</p>
              <p className="text-sm font-semibold">
                {source.metadata.fileType}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content Preview */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs font-medium text-foreground mb-2">
            Content Preview
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed bg-muted/50 p-3 rounded">
            {source.content}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
