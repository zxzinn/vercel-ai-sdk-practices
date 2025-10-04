"use client";

import {
  DownloadIcon,
  FileTextIcon,
  FolderIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  TrashIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/auth-context";

interface DocumentFile {
  documentId: string;
  fileName: string;
  filePath: string;
  size: number;
  createdAt: string;
  downloadUrl: string | null;
}

export default function DocumentsPage() {
  const { userId, isLoading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [movingFile, setMovingFile] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !userId) return;

    async function fetchDocuments() {
      try {
        const response = await fetch("/api/documents");
        if (!response.ok) throw new Error("Failed to fetch documents");

        const data = await response.json();
        setDocuments(data.documents || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocuments();
  }, [userId, authLoading]);

  async function handleDeleteFolder(documentId: string) {
    if (!confirm("Are you sure you want to delete this folder?")) return;

    setDeletingId(documentId);
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete document");

      setDocuments((prev) =>
        prev.filter((doc) => doc.documentId !== documentId),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteFile(filePath: string, documentId: string) {
    if (!confirm("Are you sure you want to delete this file?")) return;

    setMovingFile(filePath);
    try {
      // Extract just the filename from the path
      const fileName = filePath.split("/").pop();

      const response = await fetch(
        `/api/documents/${documentId}/file/${fileName}`,
        { method: "DELETE" },
      );

      if (!response.ok) throw new Error("Failed to delete file");

      setDocuments((prev) => prev.filter((doc) => doc.filePath !== filePath));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete file");
    } finally {
      setMovingFile(null);
    }
  }

  async function handleMove(
    filePath: string,
    fromDocId: string,
    toDocId: string,
  ) {
    setMovingFile(filePath);
    try {
      const response = await fetch("/api/documents/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, fromDocId, toDocId }),
      });

      if (!response.ok) throw new Error("Failed to move file");

      const data = await response.json();

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.filePath === filePath
            ? { ...doc, documentId: toDocId, filePath: data.newPath }
            : doc,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to move file");
    } finally {
      setMovingFile(null);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2Icon className="h-5 w-5 animate-spin" />
          <span className="text-muted-foreground">Loading documents...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-destructive">Error: {error}</div>
      </div>
    );
  }

  // Group documents by documentId
  const groupedDocs = documents.reduce(
    (acc, doc) => {
      if (!acc[doc.documentId]) {
        acc[doc.documentId] = [];
      }
      acc[doc.documentId].push(doc);
      return acc;
    },
    {} as Record<string, DocumentFile[]>,
  );

  const _allFolders = Object.keys(groupedDocs);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Documents</h1>
          <Button asChild variant="outline" size="sm">
            <a href="/chat">Back to Chat</a>
          </Button>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No documents uploaded yet</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            {Object.entries(groupedDocs).map(([documentId, files]) => (
              <div key={documentId}>
                {/* Folder Header */}
                <div
                  className={`flex items-center justify-between px-4 py-2 bg-muted/30 border-b transition-colors ${
                    dragOverFolder === documentId ? "bg-primary/20" : ""
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverFolder(documentId);
                  }}
                  onDragLeave={() => {
                    setDragOverFolder(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const data = e.dataTransfer.getData("application/json");
                    if (data) {
                      const { filePath, fromDocId } = JSON.parse(data);
                      if (fromDocId !== documentId) {
                        handleMove(filePath, fromDocId, documentId);
                      }
                    }
                    setDragOverFolder(null);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <FolderIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">{documentId}</span>
                    <span className="text-xs text-muted-foreground">
                      ({files.length})
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {deletingId === documentId ? (
                          <Loader2Icon className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontalIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDeleteFolder(documentId)}
                        className="text-destructive"
                      >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        Delete Folder
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* File List */}
                {files.map((file) => (
                  <div
                    key={file.filePath}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/json",
                        JSON.stringify({
                          filePath: file.filePath,
                          fromDocId: documentId,
                        }),
                      );
                    }}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 border-b last:border-b-0 hover:bg-accent/50 items-center cursor-move"
                  >
                    <div className="flex items-center gap-2 min-w-0 pl-6">
                      <FileTextIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate text-sm">{file.fileName}</span>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatFileSize(file.size)}
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(file.createdAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={movingFile === file.filePath}
                          >
                            {movingFile === file.filePath ? (
                              <Loader2Icon className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontalIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {file.downloadUrl && (
                            <DropdownMenuItem asChild>
                              <a
                                href={file.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <DownloadIcon className="h-4 w-4 mr-2" />
                                Download
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() =>
                              handleDeleteFile(file.filePath, documentId)
                            }
                            className="text-destructive"
                          >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Delete File
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
