"use client";

import { AlertCircle, Database, HelpCircle, Settings2 } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { VectorProvider as VectorProviderType } from "@/generated/prisma";
import {
  getAllProviders,
  getIndexTypes,
  getMetricTypes,
} from "@/lib/vector/registry";

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
  const providers = getAllProviders();
  const metricTypes = getMetricTypes(provider);
  const indexTypes = getIndexTypes(provider);

  const updateConfig = (key: string, value: unknown) => {
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <TooltipProvider>
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
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id} disabled={!p.implemented}>
                  {p.name}
                  {!p.implemented && " (Coming Soon)"}
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
                  {/* Index Type */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="index-type">Index Type</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="font-medium mb-1">
                            Choose based on your needs:
                          </p>
                          <ul className="text-xs space-y-1">
                            <li>
                              <strong>HNSW:</strong> Best for real-time search,
                              high accuracy
                            </li>
                            <li>
                              <strong>IVF_FLAT:</strong> Balanced speed/accuracy
                            </li>
                            <li>
                              <strong>IVF_SQ8:</strong> Memory-constrained
                              environments
                            </li>
                            <li>
                              <strong>IVF_PQ:</strong> Very large datasets
                            </li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={(config.indexType as string) || "HNSW"}
                      onValueChange={(value) =>
                        updateConfig("indexType", value)
                      }
                    >
                      <SelectTrigger id="index-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {indexTypes.map((index) => (
                          <SelectItem key={index.id} value={index.id}>
                            <div className="flex flex-col">
                              <span>{index.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {index.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {
                        indexTypes.find(
                          (i) => i.id === (config.indexType as string),
                        )?.description
                      }
                    </p>
                  </div>

                  {/* Metric Type */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="metric-type">Distance Metric</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="font-medium mb-1">
                            How to measure vector similarity:
                          </p>
                          <ul className="text-xs space-y-1">
                            <li>
                              <strong>COSINE:</strong> Angular similarity
                              (recommended)
                            </li>
                            <li>
                              <strong>IP:</strong> Inner product (for normalized
                              vectors)
                            </li>
                            <li>
                              <strong>L2:</strong> Euclidean distance
                            </li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={(config.metricType as string) || "COSINE"}
                      onValueChange={(value) =>
                        updateConfig("metricType", value)
                      }
                    >
                      <SelectTrigger id="metric-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {metricTypes
                          .filter((m) => ["COSINE", "IP", "L2"].includes(m.id))
                          .map((metric) => (
                            <SelectItem key={metric.id} value={metric.id}>
                              <div className="flex flex-col">
                                <span>{metric.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  Range: {metric.range} -{" "}
                                  {metric.interpretation}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {
                        metricTypes.find(
                          (m) => m.id === (config.metricType as string),
                        )?.description
                      }
                    </p>
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
    </TooltipProvider>
  );
}
