import { useEffect, useRef, useCallback } from "react";
import type { CwcPlayer, CurrentRaadsvergadering, PlayoutState } from "@/lib/types/playout";

// Direct iframe URL without SDK
const CWC_PLAYER_URL = "https://sdk.companywebcast.com/sdk/player/";

interface UseCompanyWebcastOptions {
  /** Container ref where the player will be mounted */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Current raadsvergadering to play (null = no raadsvergadering) */
  currentRaadsvergadering: CurrentRaadsvergadering | null;
  /** Current playout state */
  state: PlayoutState;
  /** Unique key to force player recreation */
  itemKey: number;
  /** Callback when the stream ends (video ended or live stream finished) */
  onStreamEnded?: () => void;
  /** Callback when the stream actually starts playing */
  onPlayingStarted?: () => void;
}

interface UseCompanyWebcastReturn {
  /** Reference to the current CWC player instance */
  playerRef: React.RefObject<CwcPlayer | null>;
}

/**
 * Hook to manage CompanyWebcast player for raadsvergadering streams.
 * Uses direct iframe without SDK for better autoplay control.
 */
export function useCompanyWebcast({ containerRef, currentRaadsvergadering, state, itemKey, onStreamEnded, onPlayingStarted }: UseCompanyWebcastOptions): UseCompanyWebcastReturn {
  const playerRef = useRef<CwcPlayer | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Stable callback reference
  const handleStreamEnded = useCallback(() => {
    console.log("[CompanyWebcast] Stream ended, calling onStreamEnded callback");
    onStreamEnded?.();
  }, [onStreamEnded]);

  // Stable callback reference for playing started
  const handlePlayingStarted = useCallback(() => {
    console.log("[CompanyWebcast] Playing started, calling onPlayingStarted callback");
    onPlayingStarted?.();
  }, [onPlayingStarted]);

  // Handle player creation and cleanup
  useEffect(() => {
    const container = containerRef.current;

    // Cleanup when not showing raadsvergadering (check for both waiting and playing states)
    const isRaadsvergaderingState = state === "raadsvergadering:waiting" || state === "raadsvergadering:playing";
    if (!currentRaadsvergadering || !isRaadsvergaderingState || !container) {
      if (iframeRef.current && container) {
        container.innerHTML = "";
        iframeRef.current = null;
        playerRef.current = null;
      }
      return;
    }

    console.log("[CompanyWebcast] Creating player for:", currentRaadsvergadering.webcastId);

    // Clear previous player
    container.innerHTML = "";

    // Build iframe URL with autoplay=1
    const webcastId = currentRaadsvergadering.webcastId.replace("/", "_");
    const params = new URLSearchParams({
      id: webcastId,
      autoplay: "1",
      display: "0",
    });
    const iframeSrc = `${CWC_PLAYER_URL}?${params.toString()}`;

    console.log("[CompanyWebcast] Iframe URL:", iframeSrc);

    // Create iframe directly
    const iframe = document.createElement("iframe");
    iframe.src = iframeSrc;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    iframe.setAttribute("allowfullscreen", "true");
    iframe.setAttribute("webkitallowfullscreen", "true");
    iframe.setAttribute("mozallowfullscreen", "true");
    iframe.setAttribute("allow", "autoplay; fullscreen");

    iframeRef.current = iframe;
    container.appendChild(iframe);

    // Listen for postMessage events from the iframe
    const handleMessage = (event: MessageEvent) => {
      // Only handle messages from CompanyWebcast
      if (!event.origin.includes("companywebcast.com")) {
        return;
      }

      const data = event.data;
      if (!data || !data.event) return;

      console.log("[CompanyWebcast] Event:", data.event, data.data);

      // Handle specific events
      switch (data.event) {
        case "playpause.state:change":
          console.log("[CompanyWebcast] Play state:", data.data?.state);
          // Possible states: playing, paused, ended, waiting, idle
          if (data.data?.state === "playing") {
            console.log("[CompanyWebcast] Video started playing");
            // Notify parent component that playing has started
            handlePlayingStarted();
          } else if (data.data?.state === "ended") {
            console.log("[CompanyWebcast] Video ended, closing iframe");
            // Clean up iframe
            if (container && iframeRef.current) {
              container.innerHTML = "";
              iframeRef.current = null;
            }
            // Notify parent component
            handleStreamEnded();
          }
          break;
        case "resource.state:change":
          console.log("[CompanyWebcast] Resource state:", data.data);
          // isActive: false might mean stream not started or ended
          if (data.data?.isActive === false) {
            console.log("[CompanyWebcast] Resource not active (stream may not have started or ended)");
          }
          break;
        case "info:create":
          // This event contains info about the webcast
          console.log("[CompanyWebcast] Webcast info:", data.data);
          // Check if there's status info about the stream
          if (data.data?.status) {
            console.log("[CompanyWebcast] Stream status:", data.data.status);
          }
          if (data.data?.isLive !== undefined) {
            console.log("[CompanyWebcast] Is live:", data.data.isLive);
          }
          break;
        case "resource:create":
          console.log("[CompanyWebcast] Resource created:", data.data);
          break;
        case "event:create":
          console.log("[CompanyWebcast] Event created:", data.data);
          break;
        case "ended":
        case "video:ended":
        case "stream:ended":
        case "media:ended":
          console.log("[CompanyWebcast] Stream ended event received, closing iframe");
          // Clean up iframe
          if (container && iframeRef.current) {
            container.innerHTML = "";
            iframeRef.current = null;
          }
          // Notify parent component
          handleStreamEnded();
          break;
      }
    };

    window.addEventListener("message", handleMessage);

    console.log("[CompanyWebcast] Player created successfully");

    // Cleanup
    return () => {
      window.removeEventListener("message", handleMessage);
      if (container) {
        container.innerHTML = "";
      }
      iframeRef.current = null;
      playerRef.current = null;
    };
  }, [currentRaadsvergadering, state, itemKey, containerRef, handleStreamEnded, handlePlayingStarted]);

  return { playerRef };
}
