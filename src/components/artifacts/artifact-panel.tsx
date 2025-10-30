"use client";

import { CodeIcon, EyeIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { ArtifactSchema } from "@/lib/artifacts/schema";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ArtifactCodeView } from "./artifact-code-view";
import { ArtifactPreview } from "./artifact-preview";

interface ArtifactPanelProps {
  artifact: ArtifactSchema;
  onClose: () => void;
}

export function ArtifactPanel({ artifact, onClose }: ArtifactPanelProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("code");
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);

  // Auto-switch to preview when artifact code is complete
  useEffect(() => {
    if (!hasAutoSwitched && artifact.code && artifact.type && artifact.title) {
      // Check if artifact is fully generated (has substantial code)
      const isComplete = artifact.code.length > 50;

      if (isComplete) {
        // Small delay to let user see the code first
        const timer = setTimeout(() => {
          setActiveTab("preview");
          setHasAutoSwitched(true);
        }, 800);

        return () => clearTimeout(timer);
      }
    }
  }, [artifact.code, artifact.type, artifact.title, hasAutoSwitched]);

  const getArtifactIcon = () => {
    switch (artifact.type) {
      case "code/html":
      case "code/react":
        return "🎨";
      case "code/svg":
        return "🖼️";
      case "code/javascript":
      case "code/typescript":
        return "⚡";
      case "code/python":
        return "🐍";
      case "text/markdown":
        return "📝";
      default:
        return "📄";
    }
  };

  return (
    <div className="absolute md:relative z-10 top-0 left-0 shadow-2xl md:rounded-tl-3xl md:rounded-bl-3xl md:border-l md:border-y bg-background h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-2xl" aria-hidden="true">
            {getArtifactIcon()}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{artifact.title}</h3>
            {artifact.description && (
              <p className="text-xs text-muted-foreground truncate">
                {artifact.description}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="shrink-0"
          aria-label="Close artifact panel"
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "preview" | "code")}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="flex justify-center border-b px-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="code" className="gap-2">
              <CodeIcon className="size-4" />
              Code
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <EyeIcon className="size-4" />
              Preview
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="code" className="h-full m-0">
            <ArtifactCodeView artifact={artifact} />
          </TabsContent>
          <TabsContent value="preview" className="h-full m-0">
            <ArtifactPreview artifact={artifact} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer with reasoning if available */}
      {artifact.reasoning && (
        <div className="border-t p-4 bg-muted/30">
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
              Implementation Details
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              {artifact.reasoning}
            </p>
          </details>
        </div>
      )}
    </div>
  );
}
