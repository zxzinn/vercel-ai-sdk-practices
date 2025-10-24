"use client";

import { Plus, Tag as TagIcon, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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

interface Tag {
  id: string;
  name: string;
  color: string | null;
  _count?: {
    documents: number;
  };
}

interface TagManagerProps {
  spaceId: string;
  tags: Tag[];
  onTagsChange: () => void;
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
];

export function TagManager({ spaceId, tags, onTagsChange }: TagManagerProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/spaces/${spaceId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: selectedColor,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create tag");
      }

      setNewTagName("");
      setSelectedColor(PRESET_COLORS[0]);
      onTagsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tag");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteTag(tagId: string) {
    if (!confirm("Delete this tag? It will be removed from all documents."))
      return;

    try {
      const response = await fetch(`/api/spaces/${spaceId}/tags/${tagId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete tag");
      }

      onTagsChange();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete tag");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <TagIcon className="mr-2 h-4 w-4" />
          Manage Tags ({tags.length})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
          <DialogDescription>
            Create and manage tags for organizing documents
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <form onSubmit={handleCreateTag} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">New Tag</Label>
              <Input
                id="tag-name"
                placeholder="Tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {error && <div className="text-sm text-destructive">{error}</div>}

            <Button
              type="submit"
              disabled={isCreating || !newTagName.trim()}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              {isCreating ? "Creating..." : "Create Tag"}
            </Button>
          </form>

          {tags.length > 0 && (
            <div className="space-y-2">
              <Label>Existing Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                    style={{
                      backgroundColor: tag.color ? `${tag.color}20` : undefined,
                      borderColor: tag.color || undefined,
                    }}
                  >
                    <span>{tag.name}</span>
                    {tag._count && (
                      <span className="text-xs text-muted-foreground">
                        ({tag._count.documents})
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDeleteTag(tag.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
