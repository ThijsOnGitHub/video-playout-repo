import { createFileRoute } from "@tanstack/react-router";
import { reloadServices } from "@/server/functions/playout";

export const Route = createFileRoute("/api/dev/reload")({
  server: {
    handlers: {
      GET: async () => {
        const result = await reloadServices();
        return Response.json(result);
      },
    },
  },
});
