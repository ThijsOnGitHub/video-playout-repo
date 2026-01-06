import { useEffect, useState } from "react";
import { getObsStatus } from "@/server/functions/obs";
import { getPlayoutClients, getPlayoutSettings } from "@/server/functions/playout";
import type { ClientStatus } from "@/server/services/browserPlayout";
import type { PlayoutSettings } from "@/lib/types/PlayoutSettings";

interface RealtimeState {
  obsConnected: boolean;
  clients: ClientStatus[];
  playoutMode: "obs" | "browser";
}

interface AdminStatusEvent {
  type: "clientsUpdate" | "settingsUpdate";
  data?: unknown;
}

interface ClientsUpdateData {
  clients: ClientStatus[];
}

export function useRealtimeState() {
  const [state, setState] = useState<RealtimeState>({
    obsConnected: false,
    clients: [],
    playoutMode: "browser",
  });

  useEffect(() => {
    // Fetch initial OBS status, clients, and settings
    Promise.all([getObsStatus(), getPlayoutClients(), getPlayoutSettings()]).then(([obsStatus, clients, settings]) => {
      setState({
        obsConnected: obsStatus.connected,
        clients: clients ?? [],
        playoutMode: settings?.playoutMode ?? "browser",
      });
    });

    // Setup SSE connection for real-time updates
    console.log("[useRealtimeState] Setting up SSE connection...");
    const eventSource = new EventSource("/api/admin-events");

    eventSource.addEventListener("connected", () => {
      console.log("[useRealtimeState] SSE connected");
    });

    eventSource.addEventListener("clientsUpdate", (event) => {
      try {
        const parsed = JSON.parse(event.data) as AdminStatusEvent;
        if (parsed.data) {
          const data = parsed.data as ClientsUpdateData;
          console.log("[useRealtimeState] Received clients update:", data.clients);
          setState((prev) => ({
            ...prev,
            clients: data.clients,
          }));
        }
      } catch (e) {
        console.error("[useRealtimeState] Error parsing clientsUpdate event:", e);
      }
    });

    eventSource.addEventListener("settingsUpdate", (event) => {
      try {
        const parsed = JSON.parse(event.data) as AdminStatusEvent;
        if (parsed.data) {
          const settings = parsed.data as PlayoutSettings;
          console.log("[useRealtimeState] Received settings update:", settings);
          setState((prev) => ({
            ...prev,
            playoutMode: settings.playoutMode,
          }));
        }
      } catch (e) {
        console.error("[useRealtimeState] Error parsing settingsUpdate event:", e);
      }
    });

    eventSource.onerror = (error) => {
      console.error("[useRealtimeState] SSE error:", error);
    };

    return () => {
      console.log("[useRealtimeState] Closing SSE connection");
      eventSource.close();
    };
  }, []);

  return state;
}
