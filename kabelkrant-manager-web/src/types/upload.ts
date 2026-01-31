export type UploadStatus = "pending" | "uploading" | "done" | "error" | "cancelled";

export interface UploadItem {
  id: string;
  fileName: string;
  fileSize: number;
  folderPath: string;
  progress: number;
  status: UploadStatus;
  xhr: XMLHttpRequest | null;
}

export interface UploadState {
  uploads: UploadItem[];
  isExpanded: boolean;
}

export type UploadAction =
  | { type: "ADD_UPLOAD"; payload: Omit<UploadItem, "progress" | "status" | "xhr"> & { xhr: XMLHttpRequest } }
  | { type: "UPDATE_PROGRESS"; payload: { id: string; progress: number } }
  | { type: "SET_STATUS"; payload: { id: string; status: UploadStatus } }
  | { type: "CANCEL_UPLOAD"; payload: { id: string } }
  | { type: "REMOVE_UPLOAD"; payload: { id: string } }
  | { type: "CLEAR_COMPLETED" }
  | { type: "SET_EXPANDED"; payload: boolean };
