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
import { RAG_CONSTANTS } from "@/lib/rag/constants";
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
  const displayTopK = settings.topK ?? RAG_CONSTANTS.TOP_K.DEFAULT;
  const displayScoreThreshold =
    settings.scoreThreshold ??
    spaceScoreThreshold ??
    RAG_CONSTANTS.SCORE_THRESHOLD.DEFAULT;

  const [topK, setTopK] = useState(displayTopK);
  const [scoreThreshold, setScoreThreshold] = useState(displayScoreThreshold);
  const [open, setOpen] = useState(false);

  // Sync display values when props change (only when dialog closed)
  useEffect(() => {
    if (!open) {
      setTopK(settings.topK ?? RAG_CONSTANTS.TOP_K.DEFAULT);
      setScoreThreshold(
        settings.scoreThreshold ??
          spaceScoreThreshold ??
          RAG_CONSTANTS.SCORE_THRESHOLD.DEFAULT,
      );
    }
  }, [settings, spaceScoreThreshold, open]);

  function handleSave() {
    // Build new settings - only save values that differ from defaults
    const newSettings: RAGSettings = {};
    const defaultScoreThreshold =
      spaceScoreThreshold ?? RAG_CONSTANTS.SCORE_THRESHOLD.DEFAULT;

    // Only save topK if it differs from default
    if (topK !== RAG_CONSTANTS.TOP_K.DEFAULT) {
      newSettings.topK = topK;
    }

    // Only save scoreThreshold if it differs from space default
    if (scoreThreshold !== defaultScoreThreshold) {
      newSettings.scoreThreshold = scoreThreshold;
    }

    onSettingsChange(newSettings);
    setOpen(false);
  }

  function handleReset() {
    // Reset to space defaults by clearing all overrides
    onSettingsChange({});
    setOpen(false);
  }

  function handleCancel() {
    setTopK(displayTopK);
    setScoreThreshold(displayScoreThreshold);
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
              min={RAG_CONSTANTS.TOP_K.MIN}
              max={RAG_CONSTANTS.TOP_K.MAX}
              value={topK}
              onChange={(e) => {
                const value = Number.parseInt(e.target.value, 10);
                if (!Number.isNaN(value)) {
                  setTopK(value);
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              How many document chunks to retrieve ({RAG_CONSTANTS.TOP_K.MIN}-
              {RAG_CONSTANTS.TOP_K.MAX}). Default: {RAG_CONSTANTS.TOP_K.DEFAULT}
            </p>
          </div>

          {/* Score Threshold */}
          <div className="space-y-2">
            <Label htmlFor="scoreThreshold">Minimum Relevance Score</Label>
            <Input
              id="scoreThreshold"
              type="number"
              min={RAG_CONSTANTS.SCORE_THRESHOLD.MIN}
              max={RAG_CONSTANTS.SCORE_THRESHOLD.MAX}
              step={RAG_CONSTANTS.SCORE_THRESHOLD.STEP}
              value={scoreThreshold}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "") return;
                const parsed = Number.parseFloat(value);
                if (!Number.isNaN(parsed)) {
                  setScoreThreshold(parsed);
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Filter by relevance score ({RAG_CONSTANTS.SCORE_THRESHOLD.MIN}-
              {RAG_CONSTANTS.SCORE_THRESHOLD.MAX}). Higher = fewer but more
              relevant results. {RAG_CONSTANTS.SCORE_THRESHOLD.MIN} = no
              filtering. Space default:{" "}
              {spaceScoreThreshold ?? RAG_CONSTANTS.SCORE_THRESHOLD.DEFAULT}
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
