"use client";

import {
  ChevronRight,
  Database,
  FileText,
  FolderOpen,
  Sparkles,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SpaceListItem, SpaceStatus } from "@/types/space";

export function SpaceList() {
  const [spaces, setSpaces] = useState<SpaceListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSpaces() {
      try {
        const response = await fetch("/api/spaces");
        if (!response.ok) {
          throw new Error("Failed to fetch spaces");
        }
        const data = await response.json();
        setSpaces(data.spaces);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchSpaces();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (spaces.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center py-12">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>No spaces yet</CardTitle>
          <CardDescription>
            Create your first space to start organizing documents
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {spaces.map((space) => (
        <Link key={space.id} href={`/spaces/${space.id}`}>
          <div className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer bg-card">
            <div className="flex items-start justify-between gap-4">
              {/* Left: Name & Description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                  <h3 className="font-semibold truncate">{space.name}</h3>
                  <SpaceStatusBadge status={space.status} />
                </div>
                {space.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1 ml-7">
                    {space.description}
                  </p>
                )}
              </div>

              {/* Right: Config & Stats */}
              <div className="flex items-center gap-6 text-sm shrink-0">
                {/* Vector DB */}
                <div className="flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {getProviderShortName(space.vectorProvider)}
                  </span>
                </div>

                {/* Embedding Dim */}
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {space.embeddingDim}d
                  </span>
                </div>

                {/* Documents */}
                <div className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {space._count.documents}
                  </span>
                </div>

                {/* Vectors */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {space.vectorCount > 0
                      ? `${(space.vectorCount / 1000).toFixed(1)}k`
                      : "0"}
                  </span>
                </div>

                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
        </Link>
      ))}
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
    INITIALIZING: { variant: "secondary", label: "Init" },
    ACTIVE: { variant: "default", label: "Active" },
    INACTIVE: { variant: "outline", label: "Inactive" },
    ERROR: { variant: "destructive", label: "Error" },
    DELETING: { variant: "destructive", label: "Deleting" },
  };

  const config = variants[status];
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}

function getProviderShortName(provider: string): string {
  const names: Record<string, string> = {
    MILVUS: "Milvus",
    PINECONE: "Pinecone",
    QDRANT: "Qdrant",
    WEAVIATE: "Weaviate",
    CHROMA: "Chroma",
  };
  return names[provider] || provider;
}
