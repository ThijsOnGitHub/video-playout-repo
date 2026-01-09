import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { type BrowserPlayoutEvent, type AdminStatusEvent, type BrowserPlayout } from "./services/browserPlayout";
import { getServices } from "./init";

const execAsync = promisify(exec);

// Helper to get browserPlayout from services
function getBrowserPlayout(): BrowserPlayout {
  return getServices().browserPlayout;
}

/**
 * Handle custom API routes for SSE and video streaming
 */
export async function handleApiRoutes(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Dev-only: Reload services endpoint
  if (pathname === "/api/dev/reload" && process.env.NODE_ENV !== "production") {
    return handleDevReload();
  }

  // SSE endpoint for playout events
  if (pathname === "/api/playout/events") {
    return handlePlayoutSSE(request);
  }

  // SSE endpoint for admin status updates
  if (pathname === "/api/admin-events") {
    return handleAdminSSE(request);
  }

  // Client status update endpoint
  if (pathname === "/api/playout/status" && request.method === "POST") {
    return handleClientStatusUpdate(request);
  }

  // Get all client statuses
  if (pathname === "/api/playout/clients" && request.method === "GET") {
    return handleGetClients();
  }

  // Clear specific client playlist
  if (pathname.startsWith("/api/playout/clients/") && pathname.endsWith("/clear") && request.method === "POST") {
    const clientId = pathname.replace("/api/playout/clients/", "").replace("/clear", "");
    return handleClearClientPlaylist(clientId);
  }

  // Video upload endpoint
  if (pathname === "/api/upload" && request.method === "POST") {
    return handleVideoUpload(request);
  }

  // Video streaming endpoint
  if (pathname.startsWith("/api/video/")) {
    return handleVideoStream(request, pathname);
  }

  // Playout settings
  if (pathname === "/api/playout/settings") {
    if (request.method === "GET") {
      return handleGetPlayoutSettings();
    }
  }

  // Container self-update endpoint (admin only)
  if (pathname === "/api/admin/update" && request.method === "POST") {
    return handleContainerUpdate(request);
  }

  return null;
}

/**
 * Handle Server-Sent Events for playout
 */
