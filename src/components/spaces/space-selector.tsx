"use client";

import { Check, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SpaceSelectorItem } from "@/types/space";

interface SpaceSelectorProps {
  selectedSpaceId?: string;
  onSpaceChange: (spaceId: string | undefined) => void;
}

export function SpaceSelector({
  selectedSpaceId,
  onSpaceChange,
}: SpaceSelectorProps) {
  const [spaces, setSpaces] = useState<SpaceSelectorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function fetchSpaces() {
      try {
        const response = await fetch("/api/spaces");
        if (!response.ok) throw new Error("Failed to fetch spaces");
        const data = await response.json();
        setSpaces(data.spaces);
      } catch (err) {
        console.error("Failed to fetch spaces:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSpaces();
  }, []);

  const selectedSpace = spaces.find((s) => s.id === selectedSpaceId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="justify-start"
          disabled={isLoading}
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          {isLoading
            ? "Loading..."
            : selectedSpace
              ? selectedSpace.name
              : "All Spaces"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <ScrollArea className="max-h-64">
          <div className="p-2">
            <button
              type="button"
              onClick={() => {
                onSpaceChange(undefined);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md hover:bg-accent"
            >
              <span>All Spaces</span>
              {!selectedSpaceId && <Check className="h-4 w-4" />}
            </button>
            {spaces.length === 0 && !isLoading && (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                No spaces yet
              </div>
            )}
            {spaces.map((space) => (
              <button
                key={space.id}
                type="button"
                onClick={() => {
                  onSpaceChange(space.id);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md hover:bg-accent"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  <span>{space.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({space._count.documents})
                  </span>
                </div>
                {selectedSpaceId === space.id && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
