"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProviderIcon } from "@/components/ui/provider-icon";

const vectorDatabases = [
  { id: "milvus", name: "Milvus / Zilliz Cloud" },
  { id: "pinecone", name: "Pinecone" },
  { id: "qdrant", name: "Qdrant" },
  { id: "weaviate", name: "Weaviate" },
  { id: "chroma", name: "ChromaDB" },
];

const embeddingProviders = [
  { id: "openai", name: "OpenAI" },
  { id: "cohere", name: "Cohere" },
  { id: "voyage", name: "Voyage AI" },
  { id: "google", name: "Google Gemini" },
  { id: "mistral", name: "Mistral AI" },
];

const llmProviders = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic (Claude)" },
  { id: "google", name: "Google (Gemini)" },
  { id: "mistral", name: "Mistral AI" },
  { id: "cohere", name: "Cohere" },
  { id: "meta", name: "Meta (Llama)" },
  { id: "amazon", name: "Amazon (Bedrock)" },
  { id: "alibaba", name: "Alibaba (Qwen)" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "perplexity", name: "Perplexity" },
  { id: "xai", name: "xAI (Grok)" },
];

const sizes = [16, 24, 32, 48, 64];

export default function ProviderIconsPage() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Vector Databases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {vectorDatabases.map((provider) => (
            <div key={provider.id} className="flex items-center gap-4">
              <div className="w-48 font-medium">{provider.name}</div>
              <div className="flex items-center gap-6">
                {sizes.map((size) => (
                  <div
                    key={size}
                    className="flex flex-col items-center gap-2 p-2 border rounded"
                  >
                    <ProviderIcon provider={provider.id} size={size} />
                    <Badge variant="secondary" className="text-xs">
                      {size}px
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Embedding Providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {embeddingProviders.map((provider) => (
            <div key={provider.id} className="flex items-center gap-4">
              <div className="w-48 font-medium">{provider.name}</div>
              <div className="flex items-center gap-6">
                {sizes.map((size) => (
                  <div
                    key={size}
                    className="flex flex-col items-center gap-2 p-2 border rounded"
                  >
                    <ProviderIcon provider={provider.id} size={size} />
                    <Badge variant="secondary" className="text-xs">
                      {size}px
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LLM Providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {llmProviders.map((provider) => (
            <div key={provider.id} className="flex items-center gap-4">
              <div className="w-48 font-medium">{provider.name}</div>
              <div className="flex items-center gap-6">
                {sizes.map((size) => (
                  <div
                    key={size}
                    className="flex flex-col items-center gap-2 p-2 border rounded"
                  >
                    <ProviderIcon provider={provider.id} size={size} />
                    <Badge variant="secondary" className="text-xs">
                      {size}px
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
