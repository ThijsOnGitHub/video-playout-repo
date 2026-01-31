import { createFileRoute } from "@tanstack/react-router";
import { getPlayoutClients } from "@/server/functions/playout";

export const Route = createFileRoute("/api/playout/clients/")({
  server: {
    handlers: {
      GET: async () => {
        const clients = await getPlayoutClients();
        return Response.json({ clients });
      },
    },
  },
});
