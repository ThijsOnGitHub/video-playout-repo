import { createFileRoute } from "@tanstack/react-router";
import { getBrowserPlayout, type BrowserPlayoutEvent } from "@/server/services/browserPlayout";

export const Route = createFileRoute("/api/playout/events")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const browserPlayout = getBrowserPlayout();
        const url = new URL(request.url);
        const requestedClientId = url.searchParams.get("clientId") || undefined;
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

            // Register client and get ID (optionally restoring from disconnected pool)
            const result = browserPlayout.addClient(sendEvent, requestedClientId);
            clientId = result.clientId;

            // Send initial connection message with client ID and restoration status
            const connectionData = {
              connected: true,
              clientId,
              restored: result.restored,
              ...(result.restored && result.status
                ? {
                    currentItem: result.status.currentItem,
                    playlist: result.status.playlist,
                    state: result.status.state,
                  }
                : {}),
            };
            controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify(connectionData)}\n\n`));

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
      },
    },
  },
});
