import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { BrowserPlayoutEvent, VideoItem, AddVideosData } from "@/server/services/browserPlayout";

type PlayoutState = "kabelkrant" | "video" | "transitioning";

interface UsePlayoutSSEReturn {
  clientId: string | null;
  currentVideo: VideoItem | null;
  playlist: VideoItem[];
  state: PlayoutState;
  videoKey: number;
  playNextVideo: () => void;
  handleVideoEnded: () => void;
  // Refs for status reporting
  currentVideoRef: React.MutableRefObject<VideoItem | null>;
  playlistRef: React.MutableRefObject<VideoItem[]>;
  stateRef: React.MutableRefObject<PlayoutState>;
}

export function usePlayoutSSE(): UsePlayoutSSEReturn {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState<string | null>(null);
  const [state, setState] = useState<PlayoutState>("kabelkrant");
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);
  const [videoKey, setVideoKey] = useState(0);
  const [playlist, setPlaylist] = useState<VideoItem[]>([]);

  const clientIdRef = useRef<string | null>(null);
  const currentVideoRef = useRef<VideoItem | null>(null);
  const playlistRef = useRef<VideoItem[]>([]);
  const stateRef = useRef<PlayoutState>("kabelkrant");

  // Keep refs in sync with state
  useEffect(() => {
    clientIdRef.current = clientId;
  }, [clientId]);

  useEffect(() => {
    currentVideoRef.current = currentVideo;
  }, [currentVideo]);

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
        currentVideo: currentVideoRef.current,
        playlist: playlistRef.current,
        state: stateRef.current,
      }),
    }).catch(console.error);
  }, []);

  // Report status when things change
  useEffect(() => {
    reportStatus();
  }, [currentVideo, playlist, state, reportStatus]);

  // Play next video from client-side playlist
  const playNextVideo = useCallback(() => {
    const currentPlaylist = playlistRef.current;
    console.log("[Playout] playNextVideo called, playlist length:", currentPlaylist.length);

    if (currentPlaylist.length === 0) {
      console.log("[Playout] No more videos, showing kabelkrant");
      setCurrentVideo(null);
      setState("kabelkrant");
      return;
    }

    const [nextVideo, ...remainingPlaylist] = currentPlaylist;

    console.log("[Playout] Playing next video:", nextVideo.url, "Remaining:", remainingPlaylist.length);

    setPlaylist(remainingPlaylist);
    setCurrentVideo(nextVideo);
    setVideoKey((k) => k + 1);
    setState("video");
  }, []);

  // Handle video ended
  const handleVideoEnded = useCallback(() => {
    console.log("[Playout] Video ended, playing next...");
    playNextVideo();
  }, [playNextVideo]);

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

          const isPlaying = currentVideoRef.current !== null;
          const currentPlaylist = playlistRef.current;

          if (!isPlaying && currentPlaylist.length === 0 && data.videos.length > 0) {
            const [firstVideo, ...rest] = data.videos;
            setPlaylist(rest);
            setCurrentVideo(firstVideo);
            setVideoKey((k) => k + 1);
            setState("video");
          } else {
            setPlaylist((prev) => [...prev, ...data.videos]);
          }
        }
      } catch (e) {
        console.error("[Playout] Error parsing addVideos event:", e);
      }
    });

    eventSource.addEventListener("clearPlaylist", () => {
      console.log("[Playout] Received clearPlaylist event");
      setPlaylist([]);
      setCurrentVideo(null);
      setState("kabelkrant");
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

  return {
    clientId,
    currentVideo,
    playlist,
    state,
    videoKey,
    playNextVideo,
    handleVideoEnded,
    currentVideoRef,
    playlistRef,
    stateRef,
  };
}
