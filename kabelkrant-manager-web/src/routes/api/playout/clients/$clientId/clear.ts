import { createFileRoute } from "@tanstack/react-router";
import { clearClientPlaylist } from "@/server/functions/playout";

export const Route = createFileRoute("/api/playout/clients/$clientId/clear")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const result = await clearClientPlaylist({ data: { clientId: params.clientId } });
        return Response.json(result);
      },
    },
  },
});
