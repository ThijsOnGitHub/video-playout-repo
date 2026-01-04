// src/server.ts - Server Entry Point for TanStack Start
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";
import { initializeServer } from "./server/init";
import { handleApiRoutes } from "./server/api";

// Initialize server services immediately on module load
const initPromise = initializeServer();

const handler = createStartHandler(defaultStreamHandler);

export default createServerEntry({
  async fetch(request) {
    // Ensure services are initialized before handling request
    await initPromise;

    const url = new URL(request.url);

    // Handle custom API routes (SSE, video streaming)
    if (url.pathname.startsWith("/api/")) {
      const apiResponse = await handleApiRoutes(request);
      if (apiResponse) {
        return apiResponse;
      }
    }

    return handler(request);
  },
});
