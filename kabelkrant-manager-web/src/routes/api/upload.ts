import { createFileRoute } from "@tanstack/react-router";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { getVideoBasePath, validateVideoPath } from "@/server/helpers/video";

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Folder-Path, X-Filename",
            "Access-Control-Max-Age": "86400",
          },
        });
      },
      POST: async ({ request }) => {
        console.log("[Upload] Request received");
        try {
          const contentType = request.headers.get("content-type") || "";
          console.log("[Upload] Content-Type:", contentType);
          console.log("[Upload] X-Folder-Path:", request.headers.get("x-folder-path"));
          console.log("[Upload] X-Filename:", request.headers.get("x-filename"));

          if (!contentType.includes("application/octet-stream")) {
            return Response.json({ error: "Content-Type must be application/octet-stream" }, { status: 400 });
          }

          const folderPath = decodeURIComponent(request.headers.get("x-folder-path") || "");
          const originalFilename = decodeURIComponent(request.headers.get("x-filename") || "");

          if (!folderPath || !originalFilename || !request.body) {
            return Response.json(
              { error: "Missing required headers (X-Folder-Path, X-Filename) or body" },
              { status: 400 }
            );
          }

          const videoBasePath = getVideoBasePath();
          const absolutePath = path.isAbsolute(folderPath) ? folderPath : path.join(videoBasePath, folderPath);

          // Security: Prevent directory traversal
          if (!validateVideoPath(absolutePath)) {
            return Response.json({ error: "Invalid path" }, { status: 403 });
          }

          // Ensure the directory exists
          if (!fs.existsSync(absolutePath)) {
            fs.mkdirSync(absolutePath, { recursive: true });
          }

          // Get existing files to determine the next number
          const existingFiles = fs.readdirSync(absolutePath);
          let maxNumber = 0;
          for (const existingFile of existingFiles) {
            const match = existingFile.match(/^(\d+)[_\-\s]/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNumber) {
                maxNumber = num;
              }
            }
          }

          // Clean the filename and add numeric prefix
          const cleanFileName = originalFilename.replace(/^\d+[_\-\s]+/, "");
          const paddedIndex = String(maxNumber + 1).padStart(2, "0");
          const newFileName = `${paddedIndex}_${cleanFileName}`;
          const filePath = path.join(absolutePath, newFileName);

          // Stream request body directly to disk (memory efficient)
          const writeStream = fs.createWriteStream(filePath);
          const readable = Readable.fromWeb(request.body as import("stream/web").ReadableStream);

          await new Promise<void>((resolve, reject) => {
            readable.pipe(writeStream);
            writeStream.on("finish", resolve);
            writeStream.on("error", reject);
            readable.on("error", reject);
          });

          const fileSize = parseInt(request.headers.get("content-length") || "0", 10);

          console.log(`[Upload] File saved: ${filePath} (${fileSize} bytes)`);

          return Response.json({
            success: true,
            fileName: newFileName,
            size: fileSize,
          });
        } catch (error) {
          console.error("[Upload] Error:", error);
          return Response.json({ error: "Upload failed" }, { status: 500 });
        }
      },
    },
  },
});
