"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { ProviderIcon } from "@/components/ui/provider-icon";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface Props {
  value: string;
  dimension: number;
  onValueChange: (modelId: string, defaultDim: number) => void;
  onDimensionChange: (dim: number) => void;
}

export function EmbeddingModelSelector({
  value,
  dimension,
  onValueChange,
  onDimensionChange,
}: Props) {
  const [models, setModels] = useState<EmbeddingModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/embedding-models")
      .then((res) => res.json())
      .then((data) => {
        setModels(data.models);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch embedding models:", error);
        setLoading(false);
      });
  }, []);

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

  // Get current model for dimension selector
  const currentModel = models.find((m) => m.id === value);

  // Provider display names
  const providerNames: Record<string, string> = {
    openai: "OpenAI",
    cohere: "Cohere",
    google: "Google",
    voyage: "Voyage AI",
    mistral: "Mistral AI",
  };

  return (
    <div className="space-y-4">
      {/* Model Selector */}
      <div className="space-y-2">
        <Label htmlFor="embedding-model">Embedding Model</Label>
        <Select
          value={value}
          onValueChange={(modelId) => {
            const model = models.find((m) => m.id === modelId);
            if (model) {
              onValueChange(modelId, model.defaultDim);
              // Auto-select default dimension
              onDimensionChange(model.defaultDim);
            }
          }}
          disabled={loading}
        >
          <SelectTrigger id="embedding-model">
            <SelectValue placeholder="Select embedding model">
              {currentModel && (
                <div className="flex items-center gap-2">
                  <ProviderIcon provider={currentModel.provider} size={16} />
                  <span>{currentModel.name}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(groupedModels).map(([provider, providerModels]) => (
              <SelectGroup key={provider}>
                <SelectLabel className="text-muted-foreground flex items-center gap-2">
                  <ProviderIcon provider={provider} size={14} />
                  {providerNames[provider] || provider.toUpperCase()}
                </SelectLabel>
                {providerModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2 py-1">
                      <ProviderIcon provider={provider} size={16} />
                      <div className="flex flex-col">
                        <span className="font-medium">{model.name}</span>
                        {model.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {model.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {/* Model details */}
        {currentModel && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            {currentModel.description && (
              <p className="line-clamp-2">{currentModel.description}</p>
            )}
            <div className="flex gap-3">
              <span>Max: {currentModel.maxTokens.toLocaleString()} tokens</span>
              {currentModel.costPer1M && (
                <span>${currentModel.costPer1M}/1M tokens</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dimension Selector (only show if model supports multiple dimensions) */}
      {currentModel && currentModel.dimensions.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="dimension">Embedding Dimension</Label>
          <Select
            value={dimension.toString()}
            onValueChange={(v) => onDimensionChange(Number(v))}
          >
            <SelectTrigger id="dimension">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currentModel.dimensions.map((dim) => (
                <SelectItem key={dim} value={dim.toString()}>
                  <div className="flex items-center justify-between gap-4">
                    <span>{dim} dimensions</span>
                    {dim === currentModel.defaultDim && (
                      <span className="text-xs text-muted-foreground">
                        (recommended)
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Higher = better quality, more storage
          </p>
        </div>
      )}

      {/* Info display for single-dimension models */}
      {currentModel && currentModel.dimensions.length === 1 && (
        <div className="text-xs text-muted-foreground">
          Dimension: {currentModel.dimensions[0]} (fixed)
        </div>
      )}
    </div>
  );
}
