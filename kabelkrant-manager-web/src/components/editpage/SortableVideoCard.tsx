import { FileVideo, GripVertical, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { FilesWithMetadata, VideoFile } from "@/lib/types/FileMetaTypes";
import { formatDuration } from "@/lib/formatDuration";

export interface SortableVideoCardProps {
  file: FilesWithMetadata;
  onDelete: (fileName: string) => void;
  isDeleting: boolean;
}

export function SortableVideoCard({ file, onDelete, isDeleting }: SortableVideoCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: file.name,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isVideo = file.type === "video";
  const duration = isVideo ? ((file as VideoFile).duration ?? 0) * 1000 : 0;

  return (
    <Card ref={setNodeRef} style={style} className={`overflow-hidden hover:shadow-lg transition-shadow ${isDragging ? "z-50 shadow-xl" : ""}`}>
      <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative">
        {/* Drag handle */}
        <div {...attributes} {...listeners} className="absolute top-2 left-2 p-1 bg-black/50 rounded cursor-grab active:cursor-grabbing hover:bg-black/70 transition-colors">
          <GripVertical className="h-4 w-4 text-white" />
        </div>
        {/* Delete button */}
        <button onClick={() => onDelete(file.name)} disabled={isDeleting} className="absolute top-2 right-2 p-1 bg-red-500/80 rounded hover:bg-red-600 transition-colors disabled:opacity-50">
          <X className="h-4 w-4 text-white" />
        </button>
        <FileVideo className="h-12 w-12 text-gray-400" />
        {isVideo && duration > 0 && <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">{formatDuration(duration)}</div>}
      </div>
      <CardContent className="p-3">
        <p className="text-sm font-medium truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{file.extension.toUpperCase()}</p>
      </CardContent>
    </Card>
  );
}
