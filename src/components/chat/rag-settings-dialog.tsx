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
}

export function RAGSettingsDialog({
  settings,
  onSettingsChange,
}: RAGSettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<RAGSettings>({
    topK: settings.topK ?? 5,
    scoreThreshold: settings.scoreThreshold ?? 0,
  });
  const [open, setOpen] = useState(false);

  // Sync local settings when props change (e.g., switching spaces)
  useEffect(() => {
    if (!open) {
      setLocalSettings({
        topK: settings.topK ?? 5,
        scoreThreshold: settings.scoreThreshold ?? 0,
      });
    }
  }, [settings, open]);

  function handleSave() {
    onSettingsChange(localSettings);
    setOpen(false);
  }

  function handleCancel() {
    setLocalSettings(settings);
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
            Override Space defaults for this chat session
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
              value={localSettings.topK}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  topK: Number.parseInt(e.target.value, 10) || 5,
                })
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
              value={localSettings.scoreThreshold}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  scoreThreshold: Number.parseFloat(e.target.value) || 0,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Higher values return fewer but more relevant results (0-1). Leave
              at 0 to use Space default.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
