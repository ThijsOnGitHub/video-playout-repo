import { createFileRoute } from "@tanstack/react-router";
import { getBrowserPlayout, type AdminStatusEvent } from "@/server/services/browserPlayout";

export const Route = createFileRoute("/api/admin-events")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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
      },
    },
  },
});
