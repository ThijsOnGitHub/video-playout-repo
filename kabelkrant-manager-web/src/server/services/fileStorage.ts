import fs from "fs";
import path from "path";
import type { VideoItems } from "@/lib/types/VideoItem";
import type { FilesWithMetadata, VideoFile } from "@/lib/types/FileMetaTypes";
import type { PlayoutSettings } from "@/lib/types/PlayoutSettings";
import { DEFAULT_PLAYOUT_SETTINGS } from "@/lib/types/PlayoutSettings";

const VIDEO_EXTENSIONS = [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm"];

export class FileStorage {
  private readonly basePath: string;
  private readonly settingsPath: string;
  private readonly hasPlayedPath: string;
  private readonly playoutSettingsPath: string;

  constructor() {
    // Use environment variable or default to ./data
    this.basePath = process.env.DATA_PATH || "./data";
    this.settingsPath = path.join(this.basePath, "settings.json");
    this.hasPlayedPath = path.join(this.basePath, "hasPlayed.json");
    this.playoutSettingsPath = path.join(this.basePath, "playoutSettings.json");

    // Ensure data directory exists
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }

    // Initialize files if they don't exist
    if (!fs.existsSync(this.settingsPath)) {
      fs.writeFileSync(this.settingsPath, JSON.stringify([]));
    }
    if (!fs.existsSync(this.hasPlayedPath)) {
      fs.writeFileSync(this.hasPlayedPath, JSON.stringify({}));
    }
    if (!fs.existsSync(this.playoutSettingsPath)) {
      fs.writeFileSync(this.playoutSettingsPath, JSON.stringify(DEFAULT_PLAYOUT_SETTINGS, null, 2));
    }
  }

  getPlayoutSettings(): PlayoutSettings {
    const json = fs.readFileSync(this.playoutSettingsPath, "utf-8");
    return { ...DEFAULT_PLAYOUT_SETTINGS, ...JSON.parse(json) };
  }

  savePlayoutSettings(settings: PlayoutSettings): void {
    fs.writeFileSync(this.playoutSettingsPath, JSON.stringify(settings, null, 2));
  }

  getPrograms(): VideoItems {
    const json = fs.readFileSync(this.settingsPath, "utf-8");
    return JSON.parse(json);
  }

  savePrograms(programs: VideoItems): void {
    fs.writeFileSync(this.settingsPath, JSON.stringify(programs, null, 2));
  }

  getHasPlayed(): Record<string, Date> {
    const json = fs.readFileSync(this.hasPlayedPath, "utf-8");
    return JSON.parse(json);
  }

  writePlay(filePath: string): void {
    const data = this.getHasPlayed();
    data[filePath] = new Date();
    fs.writeFileSync(this.hasPlayedPath, JSON.stringify(data, null, 2));
  }

  async getFilesInFolder(folderPath: string): Promise<FilesWithMetadata[]> {
    const videoBasePath = process.env.VIDEO_BASE_PATH || "/videos";

    // If it's a relative path, join with VIDEO_BASE_PATH
    const absolutePath = path.isAbsolute(folderPath) ? folderPath : path.join(videoBasePath, folderPath);

    if (!fs.existsSync(absolutePath)) {
      console.log(`Path does not exist: ${absolutePath}`);
      return [];
    }

    const files = fs.readdirSync(absolutePath);
    const result: FilesWithMetadata[] = [];

    for (const file of files) {
      const filePath = path.join(absolutePath, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile()) {
        const extension = path.extname(file).toLowerCase();
        const isVideo = VIDEO_EXTENSIONS.includes(extension);

        if (isVideo) {
          let duration: number | undefined;
          try {
            // Try to get video duration using get-video-duration
            const { getVideoDurationInSeconds } = await import("get-video-duration");
            duration = await getVideoDurationInSeconds(filePath);
          } catch (e) {
            console.error("Error getting video duration", e);
          }

          const videoFile: VideoFile = {
            name: file,
            path: filePath,
            type: "video",
            extension,
            duration,
          };
          result.push(videoFile);
        } else {
          result.push({
            name: file,
            path: filePath,
            type: "file",
            extension,
          });
        }
      }
    }

    return result;
  }

  browseDirectory(relativePath: string = ""): { name: string; isDirectory: boolean; path: string }[] {
    const videoBasePath = process.env.VIDEO_BASE_PATH || "/videos";
    const targetPath = path.join(videoBasePath, relativePath);

    // Security: Prevent directory traversal
    const normalizedTarget = path.normalize(targetPath);
    const normalizedBase = path.normalize(videoBasePath);
    if (!normalizedTarget.startsWith(normalizedBase)) {
      throw new Error("Invalid path");
    }

    if (!fs.existsSync(targetPath)) {
      return [];
    }

    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(relativePath, entry.name),
    }));
  }

  /**
   * Delete a video file from a folder
   */
  deleteVideo(folderPath: string, fileName: string): boolean {
    const videoBasePath = process.env.VIDEO_BASE_PATH || "/videos";
    const absolutePath = path.isAbsolute(folderPath) ? folderPath : path.join(videoBasePath, folderPath);
    const filePath = path.join(absolutePath, fileName);

    // Security: Prevent directory traversal
    const normalizedFilePath = path.normalize(filePath);
    const normalizedBase = path.normalize(videoBasePath);
    if (!normalizedFilePath.startsWith(normalizedBase)) {
      throw new Error("Invalid path");
    }

    if (!fs.existsSync(filePath)) {
      throw new Error("File not found");
    }

    fs.unlinkSync(filePath);
    return true;
  }

  /**
   * Reorder videos by renaming them with numeric prefixes
   */
  reorderVideos(folderPath: string, orderedFileNames: string[]): boolean {
    const videoBasePath = process.env.VIDEO_BASE_PATH || "/videos";
    const absolutePath = path.isAbsolute(folderPath) ? folderPath : path.join(videoBasePath, folderPath);

    // Security: Prevent directory traversal
    const normalizedPath = path.normalize(absolutePath);
    const normalizedBase = path.normalize(videoBasePath);
    if (!normalizedPath.startsWith(normalizedBase)) {
      throw new Error("Invalid path");
    }

    if (!fs.existsSync(absolutePath)) {
      throw new Error("Folder not found");
    }

    // First, rename all files to temporary names to avoid conflicts
    const tempNames: { original: string; temp: string }[] = [];
    for (let i = 0; i < orderedFileNames.length; i++) {
      const fileName = orderedFileNames[i];
      const filePath = path.join(absolutePath, fileName);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${fileName}`);
      }

      const tempName = `__temp_${Date.now()}_${i}_${fileName}`;
      const tempPath = path.join(absolutePath, tempName);
      fs.renameSync(filePath, tempPath);
      tempNames.push({ original: fileName, temp: tempName });
    }

    // Then rename to final names with numeric prefixes
    for (let i = 0; i < tempNames.length; i++) {
      const { original, temp } = tempNames[i];
      const tempPath = path.join(absolutePath, temp);

      // Remove existing numeric prefix if present (e.g., "01_" or "1_")
      const nameWithoutPrefix = original.replace(/^\d+[_\-\s]+/, "");

      // Add new numeric prefix with zero padding
      const paddedIndex = String(i + 1).padStart(2, "0");
      const newName = `${paddedIndex}_${nameWithoutPrefix}`;
      const newPath = path.join(absolutePath, newName);

      fs.renameSync(tempPath, newPath);
    }

    return true;
  }

  /**
   * Save uploaded video file to a folder
   */
  async saveUploadedVideo(folderPath: string, fileName: string, fileData: Buffer): Promise<string> {
    const videoBasePath = process.env.VIDEO_BASE_PATH || "/videos";
    const absolutePath = path.isAbsolute(folderPath) ? folderPath : path.join(videoBasePath, folderPath);

    // Security: Prevent directory traversal
    const normalizedPath = path.normalize(absolutePath);
    const normalizedBase = path.normalize(videoBasePath);
    if (!normalizedPath.startsWith(normalizedBase)) {
      throw new Error("Invalid path");
    }

    // Ensure the directory exists
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true });
    }

    // Get existing files to determine the next number
    const existingFiles = fs.readdirSync(absolutePath);
    let maxNumber = 0;
    for (const file of existingFiles) {
      const match = file.match(/^(\d+)[_\-\s]/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    // Clean the filename and add numeric prefix
    const cleanFileName = fileName.replace(/^\d+[_\-\s]+/, ""); // Remove existing prefix
    const paddedIndex = String(maxNumber + 1).padStart(2, "0");
    const newFileName = `${paddedIndex}_${cleanFileName}`;
    const filePath = path.join(absolutePath, newFileName);

    // Write the file
    fs.writeFileSync(filePath, fileData);

    return newFileName;
  }
}

// Singleton instance
let fileStorageInstance: FileStorage | null = null;

export function getFileStorage(): FileStorage {
  if (!fileStorageInstance) {
    fileStorageInstance = new FileStorage();
  }
  return fileStorageInstance;
}
