"use client";

import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RAGSettings } from "@/types/rag";

interface RAGSettingsDialogProps {
  settings: RAGSettings;
  onSettingsChange: (settings: RAGSettings) => void;
  spaceScoreThreshold?: number;
}

export function RAGSettingsDialog({
  settings,
  onSettingsChange,
  spaceScoreThreshold,
}: RAGSettingsDialogProps) {
  // For display purposes, use defaults when undefined
  const displayTopK = settings.topK ?? 5;
  const displayScoreThreshold =
    settings.scoreThreshold ?? spaceScoreThreshold ?? 0.3;

  const [topK, setTopK] = useState(displayTopK);
  const [scoreThreshold, setScoreThreshold] = useState(displayScoreThreshold);
  const [topKChanged, setTopKChanged] = useState(false);
  const [scoreThresholdChanged, setScoreThresholdChanged] = useState(false);
  const [open, setOpen] = useState(false);

  // Sync display values when props change (only when dialog closed)
  useEffect(() => {
    if (!open) {
      setTopK(settings.topK ?? 5);
      setScoreThreshold(settings.scoreThreshold ?? spaceScoreThreshold ?? 0.3);
      setTopKChanged(false);
      setScoreThresholdChanged(false);
    }
  }, [settings, spaceScoreThreshold, open]);

  function handleTopKChange(value: number) {
    setTopK(value);
    setTopKChanged(true);
  }

  function handleScoreThresholdChange(value: number) {
    setScoreThreshold(value);
    setScoreThresholdChanged(true);
  }

  function handleSave() {
    // Build new settings - only include changed values or already-set values
    const newSettings: RAGSettings = {};
    const defaultScoreThreshold = spaceScoreThreshold ?? 0.3;

    if (topKChanged || settings.topK !== undefined) {
      newSettings.topK = topK;
    }

    // Save if changed OR already set OR differs from space default
    if (
      scoreThresholdChanged ||
      settings.scoreThreshold !== undefined ||
      scoreThreshold !== defaultScoreThreshold
    ) {
      newSettings.scoreThreshold = scoreThreshold;
    }

    onSettingsChange(newSettings);
    setOpen(false);
  }

  function handleReset() {
    setTopK(5);
    setScoreThreshold(spaceScoreThreshold ?? 0.3);
    setTopKChanged(false);
    setScoreThresholdChanged(false);
  }

  function handleCancel() {
    setTopK(displayTopK);
    setScoreThreshold(displayScoreThreshold);
    setTopKChanged(false);
    setScoreThresholdChanged(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="RAG Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>RAG Search Settings</DialogTitle>
          <DialogDescription>
            Override Space defaults for this session. Values shown are Space
            defaults when not overridden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Top K */}
          <div className="space-y-2">
            <Label htmlFor="topK">Number of Results</Label>
            <Input
              id="topK"
              type="number"
              min={1}
              max={20}
              value={topK}
              onChange={(e) =>
                handleTopKChange(Number.parseInt(e.target.value, 10) || 5)
              }
            />
            <p className="text-xs text-muted-foreground">
              How many document chunks to retrieve (1-20). Default: 5
            </p>
          </div>

          {/* Score Threshold */}
          <div className="space-y-2">
            <Label htmlFor="scoreThreshold">Minimum Relevance Score</Label>
            <Input
              id="scoreThreshold"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={scoreThreshold}
              onChange={(e) =>
                handleScoreThresholdChange(
                  Number.parseFloat(e.target.value) || 0,
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Filter by relevance score (0-1). Higher = fewer but more relevant
              results. 0 = no filtering. Space default:{" "}
              {spaceScoreThreshold ?? 0.3}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Reset to Space Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Settings</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
