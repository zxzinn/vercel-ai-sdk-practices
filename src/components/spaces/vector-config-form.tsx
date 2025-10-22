"use client";

import { AlertCircle, Database, Settings2 } from "lucide-react";
import { useState } from "react";
import { EmbeddingModelSelector } from "@/components/embedding-model-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VectorProvider as VectorProviderType } from "@/generated/prisma";

interface VectorConfigFormProps {
  provider: VectorProviderType;
  onProviderChange: (provider: VectorProviderType) => void;
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
  embeddingModelId: string;
  onEmbeddingModelIdChange: (modelId: string) => void;
  embeddingDim: number;
  onEmbeddingDimChange: (dim: number) => void;
}

const AVAILABLE_PROVIDERS: Array<{
  value: VectorProviderType;
  label: string;
  available: boolean;
}> = [
  { value: "MILVUS", label: "Milvus / Zilliz Cloud", available: true },
  { value: "PINECONE", label: "Pinecone", available: false },
  { value: "QDRANT", label: "Qdrant", available: false },
  { value: "WEAVIATE", label: "Weaviate", available: false },
  { value: "CHROMA", label: "ChromaDB", available: false },
];

export function VectorConfigForm({
  provider,
  onProviderChange,
  config,
  onConfigChange,
  embeddingModelId,
  onEmbeddingModelIdChange,
  embeddingDim,
  onEmbeddingDimChange,
}: VectorConfigFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateConfig = (key: string, value: unknown) => {
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div className="space-y-2">
        <Label htmlFor="provider">Vector Database Provider</Label>
        <Select
          value={provider}
          onValueChange={(value) =>
            onProviderChange(value as VectorProviderType)
          }
        >
          <SelectTrigger id="provider">
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_PROVIDERS.map((p) => (
              <SelectItem key={p.value} value={p.value} disabled={!p.available}>
                {p.label}
                {!p.available && " (Coming Soon)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Choose where your document embeddings will be stored
        </p>
      </div>

      {/* Milvus Configuration */}
      {provider === "MILVUS" && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4" />
            <h3 className="font-medium">Milvus Configuration</h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="milvus-url">Endpoint URL *</Label>
              <Input
                id="milvus-url"
                type="url"
                placeholder="https://your-cluster.zillizcloud.com"
                value={(config.url as string) || ""}
                onChange={(e) => updateConfig("url", e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Your Milvus or Zilliz Cloud endpoint
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="milvus-token">API Token *</Label>
              <Input
                id="milvus-token"
                type="password"
                placeholder="Your API token"
                value={(config.token as string) || ""}
                onChange={(e) => updateConfig("token", e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Get this from your Milvus/Zilliz dashboard
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="milvus-database">Database Name</Label>
              <Input
                id="milvus-database"
                placeholder="default"
                value={(config.database as string) || "default"}
                onChange={(e) => updateConfig("database", e.target.value)}
              />
            </div>

            {/* Advanced Settings */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              {showAdvanced ? "Hide" : "Show"} Advanced Settings
            </Button>

            {showAdvanced && (
              <div className="space-y-3 pt-2 border-t">
                <div className="space-y-2">
                  <Label htmlFor="index-type">Index Type</Label>
                  <Select
                    value={(config.indexType as string) || "HNSW"}
                    onValueChange={(value) => updateConfig("indexType", value)}
                  >
                    <SelectTrigger id="index-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HNSW">HNSW (Recommended)</SelectItem>
                      <SelectItem value="IVF_FLAT">IVF_FLAT</SelectItem>
                      <SelectItem value="IVF_SQ8">IVF_SQ8</SelectItem>
                      <SelectItem value="IVF_PQ">IVF_PQ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metric-type">Metric Type</Label>
                  <Select
                    value={(config.metricType as string) || "IP"}
                    onValueChange={(value) => updateConfig("metricType", value)}
                  >
                    <SelectTrigger id="metric-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IP">
                        IP (Inner Product - Recommended)
                      </SelectItem>
                      <SelectItem value="L2">
                        L2 (Euclidean Distance)
                      </SelectItem>
                      <SelectItem value="COSINE">Cosine Similarity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Embedding Configuration */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="font-medium">Embedding Configuration</h3>

        <div className="space-y-3">
          <EmbeddingModelSelector
            value={embeddingModelId}
            dimension={embeddingDim}
            onValueChange={(modelId, defaultDim) => {
              onEmbeddingModelIdChange(modelId);
            }}
            onDimensionChange={onEmbeddingDimChange}
          />
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Configuration cannot be changed after creating the space. Choose
          carefully!
        </AlertDescription>
      </Alert>
    </div>
  );
}
