import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { BrowserPlayoutEvent, AddVideosData, AddIframeData, AddRaadsvergaderingData } from "@/server/services/browserPlayout";
import type { PlayoutState, ClientPlaylistItem, CurrentVideo, CurrentIframe, CurrentRaadsvergadering } from "@/lib/types/playout";

// Re-export types for convenience
export type { ClientPlaylistItem, CurrentVideo, CurrentIframe, CurrentRaadsvergadering };

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

// localStorage keys
const STORAGE_KEY_CLIENT_ID = "playout_clientId";
const STORAGE_KEY_PLAYLIST = "playout_playlist";
const STORAGE_KEY_CURRENT_ITEM = "playout_currentItem";
const STORAGE_KEY_STATE = "playout_state";

// Reconnection settings
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

interface UsePlayoutSSEReturn {
  clientId: string | null;
  currentItem: ClientPlaylistItem | null;
  playlist: ClientPlaylistItem[];
  state: PlayoutState;
  itemKey: number;
  connectionStatus: ConnectionStatus;
  playNextItem: () => void;
  handleItemEnded: () => void;
  /** Transition raadsvergadering from waiting to playing state */
  handleRaadsvergaderingPlaying: () => void;
  // Typed helpers for easy access
  currentVideo: CurrentVideo | null;
  currentIframe: CurrentIframe | null;
  currentRaadsvergadering: CurrentRaadsvergadering | null;
}

// Helper functions for localStorage
function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("[Playout] Error saving to localStorage:", e);
  }
}

export function usePlayoutSSE(): UsePlayoutSSEReturn {
  const queryClient = useQueryClient();

  // Initialize state from localStorage for resilience
  const [clientId, setClientId] = useState<string | null>(() => loadFromStorage(STORAGE_KEY_CLIENT_ID, null));
  const [state, setState] = useState<PlayoutState>(() => loadFromStorage(STORAGE_KEY_STATE, "kabelkrant"));
  const [currentItem, setCurrentItem] = useState<ClientPlaylistItem | null>(() => loadFromStorage(STORAGE_KEY_CURRENT_ITEM, null));
  const [itemKey, setItemKey] = useState(0);
  const [playlist, setPlaylist] = useState<ClientPlaylistItem[]>(() => loadFromStorage(STORAGE_KEY_PLAYLIST, []));
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");

  const clientIdRef = useRef<string | null>(clientId);
  const currentItemRef = useRef<ClientPlaylistItem | null>(currentItem);
  const playlistRef = useRef<ClientPlaylistItem[]>(playlist);
  const stateRef = useRef<PlayoutState>(state);
  const playNextItemRef = useRef<() => void>(() => {});
  const handleRaadsvergaderingPlayingRef = useRef<() => void>(() => {});
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const eventSourceRef = useRef<EventSource | null>(null);

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

  // Persist state to localStorage for resilience during reconnection
  useEffect(() => {
    saveToStorage(STORAGE_KEY_CLIENT_ID, clientId);
  }, [clientId]);

  useEffect(() => {
    saveToStorage(STORAGE_KEY_PLAYLIST, playlist);
  }, [playlist]);

  useEffect(() => {
    saveToStorage(STORAGE_KEY_CURRENT_ITEM, currentItem);
  }, [currentItem]);

  useEffect(() => {
    saveToStorage(STORAGE_KEY_STATE, state);
  }, [state]);

  // Clear localStorage on intentional page close (not network disconnect)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear stored state so next visit starts fresh
      localStorage.removeItem(STORAGE_KEY_CLIENT_ID);
      localStorage.removeItem(STORAGE_KEY_PLAYLIST);
      localStorage.removeItem(STORAGE_KEY_CURRENT_ITEM);
      localStorage.removeItem(STORAGE_KEY_STATE);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

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
      // Start in waiting state - will transition to playing when stream actually starts
      setState("raadsvergadering:waiting");
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

  // Handle raadsvergadering transitioning from waiting to playing
  const handleRaadsvergaderingPlaying = useCallback(() => {
    if (stateRef.current === "raadsvergadering:waiting") {
      console.log("[Playout] Raadsvergadering stream started playing, transitioning to playing state");
      setState("raadsvergadering:playing");
    }
  }, []);

  // Keep ref updated for use in event listeners
  useEffect(() => {
    handleRaadsvergaderingPlayingRef.current = handleRaadsvergaderingPlaying;
  }, [handleRaadsvergaderingPlaying]);

  // Setup SSE connection with automatic reconnection
  useEffect(() => {
    let isCleanedUp = false;

    const connect = () => {
      if (isCleanedUp) return;

      // Build SSE URL with optional clientId for reconnection
      const storedClientId = clientIdRef.current;
      const sseUrl = storedClientId
        ? `/api/playout/events?clientId=${encodeURIComponent(storedClientId)}`
        : "/api/playout/events";

      console.log("[Playout] Setting up SSE connection...", storedClientId ? `(reconnecting as ${storedClientId})` : "(new connection)");
      setConnectionStatus("connecting");

      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("connected", (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[Playout] SSE connected, clientId:", data.clientId, "restored:", data.restored);
          setClientId(data.clientId);
          setConnectionStatus("connected");

          // Reset reconnection delay on successful connection
          reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;

          // If server restored our state, update from server
          if (data.restored) {
            console.log("[Playout] Restoring state from server:", {
              state: data.state,
              currentItem: data.currentItem,
              playlist: data.playlist,
            });
            if (data.state) setState(data.state);
            if (data.currentItem !== undefined) setCurrentItem(data.currentItem);
            if (data.playlist !== undefined) setPlaylist(data.playlist);
          }
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
            // For raadsvergadering, start in waiting state
            const newState = firstItem.type === "raadsvergadering" ? "raadsvergadering:waiting" : firstItem.type;
            setState(newState);
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
            // Nothing playing, start immediately in waiting state
            console.log("[Playout] Starting raadsvergadering immediately (waiting state):", newItem);
            setItemKey((k) => k + 1);
            setState("raadsvergadering:waiting");
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

    eventSource.addEventListener("forceStartStream", () => {
      console.log("[Playout] Received forceStartStream event - manually starting stream");
      // Force transition from waiting to playing state
      handleRaadsvergaderingPlayingRef.current();
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
        setConnectionStatus("disconnected");

        // Close the current connection
        eventSource.close();
        eventSourceRef.current = null;

        if (!isCleanedUp) {
          // Schedule reconnection with exponential backoff
          const delay = reconnectDelayRef.current;
          console.log(`[Playout] Reconnecting in ${delay}ms...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            // Increase delay for next attempt (exponential backoff with max)
            reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);
            connect();
          }, delay);
        }
      };
    };

    // Initial connection
    connect();

    return () => {
      console.log("[Playout] Closing SSE connection");
      isCleanedUp = true;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
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
    connectionStatus,
    playNextItem,
    handleItemEnded,
    handleRaadsvergaderingPlaying,
    currentVideo,
    currentIframe,
    currentRaadsvergadering,
  };
}
