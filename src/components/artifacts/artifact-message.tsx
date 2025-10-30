"use client";

import { BoxIcon, CodeIcon, FileTextIcon, ImageIcon } from "lucide-react";
import type { ArtifactSchema } from "@/lib/artifacts/schema";
import { Button } from "../ui/button";

interface ArtifactMessageProps {
  artifact: ArtifactSchema;
  onClick: () => void;
}

export function ArtifactMessage({ artifact, onClick }: ArtifactMessageProps) {
  const getIcon = () => {
    switch (artifact.type) {
      case "code/html":
      case "code/react":
        return <BoxIcon className="size-4" />;
      case "code/svg":
        return <ImageIcon className="size-4" />;
      case "code/javascript":
      case "code/typescript":
      case "code/python":
        return <CodeIcon className="size-4" />;
      case "text/markdown":
      case "text/plain":
        return <FileTextIcon className="size-4" />;
      default:
        return <FileTextIcon className="size-4" />;
    }
  };

  const getTypeLabel = () => {
    switch (artifact.type) {
      case "code/html":
        return "HTML";
      case "code/react":
        return "React Component";
      case "code/svg":
        return "SVG Graphic";
      case "code/javascript":
        return "JavaScript";
      case "code/typescript":
        return "TypeScript";
      case "code/python":
        return "Python";
      case "text/markdown":
        return "Markdown";
      case "text/plain":
        return "Text";
      default:
        return "Artifact";
    }
  };

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="w-full justify-start gap-3 h-auto p-4 hover:bg-accent"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {getIcon()}
      </div>
      <div className="flex flex-col items-start text-left flex-1 min-w-0">
        <span className="font-semibold text-sm truncate w-full">
          {artifact.title}
        </span>
        <span className="text-xs text-muted-foreground">{getTypeLabel()}</span>
        {artifact.description && (
          <span className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {artifact.description}
          </span>
        )}
      </div>
      <div className="text-xs text-muted-foreground shrink-0">
        Click to view →
      </div>
    </Button>
  );
}
