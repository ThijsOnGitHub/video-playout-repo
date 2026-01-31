import { createFileRoute } from "@tanstack/react-router";
import fs from "fs";
import { resolveVideoPath, validateVideoPath } from "@/server/helpers/video";
import { getMimeType } from "@/server/helpers/mime";
import { nodeStreamToWebStream } from "@/server/helpers/stream";

export const Route = createFileRoute("/api/video/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          // The splat param contains the path after /api/video/
          const relativePath = params["_splat"] || "";
          const filePath = resolveVideoPath(relativePath);

          console.log(`[Video] Requested path: /api/video/${relativePath}`);
          console.log(`[Video] Resolved file path: ${filePath}`);

          // Security: prevent directory traversal
          if (!validateVideoPath(filePath)) {
            return new Response("Forbidden", { status: 403 });
          }

          // Check if file exists
          if (!fs.existsSync(filePath)) {
            console.error(`[Video] File not found: ${filePath}`);
            return new Response("Not Found", { status: 404 });
          }

          const stat = fs.statSync(filePath);
          const fileSize = stat.size;
          const mimeType = getMimeType(filePath);

          // Handle range requests for video seeking
          const range = request.headers.get("range");

          if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            const fileStream = fs.createReadStream(filePath, { start, end });
            const webStream = nodeStreamToWebStream(fileStream);

            return new Response(webStream, {
              status: 206,
              headers: {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": String(chunkSize),
                "Content-Type": mimeType,
              },
            });
          }

          // Full file response
          const fileStream = fs.createReadStream(filePath);
          const webStream = nodeStreamToWebStream(fileStream);

          return new Response(webStream, {
            status: 200,
            headers: {
              "Content-Length": String(fileSize),
              "Content-Type": mimeType,
              "Accept-Ranges": "bytes",
            },
          });
        } catch (error) {
          console.error("[Video] Error streaming video:", error);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },
  },
});
