"use client";

import { useState } from "react";
import { Loader } from "@/components/ai-elements/loader";
import { ArtifactPanel } from "@/components/artifacts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useArtifact } from "@/hooks/use-artifact";
import type { ArtifactSchema } from "@/lib/artifacts/schema";

const EXAMPLE_PROMPTS = [
  "Create an interactive color picker with hex/rgb display",
  "Build a simple calculator with React",
  "Generate an SVG logo for a tech company",
  "Create a markdown cheat sheet",
];

export default function ArtifactsDemo() {
  const [prompt, setPrompt] = useState("");
  const [currentArtifact, setCurrentArtifact] = useState<
    ArtifactSchema | undefined
  >();

  const { artifact, generate, isGenerating, stop } = useArtifact({
    model: "openai/gpt-4o",
    onFinish: (artifact) => {
      setCurrentArtifact(artifact);
    },
    onError: (error) => {
      console.error("Artifact error:", error);
      alert(`Error: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim()) return;

    generate([
      {
        role: "user",
        content: prompt,
      },
    ]);
  };

  const handleExampleClick = (examplePrompt: string) => {
    setPrompt(examplePrompt);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Artifacts Demo</h1>
          <p className="text-muted-foreground">
            Generate interactive code artifacts with AI
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Left side - Input */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="artifact-prompt" className="text-sm font-medium">
                What would you like to create?
              </label>
              <Textarea
                id="artifact-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to create..."
                className="min-h-32 resize-none"
                disabled={isGenerating}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader />
                    Generating...
                  </>
                ) : (
                  "Generate Artifact"
                )}
              </Button>
              {isGenerating && (
                <Button variant="destructive" onClick={stop}>
                  Stop
                </Button>
              )}
            </div>

            {/* Example prompts */}
            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium">Try an example:</div>
              <div className="grid gap-2">
                {EXAMPLE_PROMPTS.map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    size="sm"
                    onClick={() => handleExampleClick(example)}
                    disabled={isGenerating}
                    className="justify-start text-left h-auto py-2 px-3"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>

            {/* Status */}
            {isGenerating && (
              <div className="text-sm text-muted-foreground animate-pulse">
                Generating artifact...
              </div>
            )}
          </div>

          {/* Right side - Preview */}
          <div className="border rounded-lg overflow-hidden">
            {(artifact || currentArtifact) &&
            (artifact || currentArtifact)?.type &&
            (artifact || currentArtifact)?.title &&
            (artifact || currentArtifact)?.code ? (
              <ArtifactPanel
                artifact={
                  (artifact ||
                    currentArtifact) as import("@/lib/artifacts/schema").ArtifactSchema
                }
                onClose={() => {
                  setCurrentArtifact(undefined);
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-medium mb-2">No artifact yet</p>
                  <p className="text-sm">
                    Enter a prompt and click Generate to create an artifact
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
