import path from "path";

/**
 * Get the base path for video files
 */
export function getVideoBasePath(): string {
  return process.env.VIDEO_BASE_PATH || "./videos";
}

/**
 * Resolve a relative video path to an absolute path
 * Decodes URL-encoded segments and joins with the base path
 */
export function resolveVideoPath(relativePath: string): string {
  const videoBasePath = getVideoBasePath();
  const decodedPath = relativePath
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join(path.sep);
  return path.join(videoBasePath, decodedPath);
}

/**
 * Validate that a file path is within the video base path (prevents directory traversal)
 * Returns the normalized path if valid, null if invalid
 */
export function validateVideoPath(filePath: string): string | null {
  const videoBasePath = getVideoBasePath();
  const normalizedFilePath = path.normalize(filePath);
  const normalizedBasePath = path.normalize(videoBasePath);

  if (!normalizedFilePath.startsWith(normalizedBasePath)) {
    return null;
  }

  return normalizedFilePath;
}
