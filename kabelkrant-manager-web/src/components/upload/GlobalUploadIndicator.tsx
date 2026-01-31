import { Upload, ChevronUp, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUploadContext } from "@/contexts/UploadContext";
import { UploadItemRow } from "./UploadItemRow";

export function GlobalUploadIndicator() {
  const {
    uploads,
    isExpanded,
    hasActiveUploads,
    cancelUpload,
    removeUpload,
    clearCompleted,
    setExpanded,
  } = useUploadContext();

  // Don't render if no uploads
  if (uploads.length === 0) {
    return null;
  }

  const activeUploads = uploads.filter(
    (u) => u.status === "pending" || u.status === "uploading"
  );
  const completedUploads = uploads.filter(
    (u) => u.status === "done" || u.status === "error" || u.status === "cancelled"
  );

  // Calculate overall progress for collapsed view
  const overallProgress =
    activeUploads.length > 0
      ? Math.round(
          activeUploads.reduce((sum, u) => sum + u.progress, 0) / activeUploads.length
        )
      : 100;

  const uploadCountText = hasActiveUploads
    ? `${activeUploads.length} upload${activeUploads.length !== 1 ? "s" : ""}`
    : `${uploads.length} voltooid`;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isExpanded ? (
        // Expanded view
        <Card className="w-80 shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
            <span className="text-sm font-medium">
              Uploads {hasActiveUploads && `(${activeUploads.length} actief)`}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={clearCompleted}
              >
                Sluiten
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setExpanded(false)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Upload List */}
          <div className="max-h-64 overflow-y-auto">
            {uploads.map((upload) => (
              <UploadItemRow
                key={upload.id}
                upload={upload}
                onCancel={cancelUpload}
                onRemove={removeUpload}
              />
            ))}
          </div>
        </Card>
      ) : (
        // Collapsed view
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            className="shadow-lg bg-background h-10 px-3 gap-2"
            onClick={() => setExpanded(true)}
          >
            <Upload className="h-4 w-4" />
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${hasActiveUploads ? "bg-primary" : "bg-green-500"}`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="text-xs">{uploadCountText}</span>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="shadow-lg bg-background h-10 w-10"
            onClick={clearCompleted}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
