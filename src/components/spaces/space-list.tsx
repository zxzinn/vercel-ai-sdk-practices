"use client";

import { FileText, FolderOpen, Tag } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Space {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    documents: number;
    tags: number;
  };
}

export function SpaceList() {
  const [spaces, setSpaces] = useState<Space[]>([]);
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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {spaces.map((space) => (
        <Link key={space.id} href={`/spaces/${space.id}`}>
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                {space.name}
              </CardTitle>
              {space.description && (
                <CardDescription className="line-clamp-2">
                  {space.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>{space._count.documents} docs</span>
                </div>
                <div className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  <span>{space._count.tags} tags</span>
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Updated {new Date(space.updatedAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
