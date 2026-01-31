import { createContext, useContext, useReducer, useCallback, type ReactNode } from "react";
import type { UploadItem, UploadState, UploadAction } from "@/types/upload";

function generateId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case "ADD_UPLOAD":
      return {
        ...state,
        uploads: [
          ...state.uploads,
          {
            ...action.payload,
            progress: 0,
            status: "pending",
          },
        ],
      };

    case "UPDATE_PROGRESS":
      return {
        ...state,
        uploads: state.uploads.map((upload) =>
          upload.id === action.payload.id
            ? { ...upload, progress: action.payload.progress, status: "uploading" }
            : upload
        ),
      };

    case "SET_STATUS":
      return {
        ...state,
        uploads: state.uploads.map((upload) =>
          upload.id === action.payload.id
            ? { ...upload, status: action.payload.status }
            : upload
        ),
      };

    case "CANCEL_UPLOAD": {
      const upload = state.uploads.find((u) => u.id === action.payload.id);
      if (upload?.xhr) {
        upload.xhr.abort();
      }
      return {
        ...state,
        uploads: state.uploads.map((upload) =>
          upload.id === action.payload.id
            ? { ...upload, status: "cancelled", xhr: null }
            : upload
        ),
      };
    }

    case "REMOVE_UPLOAD":
      return {
        ...state,
        uploads: state.uploads.filter((upload) => upload.id !== action.payload.id),
      };

    case "CLEAR_COMPLETED":
      return {
        ...state,
        uploads: state.uploads.filter(
          (upload) => upload.status !== "done" && upload.status !== "error" && upload.status !== "cancelled"
        ),
      };

    case "SET_EXPANDED":
      return {
        ...state,
        isExpanded: action.payload,
      };

    default:
      return state;
  }
}

interface UploadContextValue {
  uploads: UploadItem[];
  isExpanded: boolean;
  hasActiveUploads: boolean;
  uploadFiles: (files: FileList, folderPath: string, onSuccess?: () => void) => void;
  cancelUpload: (id: string) => void;
  removeUpload: (id: string) => void;
  clearCompleted: () => void;
  setExpanded: (expanded: boolean) => void;
}

const UploadContext = createContext<UploadContextValue | null>(null);

const initialState: UploadState = {
  uploads: [],
  isExpanded: false,
};

export function UploadProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(uploadReducer, initialState);

  const uploadFiles = useCallback((files: FileList, folderPath: string, onSuccess?: () => void) => {
    if (!files || files.length === 0 || !folderPath) return;

    const filesArray = Array.from(files);
    let completedCount = 0;
    const totalFiles = filesArray.length;

    filesArray.forEach((file) => {
      const id = generateId();
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          dispatch({ type: "UPDATE_PROGRESS", payload: { id, progress: percentComplete } });
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          dispatch({ type: "SET_STATUS", payload: { id, status: "done" } });
          completedCount++;
          if (completedCount === totalFiles) {
            onSuccess?.();
          }
        } else {
          dispatch({ type: "SET_STATUS", payload: { id, status: "error" } });
        }
      });

      xhr.addEventListener("error", () => {
        dispatch({ type: "SET_STATUS", payload: { id, status: "error" } });
      });

      xhr.addEventListener("abort", () => {
        dispatch({ type: "SET_STATUS", payload: { id, status: "cancelled" } });
      });

      dispatch({
        type: "ADD_UPLOAD",
        payload: {
          id,
          fileName: file.name,
          fileSize: file.size,
          folderPath,
          xhr,
        },
      });

      xhr.open("POST", "/api/upload");
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      xhr.setRequestHeader("X-Folder-Path", encodeURIComponent(folderPath));
      xhr.setRequestHeader("X-Filename", encodeURIComponent(file.name));
      xhr.send(file);
    });

    // Auto-expand when starting uploads
    dispatch({ type: "SET_EXPANDED", payload: true });
  }, []);

  const cancelUpload = useCallback((id: string) => {
    dispatch({ type: "CANCEL_UPLOAD", payload: { id } });
  }, []);

  const removeUpload = useCallback((id: string) => {
    dispatch({ type: "REMOVE_UPLOAD", payload: { id } });
  }, []);

  const clearCompleted = useCallback(() => {
    dispatch({ type: "CLEAR_COMPLETED" });
  }, []);

  const setExpanded = useCallback((expanded: boolean) => {
    dispatch({ type: "SET_EXPANDED", payload: expanded });
  }, []);

  const hasActiveUploads = state.uploads.some(
    (upload) => upload.status === "pending" || upload.status === "uploading"
  );

  return (
    <UploadContext.Provider
      value={{
        uploads: state.uploads,
        isExpanded: state.isExpanded,
        hasActiveUploads,
        uploadFiles,
        cancelUpload,
        removeUpload,
        clearCompleted,
        setExpanded,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUploadContext() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUploadContext must be used within an UploadProvider");
  }
  return context;
}
