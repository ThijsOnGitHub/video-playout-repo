import { useState, useRef, useCallback } from "react";
import type { UploadProgressState } from "@/components/editpage/UploadProgress";

interface UseVideoUploadOptions {
  folderPath: string | undefined;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseVideoUploadReturn {
  isUploading: boolean;
  uploadProgress: UploadProgressState | null;
  uploadFiles: (files: FileList) => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Upload a single file using XMLHttpRequest for progress tracking.
 * Uses raw binary body with metadata in headers for memory-efficient streaming.
 */
function uploadFileWithProgress(file: File, folderPath: string, onProgress: (progress: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed"));
    });

    xhr.open("POST", "/api/upload");
    // Send metadata in headers, file as raw binary body
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.setRequestHeader("X-Folder-Path", encodeURIComponent(folderPath));
    xhr.setRequestHeader("X-Filename", encodeURIComponent(file.name));
    xhr.send(file);
  });
}

export function useVideoUpload({ folderPath, onSuccess, onError }: UseVideoUploadOptions): UseVideoUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: FileList) => {
      if (!files || files.length === 0 || !folderPath) return;

      const filesArray = Array.from(files);
      const totalFiles = filesArray.length;

      setIsUploading(true);

      try {
        for (let i = 0; i < filesArray.length; i++) {
          const file = filesArray[i];

          // Update progress: starting upload
          setUploadProgress({
            fileName: file.name,
            progress: 0,
            status: "uploading",
            currentFile: i + 1,
            totalFiles,
          });

          // Upload file with real progress tracking
          await uploadFileWithProgress(file, folderPath, (progress) => {
            setUploadProgress((prev) => (prev ? { ...prev, progress } : null));
          });

          // Update progress: upload done
          setUploadProgress({
            fileName: file.name,
            progress: 100,
            status: "done",
            currentFile: i + 1,
            totalFiles,
          });
        }

        onSuccess?.();
      } catch (e) {
        console.error("Error uploading video", e);
        setUploadProgress((prev) => (prev ? { ...prev, status: "error" } : null));
        onError?.(e instanceof Error ? e : new Error("Upload failed"));
      } finally {
        setIsUploading(false);
        // Clear progress after a short delay
        setTimeout(() => setUploadProgress(null), 2000);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [folderPath, onSuccess, onError]
  );

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files) {
        uploadFiles(files);
      }
    },
    [uploadFiles]
  );

  return {
    isUploading,
    uploadProgress,
    uploadFiles,
    fileInputRef,
    handleFileInputChange,
  };
}
