import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { BrowserPlayoutEvent, AddVideosData, AddIframeData, AddRaadsvergaderingData } from "@/server/services/browserPlayout";
import type { PlayoutState, ClientPlaylistItem, CurrentVideo, CurrentIframe, CurrentRaadsvergadering } from "@/lib/types/playout";

// Re-export types for convenience
export type { ClientPlaylistItem, CurrentVideo, CurrentIframe, CurrentRaadsvergadering };

interface UsePlayoutSSEReturn {
  clientId: string | null;
  currentItem: ClientPlaylistItem | null;
  playlist: ClientPlaylistItem[];
  state: PlayoutState;
  itemKey: number;
  playNextItem: () => void;
  handleItemEnded: () => void;
  // Typed helpers for easy access
  currentVideo: CurrentVideo | null;
  currentIframe: CurrentIframe | null;
  currentRaadsvergadering: CurrentRaadsvergadering | null;
}

export function usePlayoutSSE(): UsePlayoutSSEReturn {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState<string | null>(null);
  const [state, setState] = useState<PlayoutState>("kabelkrant");
  const [currentItem, setCurrentItem] = useState<ClientPlaylistItem | null>(null);
  const [itemKey, setItemKey] = useState(0);
  const [playlist, setPlaylist] = useState<ClientPlaylistItem[]>([]);

  const clientIdRef = useRef<string | null>(null);
  const currentItemRef = useRef<ClientPlaylistItem | null>(null);
  const playlistRef = useRef<ClientPlaylistItem[]>([]);
  const stateRef = useRef<PlayoutState>("kabelkrant");
  const playNextItemRef = useRef<() => void>(() => {});

  // Keep refs in sync with state
  useEffect(() => {
    clientIdRef.current = clientId;
  }, [clientId]);

  useEffect(() => {
    currentItemRef.current = currentItem;
  }, [currentItem]);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Report status to server when state changes
  const reportStatus = useCallback(() => {
    if (!clientIdRef.current) return;

    fetch("/api/playout/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: clientIdRef.current,
        currentItem: currentItemRef.current,
        playlist: playlistRef.current,
        state: stateRef.current,
      }),
    }).catch(console.error);
  }, []);

  // Report status when things change
  useEffect(() => {
    reportStatus();
  }, [currentItem, playlist, state, reportStatus]);

  // Play next item from client-side playlist
  const playNextItem = useCallback(() => {
    const currentPlaylist = playlistRef.current;
    console.log("[Playout] playNextItem called, playlist length:", currentPlaylist.length);

    if (currentPlaylist.length === 0) {
      console.log("[Playout] No more items, showing kabelkrant");
      setCurrentItem(null);
      setState("kabelkrant");
      return;
    }

    const [nextItem, ...remainingPlaylist] = currentPlaylist;

    if (nextItem.type === "video") {
      console.log("[Playout] Playing next video:", nextItem.url, "Remaining:", remainingPlaylist.length);
      setPlaylist(remainingPlaylist);
      setCurrentItem(nextItem);
      setItemKey((k) => k + 1);
      setState("video");
    } else if (nextItem.type === "iframe") {
      console.log("[Playout] Playing next iframe:", nextItem.url, "Duration:", nextItem.durationSeconds, "Muted:", nextItem.muted, "Remaining:", remainingPlaylist.length);
      setPlaylist(remainingPlaylist);
      setCurrentItem(nextItem);
      setItemKey((k) => k + 1);
      setState("iframe");
    } else if (nextItem.type === "raadsvergadering") {
      console.log("[Playout] Playing next raadsvergadering:", nextItem.webcastId, "Remaining:", remainingPlaylist.length);
      setPlaylist(remainingPlaylist);
      setCurrentItem(nextItem);
      setItemKey((k) => k + 1);
      setState("raadsvergadering");
    }
  }, []);

  // Keep ref updated for use in event listeners
  useEffect(() => {
    playNextItemRef.current = playNextItem;
  }, [playNextItem]);

  // Handle item ended (video ended or iframe duration passed)
  const handleItemEnded = useCallback(() => {
    console.log("[Playout] Item ended, playing next...");
    playNextItem();
  }, [playNextItem]);

  // Setup SSE connection
  useEffect(() => {
    console.log("[Playout] Setting up SSE connection...");
    const eventSource = new EventSource("/api/playout/events");

    eventSource.addEventListener("connected", (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[Playout] SSE connected, clientId:", data.clientId);
        setClientId(data.clientId);
      } catch (e) {
        console.error("[Playout] Error parsing connected event:", e);
      }
    });

    eventSource.addEventListener("addVideos", (event) => {
      console.log("[Playout] Received addVideos event:", event.data);
      try {
        const parsed = JSON.parse(event.data) as BrowserPlayoutEvent;
        if (parsed.data) {
          const data = parsed.data as AddVideosData;
          console.log("[Playout] Adding videos to playlist:", data.videos);

          // Convert VideoItem[] to ClientPlaylistItem[]
          const newItems: ClientPlaylistItem[] = data.videos.map((v) => ({
            type: "video" as const,
            path: v.path,
            url: v.url,
          }));

          // Batch state updates to avoid issues
          setCurrentItem((curr) => currentItemRef.current);
          setPlaylist((curr) => playlistRef.current);

          const wasPlaying = currentItemRef.current !== null;
          const hadPlaylist = playlistRef.current.length > 0;

          if (!wasPlaying && !hadPlaylist && newItems.length > 0) {
            // Nothing playing and playlist empty - start first item
            const [firstItem, ...rest] = newItems;
            console.log("[Playout] Nothing playing, starting first item:", firstItem);
            setItemKey((k) => k + 1);
            setState(firstItem.type);
            setCurrentItem(firstItem);
            setPlaylist(rest);
          } else {
            // Add all items to queue
            console.log("[Playout] Adding all items to queue");
            setPlaylist([...playlistRef.current, ...newItems]);
          }
        }
      } catch (e) {
        console.error("[Playout] Error parsing addVideos event:", e);
      }
    });

    eventSource.addEventListener("addIframe", (event) => {
      console.log("[Playout] Received addIframe event:", event.data);
      try {
        const parsed = JSON.parse(event.data) as BrowserPlayoutEvent;
        console.log("[Playout] Parsed addIframe event:", parsed);
        if (parsed.data) {
          const data = parsed.data as AddIframeData;
          console.log("[Playout] Adding iframe to playlist:", data.iframe);

          const newItem: ClientPlaylistItem = {
            type: "iframe",
            url: data.iframe.url,
            durationSeconds: data.iframe.durationSeconds,
            muted: data.iframe.muted,
          };

          if (currentItemRef.current === null) {
            // Nothing playing, start immediately
            console.log("[Playout] Starting iframe immediately:", newItem);
            setItemKey((k) => k + 1);
            setState("iframe");
            setCurrentItem(newItem);
          } else {
            // Add to playlist queue
            console.log("[Playout] Adding iframe to queue");
            setPlaylist((prev) => [...prev, newItem]);
          }
        }
      } catch (e) {
        console.error("[Playout] Error parsing addIframe event:", e);
      }
    });

    eventSource.addEventListener("addRaadsvergadering", (event) => {
      console.log("[Playout] Received addRaadsvergadering event:", event.data);
      try {
        const parsed = JSON.parse(event.data) as BrowserPlayoutEvent;
        console.log("[Playout] Parsed addRaadsvergadering event:", parsed);
        if (parsed.data) {
          const data = parsed.data as AddRaadsvergaderingData;
          console.log("[Playout] Adding raadsvergadering to playlist:", data.raadsvergadering);

          const newItem: ClientPlaylistItem = {
            type: "raadsvergadering",
            webcastId: data.raadsvergadering.webcastId,
          };

          if (currentItemRef.current === null) {
            // Nothing playing, start immediately
            console.log("[Playout] Starting raadsvergadering immediately:", newItem);
            setItemKey((k) => k + 1);
            setState("raadsvergadering");
            setCurrentItem(newItem);
          } else {
            // Add to playlist queue
            console.log("[Playout] Adding raadsvergadering to queue");
            setPlaylist((prev) => [...prev, newItem]);
          }
        }
      } catch (e) {
        console.error("[Playout] Error parsing addRaadsvergadering event:", e);
      }
    });

    eventSource.addEventListener("clearPlaylist", () => {
      console.log("[Playout] Received clearPlaylist event");
      setPlaylist([]);
      setCurrentItem(null);
      setState("kabelkrant");
    });

    eventSource.addEventListener("removeItem", (event) => {
      console.log("[Playout] Received removeItem event:", event.data);
      try {
        const parsed = JSON.parse(event.data);
        const index = parsed.data?.index ?? parsed.index;
        if (typeof index === "number") {
          setPlaylist((prev) => prev.filter((_, i) => i !== index));
        }
      } catch (e) {
        console.error("[Playout] Error parsing removeItem event:", e);
      }
    });

    eventSource.addEventListener("stopCurrent", () => {
      console.log("[Playout] Received stopCurrent event");
      // Stop the current item and play next if available (use ref to avoid stale closure)
      playNextItemRef.current();
    });

    eventSource.addEventListener("settingsUpdate", (event) => {
      console.log("[Playout] Received settingsUpdate event:", event.data);
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.data) {
          queryClient.setQueryData(["playoutSettings"], parsed.data);
          console.log("[Playout] Settings updated:", parsed.data);
        }
      } catch (e) {
        console.error("[Playout] Error parsing settingsUpdate event:", e);
      }
    });

    eventSource.onerror = (error) => {
      console.error("[Playout] SSE error:", error);
    };

    return () => {
      console.log("[Playout] Closing SSE connection");
      eventSource.close();
    };
  }, [queryClient]);

  // Typed helpers for easy access - memoized to prevent unnecessary re-renders
  const currentVideo: CurrentVideo | null = useMemo(() => {
    if (currentItem?.type === "video") {
      return { path: currentItem.path, url: currentItem.url };
    }
    return null;
  }, [currentItem]);

  const currentIframe: CurrentIframe | null = useMemo(() => {
    if (currentItem?.type === "iframe") {
      return { url: currentItem.url, durationSeconds: currentItem.durationSeconds, muted: currentItem.muted };
    }
    return null;
  }, [currentItem]);

  const currentRaadsvergadering: CurrentRaadsvergadering | null = useMemo(() => {
    if (currentItem?.type === "raadsvergadering") {
      return { webcastId: currentItem.webcastId };
    }
    return null;
  }, [currentItem]);

  // Debug logging
  console.log("[usePlayoutSSE] Returning state:", { state, currentItem, currentIframe, currentVideo, currentRaadsvergadering });

  return {
    clientId,
    currentItem,
    playlist,
    state,
    itemKey,
    playNextItem,
    handleItemEnded,
    currentVideo,
    currentIframe,
    currentRaadsvergadering,
  };
}
