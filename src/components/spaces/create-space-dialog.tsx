"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { VectorProvider } from "@/generated/prisma";
import { VectorConfigForm } from "./vector-config-form";

interface CreateSpaceDialogProps {
  children: ReactNode;
}

export function CreateSpaceDialog({ children }: CreateSpaceDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Vector configuration state
  const [vectorProvider, setVectorProvider] =
    useState<VectorProvider>("MILVUS");
  const [vectorConfig, setVectorConfig] = useState<Record<string, unknown>>({
    database: "default",
    indexType: "HNSW",
    metricType: "IP",
    M: 16,
    efConstruction: 200,
  });
  const [embeddingModelId, setEmbeddingModelId] = useState("cohere/embed-v4.0");
  const [embeddingDim, setEmbeddingDim] = useState(1536);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          vectorProvider,
          vectorConfig,
          embeddingModelId,
          embeddingDim,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create space");
      }

      const data = await response.json();
      setOpen(false);
      setName("");
      setDescription("");
      setVectorProvider("MILVUS");
      setVectorConfig({
        database: "default",
        indexType: "HNSW",
        metricType: "IP",
        M: 16,
        efConstruction: 200,
      });
      setEmbeddingModelId("cohere/embed-v4.0");
      setEmbeddingDim(1536);
      router.push(`/spaces/${data.space.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  const isConfigValid = () => {
    if (vectorProvider === "MILVUS") {
      return Boolean(vectorConfig.url) && Boolean(vectorConfig.token);
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Space</DialogTitle>
            <DialogDescription>
              Create a space to organize your documents with vector search
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="py-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="vector">Vector Configuration</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="My Research Space"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What will you store in this space?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="vector" className="space-y-4">
              <VectorConfigForm
                provider={vectorProvider}
                onProviderChange={setVectorProvider}
                config={vectorConfig}
                onConfigChange={setVectorConfig}
                embeddingModelId={embeddingModelId}
                onEmbeddingModelIdChange={setEmbeddingModelId}
                embeddingDim={embeddingDim}
                onEmbeddingDimChange={setEmbeddingDim}
              />
            </TabsContent>
          </Tabs>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim() || !isConfigValid()}
            >
              {isLoading ? "Creating..." : "Create Space"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
