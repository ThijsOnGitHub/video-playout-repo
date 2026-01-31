import { createFileRoute } from "@tanstack/react-router";
import { getPlayoutSettings } from "@/server/functions/playout";

export const Route = createFileRoute("/api/playout/settings")({
  server: {
    handlers: {
      GET: async () => {
        const settings = await getPlayoutSettings();
        return Response.json(settings);
      },
    },
  },
});
