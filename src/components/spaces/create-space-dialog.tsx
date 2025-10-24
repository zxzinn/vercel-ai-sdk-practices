"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VectorProvider } from "@/generated/prisma";
import { VectorConfigForm } from "./vector-config-form";
import {
  WideDialog,
  WideDialogContent,
  WideDialogDescription,
  WideDialogFooter,
  WideDialogHeader,
  WideDialogTitle,
  WideDialogTrigger,
} from "./wide-dialog";

interface CreateSpaceDialogProps {
  children: ReactNode;
}

export function CreateSpaceDialog({ children }: CreateSpaceDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Vector configuration state
  const [vectorProvider, setVectorProvider] =
    useState<VectorProvider>("MILVUS");
  const [vectorConfig, setVectorConfig] = useState<Record<string, unknown>>({
    database: "default",
    indexType: "HNSW",
    metricType: "COSINE",
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
      setStep(1);
      setName("");
      setDescription("");
      setVectorProvider("MILVUS");
      setVectorConfig({
        database: "default",
        indexType: "HNSW",
        metricType: "COSINE",
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
    <WideDialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          setStep(1);
          setError(null);
        }
      }}
    >
      <WideDialogTrigger asChild>{children}</WideDialogTrigger>
      <WideDialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw]">
        <form onSubmit={handleSubmit}>
          <WideDialogHeader>
            <WideDialogTitle>Create New Space</WideDialogTitle>
            <WideDialogDescription>
              {step === 1
                ? "Create a space to organize your documents with vector search"
                : "Configure vector database and embedding settings"}
            </WideDialogDescription>
          </WideDialogHeader>

          <div className="py-4">
            {step === 1 && (
              <div className="space-y-4">
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
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
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
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <WideDialogFooter>
            {step === 1 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!name.trim()}
                >
                  Next
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button type="submit" disabled={isLoading || !isConfigValid()}>
                  {isLoading ? "Creating..." : "Create Space"}
                </Button>
              </>
            )}
          </WideDialogFooter>
        </form>
      </WideDialogContent>
    </WideDialog>
  );
}
