"use client";

import {
  FileText,
  MoreVertical,
  Tag as TagIcon,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Space } from "@/types/space";
import { DocumentUploadDialog } from "./document-upload-dialog";
import { TagManager } from "./tag-manager";

interface SpaceDetailProps {
  spaceId: string;
}

export function SpaceDetail({ spaceId }: SpaceDetailProps) {
  const [space, setSpace] = useState<Space | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpace = useCallback(async () => {
    try {
      const response = await fetch(`/api/spaces/${spaceId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch space");
      }
      const data = await response.json();
      setSpace(data.space);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    fetchSpace();
  }, [fetchSpace]);

  async function handleDeleteDocument(documentId: string) {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await fetch(
        `/api/spaces/${spaceId}/documents/${documentId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      await fetchSpace();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete document");
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !space) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>{error || "Space not found"}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{space.name}</h1>
          {space.description && (
            <p className="text-muted-foreground mt-2">{space.description}</p>
          )}
          <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{space.documents.length} documents</span>
            </div>
            <div className="flex items-center gap-1">
              <TagIcon className="h-4 w-4" />
              <span>{space.tags.length} tags</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <TagManager
            spaceId={spaceId}
            tags={space.tags}
            onTagsChange={fetchSpace}
          />
          <DocumentUploadDialog spaceId={spaceId} onUploadComplete={fetchSpace}>
            <Button size="lg">
              <Upload className="mr-2 h-4 w-4" />
              Upload Documents
            </Button>
          </DocumentUploadDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Manage documents in this space</CardDescription>
        </CardHeader>
        <CardContent>
          {space.documents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents yet</p>
              <p className="text-sm">
                Upload your first document to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {space.documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {doc.fileName}
                      </div>
                    </TableCell>
                    <TableCell>{formatFileSize(doc.size)}</TableCell>
                    <TableCell>{doc.totalChunks}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          doc.status === "INDEXED" ? "default" : "secondary"
                        }
                      >
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
