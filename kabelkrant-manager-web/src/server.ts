// src/server.ts - Server Entry Point for TanStack Start
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";
import { initializeServer } from "./server/init";

// Initialize server services immediately on module load
const initPromise = initializeServer();

const handler = createStartHandler(defaultStreamHandler);

export default createServerEntry({
  async fetch(request) {
    // Ensure services are initialized before handling request
    await initPromise;

    // Let TanStack Start handle all routes including /api/* server routes
    return handler(request);
  },
});
