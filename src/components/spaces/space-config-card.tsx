"use client";

import { Database, Settings, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Space, SpaceStatus } from "@/types/space";

interface SpaceConfigCardProps {
  space: Space;
  onUpdate?: () => void;
}

export function SpaceConfigCard({ space, onUpdate }: SpaceConfigCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [scoreThreshold, setScoreThreshold] = useState(space.scoreThreshold);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state with props when space changes and not editing
  useEffect(() => {
    if (!isEditing) {
      setScoreThreshold(space.scoreThreshold);
    }
  }, [space.scoreThreshold, isEditing]);

  async function handleSave() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/spaces/${space.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreThreshold }),
      });

      if (!response.ok) {
        throw new Error("Failed to update space");
      }

      setIsEditing(false);
      onUpdate?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update space");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setScoreThreshold(space.scoreThreshold);
    setIsEditing(false);
  }
  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Configuration</h3>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Edit
            </Button>
          ) : null}
          <SpaceStatusBadge status={space.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 text-sm">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-muted-foreground text-xs">Vector DB</div>
            <div className="font-medium">
              {getProviderDisplayName(space.vectorProvider)}
            </div>
          </div>
        </div>

        {space.vectorConfig?.indexType && space.vectorConfig?.metricType ? (
          <div>
            <div className="text-muted-foreground text-xs">Index / Metric</div>
            <div className="font-medium">
              {space.vectorConfig.indexType as string} /{" "}
              {space.vectorConfig.metricType as string}
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-muted-foreground text-xs">Embedding</div>
            <div className="font-medium">{space.embeddingModel.name}</div>
          </div>
        </div>

        <div>
          <div className="text-muted-foreground text-xs">Dimension</div>
          <div className="font-medium">{space.embeddingDim}d</div>
        </div>

        <div>
          <div className="text-muted-foreground text-xs">Documents</div>
          <div className="font-medium">{space.documents.length}</div>
        </div>

        <div>
          <div className="text-muted-foreground text-xs">Vectors</div>
          <div className="font-medium">
            {space.vectorCount.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-muted-foreground text-xs">Storage</div>
          <div className="font-medium">{formatBytes(space.storageSize)}</div>
        </div>

        {space.lastSyncAt ? (
          <div>
            <div className="text-muted-foreground text-xs">Last Sync</div>
            <div className="font-medium">
              {new Date(space.lastSyncAt).toLocaleString()}
            </div>
          </div>
        ) : null}
      </div>

      {/* Error Message */}
      {space.errorMessage && (
        <div className="text-destructive text-xs mt-3 p-2 bg-destructive/10 rounded">
          {space.errorMessage}
        </div>
      )}

      {/* Search Settings */}
      <div className="mt-4 pt-4 border-t">
        <h4 className="text-sm font-medium mb-3">Search Settings</h4>
        <div className="space-y-3">
          {isEditing ? (
            <div className="space-y-2">
              <Label htmlFor="scoreThreshold" className="text-sm">
                Minimum Relevance Score (0-1)
              </Label>
              <p className="text-xs text-muted-foreground">
                Higher values return fewer but more relevant results. Default:
                0.3
              </p>
              <Input
                id="scoreThreshold"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={scoreThreshold}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") return;
                  const parsed = Number.parseFloat(value);
                  if (!Number.isNaN(parsed)) {
                    setScoreThreshold(parsed);
                  }
                }}
                className="max-w-xs"
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-muted-foreground text-xs">
                Minimum Relevance Score
              </div>
              <div className="font-medium">{space.scoreThreshold}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpaceStatusBadge({ status }: { status: SpaceStatus }) {
  const variants: Record<
    SpaceStatus,
    {
      variant: "default" | "secondary" | "destructive" | "outline";
      label: string;
    }
  > = {
    INITIALIZING: { variant: "secondary", label: "Initializing" },
    ACTIVE: { variant: "default", label: "Active" },
    INACTIVE: { variant: "outline", label: "Inactive" },
    ERROR: { variant: "destructive", label: "Error" },
    DELETING: { variant: "destructive", label: "Deleting" },
  };

  const config = variants[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getProviderDisplayName(provider: string): string {
  const names: Record<string, string> = {
    MILVUS: "Milvus / Zilliz Cloud",
    PINECONE: "Pinecone",
    QDRANT: "Qdrant",
    WEAVIATE: "Weaviate",
    CHROMA: "ChromaDB",
  };
  return names[provider] || provider;
}

function formatBytes(bytes: string | number): string {
  const numBytes =
    typeof bytes === "string" ? Number.parseInt(bytes, 10) : bytes;

  if (numBytes < 1024) return `${numBytes} B`;
  if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
  if (numBytes < 1024 * 1024 * 1024)
    return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(numBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
