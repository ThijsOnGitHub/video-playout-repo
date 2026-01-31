import { createFileRoute } from "@tanstack/react-router";
import { getBrowserPlayout } from "@/server/services/browserPlayout";

export const Route = createFileRoute("/api/playout/status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { clientId, currentVideo, currentItem, playlist, state } = body;

          if (!clientId) {
            return Response.json({ error: "clientId required" }, { status: 400 });
          }

          const browserPlayout = getBrowserPlayout();
          browserPlayout.updateClientStatus(clientId, {
            currentVideo,
            currentItem,
            playlist,
            state,
          });

          return Response.json({ success: true });
        } catch (e) {
          console.error("[API] Error updating client status:", e);
          return Response.json({ error: "Invalid request" }, { status: 400 });
        }
      },
    },
  },
});
