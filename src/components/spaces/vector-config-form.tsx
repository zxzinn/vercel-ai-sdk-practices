"use client";

import {
  AlertCircle,
  Check,
  ChevronRight,
  Database,
  HelpCircle,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  type VectorProviderDefinition,
} from "@/lib/vector/registry";

interface EmbeddingModel {
  id: string;
  name: string;
  provider: string;
  dimensions: number[];
  defaultDim: number;
  maxTokens: number;
  costPer1M: number | null;
  description: string | null;
}

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
  const [models, setModels] = useState<EmbeddingModel[]>([]);
  const [selectedEmbeddingProvider, setSelectedEmbeddingProvider] = useState<
    string | null
  >(null);

  const providers = getAllProviders();
  const selectedProvider = providers.find((p) => p.id === provider);
  const metricTypes = getMetricTypes(provider);
  const indexTypes = getIndexTypes(provider);
  const defaultMetricType =
    (selectedProvider?.defaultConfig.metricType as string) || "COSINE";
  const defaultIndexType =
    (selectedProvider?.defaultConfig.indexType as string) || "HNSW";

  // Load embedding models
  useEffect(() => {
    fetch("/api/embedding-models")
      .then((res) => res.json())
      .then((data) => {
        setModels(data.models);
        // Auto-select provider based on current model
        const currentModel = data.models.find(
          (m: EmbeddingModel) => m.id === embeddingModelId,
        );
        if (currentModel) {
          setSelectedEmbeddingProvider(currentModel.provider);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch embedding models:", error);
      });
  }, [embeddingModelId]);

  // Group models by provider
  const groupedModels = models.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, EmbeddingModel[]>,
  );

  const embeddingProviders = Object.keys(groupedModels);
  const _currentEmbeddingModel = models.find((m) => m.id === embeddingModelId);

  const providerDisplayNames: Record<string, string> = {
    openai: "OpenAI",
    cohere: "Cohere",
    google: "Google",
    voyage: "Voyage AI",
    mistral: "Mistral AI",
  };

  const updateConfig = (key: string, value: unknown) => {
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Step 1: Vector Database Provider Selection */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              Vector Database
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Choose where your document embeddings will be stored
            </p>
          </div>

          <div className="grid gap-3">
            {providers.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                selected={provider === p.id}
                disabled={!p.implemented}
                onClick={() => {
                  if (p.implemented) {
                    onProviderChange(p.id);
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Provider Configuration (shown when provider selected) */}
        {selectedProvider && (
          <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <h4 className="font-medium">
                {selectedProvider.name} Configuration
              </h4>
            </div>

            {/* Milvus Config */}
            {provider === "MILVUS" && (
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
              </div>
            )}
          </div>
        )}

        {/* Step 2: Embedding Provider Selection */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Embedding Provider
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Choose how to convert your documents into vectors
            </p>
          </div>

          <div className="grid gap-3">
            {embeddingProviders.map((providerKey) => {
              const providerModels = groupedModels[providerKey];
              const displayName =
                providerDisplayNames[providerKey] || providerKey;

              // Calculate pricing range
              const costs = providerModels
                .map((m) => m.costPer1M)
                .filter((c): c is number => c !== null);
              const minCost = costs.length > 0 ? Math.min(...costs) : null;
              const maxCost = costs.length > 0 ? Math.max(...costs) : null;

              // Get all unique dimensions across all models in this provider
              const allDims = Array.from(
                new Set(providerModels.flatMap((m) => m.dimensions)),
              ).sort((a, b) => a - b);

              return (
                <button
                  type="button"
                  key={providerKey}
                  onClick={() => setSelectedEmbeddingProvider(providerKey)}
                  className={`
                    flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all text-left w-full
                    ${selectedEmbeddingProvider === providerKey ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                  `}
                >
                  {/* Provider Name */}
                  <div className="shrink-0" style={{ width: "160px" }}>
                    <div className="font-medium">{displayName}</div>
                  </div>

                  {/* Model Count */}
                  <div
                    className="shrink-0 text-sm text-muted-foreground"
                    style={{ width: "100px" }}
                  >
                    {providerModels.length} model
                    {providerModels.length > 1 ? "s" : ""}
                  </div>

                  {/* Dimensions */}
                  <div className="flex-1 min-w-0 text-sm text-muted-foreground">
                    <span className="whitespace-nowrap">
                      {allDims.join(", ")}d
                    </span>
                  </div>

                  {/* Pricing */}
                  {minCost !== null && (
                    <div
                      className="shrink-0 text-sm text-primary font-medium whitespace-nowrap"
                      style={{ width: "100px", textAlign: "right" }}
                    >
                      {minCost === maxCost
                        ? `$${minCost}/1M`
                        : `$${minCost}-$${maxCost}/1M`}
                    </div>
                  )}

                  <ChevronRight
                    className={`h-5 w-5 shrink-0 ${selectedEmbeddingProvider === providerKey ? "text-primary" : "text-muted-foreground"}`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Embedding Model Selection (shown when provider selected) */}
        {selectedEmbeddingProvider && (
          <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <h4 className="font-medium">
                {providerDisplayNames[selectedEmbeddingProvider]} Models
              </h4>
            </div>

            <div className="grid gap-2">
              {groupedModels[selectedEmbeddingProvider]?.map((model) => (
                <div
                  key={model.id}
                  className={`
                    border rounded-lg transition-all
                    ${embeddingModelId === model.id ? "border-primary bg-primary/5" : "border-border"}
                  `}
                >
                  {/* Model Info Row */}
                  <div className="flex items-center gap-3 p-3">
                    {/* Model Name */}
                    <div className="shrink-0" style={{ width: "200px" }}>
                      <div className="font-medium text-sm truncate">
                        {model.name}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      {model.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {model.description}
                        </p>
                      )}
                    </div>

                    {/* Max Tokens */}
                    <div
                      className="shrink-0 text-xs text-muted-foreground whitespace-nowrap"
                      style={{ width: "50px" }}
                    >
                      {model.maxTokens >= 1000
                        ? `${(model.maxTokens / 1000).toFixed(0)}k`
                        : model.maxTokens}
                    </div>

                    {/* Price */}
                    <div
                      className="shrink-0 text-xs text-primary font-medium whitespace-nowrap"
                      style={{ width: "60px", textAlign: "right" }}
                    >
                      {model.costPer1M ? `$${model.costPer1M}` : "-"}
                    </div>
                  </div>

                  {/* Dimension Buttons Row */}
                  <div className="flex items-center gap-2 px-3 pb-3">
                    <span className="text-xs text-muted-foreground shrink-0">
                      Dimensions:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {model.dimensions.map((dim) => (
                        <button
                          key={dim}
                          type="button"
                          onClick={() => {
                            onEmbeddingModelIdChange(model.id);
                            onEmbeddingDimChange(dim);
                          }}
                          className={`
                            px-2.5 py-1 text-xs rounded-md border transition-all
                            ${
                              embeddingModelId === model.id &&
                              embeddingDim === dim
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border hover:border-primary/50 hover:bg-accent"
                            }
                          `}
                        >
                          {dim}d
                          {dim === model.defaultDim && (
                            <span className="ml-1 opacity-60">★</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Settings */}
        {provider === "MILVUS" && (
          <div className="space-y-4">
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
              <div className="space-y-4 rounded-lg border p-4">
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
                    value={(config.metricType as string) || defaultMetricType}
                    onValueChange={(value) => updateConfig("metricType", value)}
                  >
                    <SelectTrigger id="metric-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {metricTypes.map((metric) => (
                        <SelectItem key={metric.id} value={metric.id}>
                          <div className="flex flex-col">
                            <span>{metric.name}</span>
                            <span className="text-xs text-muted-foreground">
                              Range: {metric.range} - {metric.interpretation}
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
                          Select an index type based on your requirements
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Each option shows performance characteristics and use
                          cases below
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={(config.indexType as string) || defaultIndexType}
                    onValueChange={(value) => updateConfig("indexType", value)}
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
              </div>
            )}
          </div>
        )}

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

// Provider Card Component
function ProviderCard({
  provider,
  selected,
  disabled,
  onClick,
}: {
  provider: VectorProviderDefinition;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-4 p-4 border-2 rounded-lg transition-all text-left w-full
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
      `}
    >
      {/* Name & Status */}
      <div className="shrink-0" style={{ width: "220px" }}>
        <div className="font-medium flex items-center gap-2">
          <span className="truncate">{provider.name}</span>
          {!provider.implemented && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
              Soon
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{provider.description}</p>
      </div>

      {/* Technical Specs & Features */}
      <div className="flex items-center gap-2 text-xs shrink-0">
        <span className="text-muted-foreground whitespace-nowrap">
          {provider.indexTypes.length} index
          {provider.indexTypes.length > 1 ? "es" : ""} •{" "}
          {provider.metricTypes.length} metric
          {provider.metricTypes.length > 1 ? "s" : ""}
        </span>

        {provider.features && (
          <div className="flex gap-1">
            {provider.features.filtering && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                Filter
              </span>
            )}
            {provider.features.hybridSearch && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                Hybrid
              </span>
            )}
          </div>
        )}
      </div>

      {!disabled && (
        <ChevronRight
          className={`h-5 w-5 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`}
        />
      )}
    </button>
  );
}
