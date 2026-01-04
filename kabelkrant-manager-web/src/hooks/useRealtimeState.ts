import { useEffect, useState, useCallback } from "react";
import { getObsStatus } from "@/server/functions/obs";
import { getPlayoutClients, getPlayoutSettings } from "@/server/functions/playout";
import type { ClientStatus } from "@/server/services/browserPlayout";

interface RealtimeState {
  obsConnected: boolean;
  clients: ClientStatus[];
  playoutMode: "obs" | "browser";
}

export function useRealtimeState() {
  const [state, setState] = useState<RealtimeState>({
    obsConnected: false,
    clients: [],
    playoutMode: "browser",
  });

  const fetchStatus = useCallback(async () => {
    try {
      const [obsStatus, clients, settings] = await Promise.all([getObsStatus(), getPlayoutClients(), getPlayoutSettings()]);
      setState({
        obsConnected: obsStatus.connected,
        clients: clients ?? [],
        playoutMode: settings?.playoutMode ?? "browser",
      });
    } catch (error) {
      console.error("Error fetching status:", error);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Poll every 2 seconds
    const interval = setInterval(fetchStatus, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchStatus]);

  return state;
}
