import { Loader2, X } from "lucide-react";

export interface UploadProgressState {
  fileName: string;
  progress: number; // 0-100
  status: "uploading" | "done" | "error";
  currentFile: number;
  totalFiles: number;
}

export interface UploadProgressProps {
  progress: UploadProgressState;
}

export function UploadProgress({ progress }: UploadProgressProps) {
  return (
    <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        {progress.status === "uploading" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        {progress.status === "done" && (
          <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {progress.status === "error" && (
          <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
            <X className="h-3 w-3 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {progress.status === "uploading" && "Uploaden..."}
            {progress.status === "done" && "Voltooid!"}
            {progress.status === "error" && "Fout bij uploaden"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {progress.fileName}
            {progress.totalFiles > 1 && (
              <span className="ml-2">
                ({progress.currentFile} van {progress.totalFiles})
              </span>
            )}
          </p>
        </div>
        <span className="text-sm font-medium text-muted-foreground">{progress.progress}%</span>
      </div>
      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out ${progress.status === "error" ? "bg-red-500" : progress.status === "done" ? "bg-green-500" : "bg-primary"}`}
          style={{ width: `${progress.progress}%` }}
        />
      </div>
    </div>
  );
}
