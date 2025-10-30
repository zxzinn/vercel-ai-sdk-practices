"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import type { CoreMessage } from "ai";
import { useState } from "react";
import type { ArtifactSchema } from "@/lib/artifacts/schema";
import { artifactSchema } from "@/lib/artifacts/schema";

interface UseArtifactOptions {
  model: string;
  onFinish?: (artifact: ArtifactSchema) => void;
  onError?: (error: Error) => void;
}

export function useArtifact({ model, onFinish, onError }: UseArtifactOptions) {
  const [currentArtifact, setCurrentArtifact] = useState<
    ArtifactSchema | undefined
  >();

  const { object, submit, isLoading, stop, error } = useObject({
    api: "/api/chat/artifacts",
    schema: artifactSchema,
    onFinish: ({ object: artifact }) => {
      if (artifact) {
        setCurrentArtifact(artifact);
        onFinish?.(artifact);
      }
    },
    onError: (err) => {
      console.error("Artifact generation error:", err);
      onError?.(err);
    },
  });

  const generate = (messages: CoreMessage[]) => {
    submit({
      messages,
      model,
    });
  };

  const clearArtifact = () => {
    setCurrentArtifact(undefined);
  };

  return {
    artifact: object || currentArtifact,
    generate,
    isGenerating: isLoading,
    stop,
    error,
    clearArtifact,
  };
}
