import { useDroppable } from "@dnd-kit/core";
import {
  FolderIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  TrashIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DroppableFolderProps {
  documentId: string;
  fileCount: number;
  deletingId: string | null;
  onDeleteFolder: (documentId: string) => void;
}

export function DroppableFolder({
  documentId,
  fileCount,
  deletingId,
  onDeleteFolder,
}: DroppableFolderProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: documentId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center justify-between px-4 py-2 bg-muted/30 border-b transition-colors ${
        isOver ? "bg-primary/20" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <FolderIcon className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-sm">{documentId}</span>
        <span className="text-xs text-muted-foreground">({fileCount})</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            {deletingId === documentId ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontalIcon className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => onDeleteFolder(documentId)}
            className="text-destructive"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete Folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
