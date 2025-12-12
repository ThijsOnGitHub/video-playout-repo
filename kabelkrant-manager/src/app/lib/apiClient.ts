import { FilesWithMetadata } from "../../global/types/FileMetaTypes";
import { VideoItem } from "../../global/types/VideoItem";

// Check if we're running in Electron
const isElectron = typeof window !== "undefined" && window.electronApi !== undefined;

// API Base URL for standalone mode
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

// Type-safe API client that works in both Electron and Web modes
export const apiClient = {
  /**
   * Select a folder
   * In Electron: Opens native dialog
   * In Web: Prompts for path input (or could use File System Access API in modern browsers)
   */
  async selectFolder(): Promise<string> {
    if (isElectron) {
      return window.electronApi.selectFolder();
    } else {
      // In web mode, we can't open a native folder picker
      // This would need to be handled by the UI with a text input
      // or using the File System Access API for modern browsers
      const path = prompt("Enter folder path:");
      if (!path) return "";

      const response = await fetch(`${API_BASE_URL}/api/folder/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        throw new Error("Failed to select folder");
      }

      const data = await response.json();
      return data.path;
    }
  },

  /**
   * Save programs
   */
  async savePrograms(programs: any): Promise<void> {
    if (isElectron) {
      return window.electronApi.savePrograms(JSON.stringify(programs));
    } else {
      const response = await fetch(`${API_BASE_URL}/api/programs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(programs),
      });

      if (!response.ok) {
        throw new Error("Failed to save programs");
      }
    }
  },

  /**
   * Get programs
   */
  async getPrograms(): Promise<string> {
    if (isElectron) {
      return window.electronApi.getPrograms();
    } else {
      const response = await fetch(`${API_BASE_URL}/api/programs`);

      if (!response.ok) {
        throw new Error("Failed to get programs");
      }

      const data = await response.json();
      return JSON.stringify(data);
    }
  },

  /**
   * Get files in a folder
   */
  async getFilesInFolder(path: string): Promise<FilesWithMetadata[]> {
    if (isElectron) {
      return window.electronApi.getFilesInFolder(path);
    } else {
      const response = await fetch(`${API_BASE_URL}/api/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        throw new Error("Failed to get files");
      }

      return response.json();
    }
  },

  /**
   * Check if OBS is running
   */
  async getObsIsRunning(): Promise<boolean> {
    if (isElectron) {
      return window.electronApi.getObsIsRunning();
    } else {
      const response = await fetch(`${API_BASE_URL}/api/obs/status`);

      if (!response.ok) {
        throw new Error("Failed to get OBS status");
      }

      const data = await response.json();
      return data.isRunning;
    }
  },

  /**
   * Get current playlist
   */
  async getPlaylist(): Promise<string[]> {
    if (isElectron) {
      return window.electronApi.getPlaylist();
    } else {
      const response = await fetch(`${API_BASE_URL}/api/playlist`);

      if (!response.ok) {
        throw new Error("Failed to get playlist");
      }

      return response.json();
    }
  },

  /**
   * Play a video item
   */
  async playVideoItem(videoItem: VideoItem): Promise<void> {
    if (isElectron) {
      return window.electronApi.playVideoItem(videoItem);
    } else {
      const response = await fetch(`${API_BASE_URL}/api/playlist/play`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(videoItem),
      });

      if (!response.ok) {
        throw new Error("Failed to play video");
      }
    }
  },

  /**
   * Subscribe to OBS status changes
   * In Electron: Uses IPC events
   * In Web: Uses polling (could be upgraded to WebSocket/SSE)
   */
  onObsStatusChange(callback: (status: boolean) => void): () => void {
    if (isElectron) {
      return window.electronApi.onObsStatusChange(callback);
    } else {
      // Polling-based implementation for web mode
      const interval = setInterval(async () => {
        try {
          const status = await this.getObsIsRunning();
          callback(status);
        } catch (error) {
          console.error("Failed to check OBS status:", error);
        }
      }, 5000); // Poll every 5 seconds

      // Return cleanup function
      return () => clearInterval(interval);
    }
  },

  /**
   * Check if running in Electron mode
   */
  isElectronMode(): boolean {
    return isElectron;
  },
};
