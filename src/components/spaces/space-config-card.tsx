"use client";

import { Badge } from "@/components/ui/badge";
import type { Space, SpaceStatus } from "@/types/space";

interface SpaceConfigCardProps {
  space: Space;
}

export function SpaceConfigCard({ space }: SpaceConfigCardProps) {
  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Configuration</h3>
        <SpaceStatusBadge status={space.status} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Vector DB</div>
          <div className="font-medium">
            {getProviderDisplayName(space.vectorProvider)}
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

        <div>
          <div className="text-muted-foreground text-xs">Embedding</div>
          <div className="font-medium">
            {space.embeddingModel.provider} / {space.embeddingModel.name}
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
