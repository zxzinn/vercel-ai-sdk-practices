import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  DownloadIcon,
  FileTextIcon,
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

interface DraggableFileProps {
  file: {
    filePath: string;
    fileName: string;
    size: number;
    createdAt: string;
    downloadUrl: string | null;
  };
  documentId: string;
  movingFile: string | null;
  formatFileSize: (bytes: number) => string;
  formatDate: (date: string) => string;
  onDeleteFile: (filePath: string, documentId: string) => void;
}

export function DraggableFile({
  file,
  documentId,
  movingFile,
  formatFileSize,
  formatDate,
  onDeleteFile,
}: DraggableFileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: file.filePath,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 border-b last:border-b-0 hover:bg-accent/50 items-center"
    >
      <div
        {...listeners}
        {...attributes}
        className="flex items-center gap-2 min-w-0 pl-6 cursor-move"
      >
        <FileTextIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="truncate text-sm">{file.fileName}</span>
      </div>
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {formatFileSize(file.size)}
      </div>
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {formatDate(file.createdAt)}
      </div>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={movingFile === file.filePath}
            >
              {movingFile === file.filePath ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontalIcon className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {file.downloadUrl && (
              <DropdownMenuItem asChild>
                <a
                  href={file.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onDeleteFile(file.filePath, documentId)}
              className="text-destructive"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete File
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
