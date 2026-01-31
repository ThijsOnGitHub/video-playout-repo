import { Loader2, Check, X, AlertCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UploadItem } from "@/types/upload";

interface UploadItemRowProps {
  upload: UploadItem;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getProgramName(folderPath: string): string {
  // Extract the program name from the folder path (last segment)
  const segments = folderPath.split("/").filter(Boolean);
  return segments[segments.length - 1] || folderPath;
}

export function UploadItemRow({ upload, onCancel, onRemove }: UploadItemRowProps) {
  const isActive = upload.status === "pending" || upload.status === "uploading";
  const programName = getProgramName(upload.folderPath);

  return (
    <div className="flex items-center gap-2 py-2 px-3 border-b last:border-b-0">
      {/* Status Icon */}
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {upload.status === "pending" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {upload.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {upload.status === "done" && <Check className="h-4 w-4 text-green-500" />}
        {upload.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
        {upload.status === "cancelled" && <Ban className="h-4 w-4 text-muted-foreground" />}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" title={upload.fileName}>
          {upload.fileName}
        </p>
        <p className="text-xs text-muted-foreground truncate" title={upload.folderPath}>
          {programName} · {formatFileSize(upload.fileSize)}
        </p>
      </div>

      {/* Progress */}
      {isActive && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${upload.progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-8 text-right">
            {upload.progress}%
          </span>
        </div>
      )}

      {/* Status text for finished items */}
      {upload.status === "done" && (
        <span className="text-xs text-green-600 flex-shrink-0">Voltooid</span>
      )}
      {upload.status === "error" && (
        <span className="text-xs text-red-500 flex-shrink-0">Fout</span>
      )}
      {upload.status === "cancelled" && (
        <span className="text-xs text-muted-foreground flex-shrink-0">Geannuleerd</span>
      )}

      {/* Action Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0"
        onClick={() => isActive ? onCancel(upload.id) : onRemove(upload.id)}
        title={isActive ? "Annuleren" : "Verwijderen"}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
