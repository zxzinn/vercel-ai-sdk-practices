"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import type { ArtifactSchema } from "@/lib/artifacts/schema";
import { Button } from "../ui/button";

interface ArtifactCodeViewProps {
  artifact: ArtifactSchema;
}

export function ArtifactCodeView({ artifact }: ArtifactCodeViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <div className="relative h-full overflow-auto bg-muted/30">
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 gap-2"
        >
          {copied ? (
            <>
              <CheckIcon className="size-4" />
              <span className="text-xs">Copied!</span>
            </>
          ) : (
            <>
              <CopyIcon className="size-4" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
      </div>
      <pre className="p-6 text-sm font-mono overflow-x-auto">
        <code>{artifact.code}</code>
      </pre>
    </div>
  );
}