function handlePlayoutSSE(request: Request): Response {
  const browserPlayout = getBrowserPlayout();
  let clientId: string | null = null;

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Event handler for playout events
      const sendEvent = (event: BrowserPlayoutEvent) => {
        try {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`));
        } catch (e) {
          console.error("[SSE] Error sending event:", e);
        }
      };

      // Register client and get ID
      clientId = browserPlayout.addClient(sendEvent);

      // Send initial connection message with client ID
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ connected: true, clientId })}\n\n`));

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        if (clientId) {
          browserPlayout.removeClient(clientId);
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * Handle Server-Sent Events for admin status updates
 */
function handleAdminSSE(request: Request): Response {
  const browserPlayout = getBrowserPlayout();
  let listenerId: string | null = null;

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Event handler for admin status events
      const sendEvent = (event: AdminStatusEvent) => {
        try {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`));
        } catch (e) {
          console.error("[Admin SSE] Error sending event:", e);
        }
      };

      // Register admin listener and get ID
      listenerId = browserPlayout.addAdminListener(sendEvent);

      // Send initial connection message
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ connected: true })}\n\n`));

      // Handle admin disconnect
      request.signal.addEventListener("abort", () => {
        if (listenerId) {
          browserPlayout.removeAdminListener(listenerId);
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * Handle client status update
 */
async function handleClientStatusUpdate(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { clientId, currentVideo, currentItem, playlist, state } = body;

    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const browserPlayout = getBrowserPlayout();
    browserPlayout.updateClientStatus(clientId, {
      currentVideo,
      currentItem,
      playlist,
      state,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[API] Error updating client status:", e);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Get all connected clients
 */
function handleGetClients(): Response {
  const browserPlayout = getBrowserPlayout();
  const clients = browserPlayout.getAllClientStatuses();

  return new Response(JSON.stringify({ clients }), {
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Clear a specific client's playlist
 */
function handleClearClientPlaylist(clientId: string): Response {
  const browserPlayout = getBrowserPlayout();
  const success = browserPlayout.clearClientPlaylist(clientId);

  return new Response(JSON.stringify({ success }), {
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Handle video file streaming with range support
 */
async function handleVideoStream(request: Request, pathname: string): Promise<Response> {
  try {
    // Extract the relative path from the URL and decode each segment
    const pathAfterApi = pathname.replace("/api/video/", "");
    const relativePath = pathAfterApi
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join(path.sep);
    const videoBasePath = process.env.VIDEO_BASE_PATH || "./videos";
    const filePath = path.join(videoBasePath, relativePath);

    console.log(`[Video] Requested path: ${pathname}`);
    console.log(`[Video] Resolved file path: ${filePath}`);

    // Security: prevent directory traversal
    const normalizedFilePath = path.normalize(filePath);
    const normalizedBasePath = path.normalize(videoBasePath);
    if (!normalizedFilePath.startsWith(normalizedBasePath)) {
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
}

/**
 * Get playout settings
 */
function handleGetPlayoutSettings(): Response {
  const storage = getServices().storage;
  const settings = storage.getPlayoutSettings();
  return new Response(JSON.stringify(settings), {
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Convert Node.js ReadStream to Web ReadableStream
 */
function nodeStreamToWebStream(nodeStream: fs.ReadStream): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer | string) => {
        if (typeof chunk === "string") {
          controller.enqueue(new TextEncoder().encode(chunk));
        } else {
          controller.enqueue(new Uint8Array(chunk));
        }
      });
      nodeStream.on("end", () => {
        controller.close();
      });
      nodeStream.on("error", (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

/**
 * Get MIME type for video files
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".wmv": "video/x-ms-wmv",
    ".flv": "video/x-flv",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Handle video file upload using streams (memory efficient for large files)
 */
async function handleVideoUpload(request: Request): Promise<Response> {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Content-Type must be multipart/form-data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderPath = formData.get("folderPath") as string | null;

    if (!file || !folderPath) {
      return new Response(JSON.stringify({ error: "Missing file or folderPath" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const videoBasePath = process.env.VIDEO_BASE_PATH || "/videos";
    const absolutePath = path.isAbsolute(folderPath) ? folderPath : path.join(videoBasePath, folderPath);

    // Security: Prevent directory traversal
    const normalizedPath = path.normalize(absolutePath);
    const normalizedBase = path.normalize(videoBasePath);
    if (!normalizedPath.startsWith(normalizedBase)) {
      return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
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
    const cleanFileName = file.name.replace(/^\d+[_\-\s]+/, ""); // Remove existing prefix
    const paddedIndex = String(maxNumber + 1).padStart(2, "0");
    const newFileName = `${paddedIndex}_${cleanFileName}`;
    const filePath = path.join(absolutePath, newFileName);

    // Stream the file to disk (memory efficient)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    console.log(`[Upload] File saved: ${filePath} (${buffer.length} bytes)`);

    return new Response(
      JSON.stringify({
        success: true,
        fileName: newFileName,
        size: buffer.length,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Upload] Error:", error);
    return new Response(JSON.stringify({ error: "Upload failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Dev-only: Reload server services (requires server restart to pick up new code)
 */
async function handleDevReload(): Promise<Response> {
  console.log("[Dev] Reloading services...");

  // Import dynamically to get fresh module
  const { stopServices, initializeServer } = await import("./init");

  try {
    const services = getServices();
    stopServices(services);
    (globalThis as Record<string, unknown>).__kabelkrant_services = undefined;
  } catch {
    // Services might not be initialized yet
  }

  await initializeServer();

  return new Response(JSON.stringify({ success: true, message: "Services reloaded" }), {
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Handle container self-update (admin only)
 * Requires Docker socket to be mounted: -v /var/run/docker.sock:/var/run/docker.sock
 */
async function handleContainerUpdate(request: Request): Promise<Response> {
  try {
    // Check authentication
    const body = await request.json();
    const { password } = body;

    const expectedPassword = process.env.UPDATE_PASSWORD || "changeme";
    if (password !== expectedPassword) {
      console.warn("[Update] Authentication failed");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Only allow in production
    if (process.env.NODE_ENV !== "production") {
      return new Response(JSON.stringify({ error: "Update only available in production mode" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if Docker socket is mounted
    if (!fs.existsSync("/var/run/docker.sock")) {
      return new Response(
        JSON.stringify({
          error: "Docker socket not mounted. Run container with: -v /var/run/docker.sock:/var/run/docker.sock",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("[Update] Starting container self-update...");

    // Execute the update script in the background
    // The script will replace this container, so we won't get the full output
    execAsync("/app/update.sh")
      .then(() => {
        console.log("[Update] Update script completed successfully");
      })
      .catch((error) => {
        console.error("[Update] Update script failed:", error);
      });

    // Return immediately since the container will be replaced
    return new Response(
      JSON.stringify({
        success: true,
        message: "Update started. Container will restart with the latest image.",
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Update] Error:", error);
    return new Response(JSON.stringify({ error: "Update failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
