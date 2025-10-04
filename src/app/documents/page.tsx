"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { FileTextIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { DraggableFile } from "./components/draggable-file";
import { DroppableFolder } from "./components/droppable-folder";

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
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

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

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const filePath = active.id as string;
      const file = documents.find((d) => d.filePath === filePath);
      const targetFolderId = over.id as string;

      if (file && file.documentId !== targetFolderId) {
        handleMove(filePath, file.documentId, targetFolderId);
      }
    }

    setActiveId(null);
  }

  const activeFile = activeId
    ? documents.find((d) => d.filePath === activeId)
    : null;

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
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="border rounded-lg overflow-hidden">
              {Object.entries(groupedDocs).map(([documentId, files]) => (
                <div key={documentId}>
                  <DroppableFolder
                    documentId={documentId}
                    fileCount={files.length}
                    deletingId={deletingId}
                    onDeleteFolder={handleDeleteFolder}
                  />

                  {/* File List */}
                  {files.map((file) => (
                    <DraggableFile
                      key={file.filePath}
                      file={file}
                      documentId={documentId}
                      movingFile={movingFile}
                      formatFileSize={formatFileSize}
                      formatDate={formatDate}
                      onDeleteFile={handleDeleteFile}
                    />
                  ))}
                </div>
              ))}
            </div>

            <DragOverlay>
              {activeFile ? (
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 bg-background border rounded shadow-lg">
                  <div className="flex items-center gap-2 min-w-0 pl-6">
                    <FileTextIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-sm">
                      {activeFile.fileName}
                    </span>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
