import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PlayoutSettings } from "@/lib/types/PlayoutSettings";
import { getPlayoutSettings } from "@/server/functions/playout";
import { ActivationScreen } from "@/components/playout/ActivationScreen";
import { PlayoutControls } from "@/components/playout/PlayoutControls";
import { KabelkrantLayer, IframeLayer, RaadsvergaderingLayer, VideoLayer } from "@/components/playout/PlayoutLayers";
import { usePlayoutSSE } from "@/hooks/usePlayoutSSE";
import { usePlayoutAudio } from "@/hooks/usePlayoutAudio";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useCompanyWebcast } from "@/hooks/useCompanyWebcast";
import { useIframeTimer } from "@/hooks/useIframeTimer";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import { usePlayoutBodyStyles } from "@/hooks/usePlayoutBodyStyles";

export const Route = createFileRoute("/playout")({
  component: PlayoutPage,
});

function PlayoutPage() {
  const [isActivated, setIsActivated] = useState(false);

  // Refs for DOM elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const kabelkrantRef = useRef<HTMLIFrameElement>(null);
  const playlistIframeRef = useRef<HTMLIFrameElement>(null);
  const raadsvergaderingRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // SSE connection and playlist state management
  const { clientId, currentVideo, currentIframe, currentRaadsvergadering, playlist, state, itemKey, handleItemEnded, handleRaadsvergaderingPlaying } = usePlayoutSSE();

  // Fetch settings
  const { data: settings } = useQuery<PlayoutSettings>({
    queryKey: ["playoutSettings"],
    queryFn: () => getPlayoutSettings(),
    staleTime: 1000 * 60 * 5,
  });

  // Body styles for playout page
  usePlayoutBodyStyles();

  // Video player source management
  useVideoPlayer({ videoRef, currentVideo, itemKey });

  // Iframe duration timer
  useIframeTimer({
    currentIframe,
    state,
    itemKey,
    onDurationEnd: handleItemEnded,
  });

  // CompanyWebcast player for raadsvergadering
  useCompanyWebcast({
    containerRef: raadsvergaderingRef,
    currentRaadsvergadering,
    state,
    itemKey,
    onStreamEnded: handleItemEnded,
    onPlayingStarted: handleRaadsvergaderingPlaying,
  });

  // Audio management
  const { microphoneEnabled, toggleAudio } = usePlayoutAudio({
    settings,
    isActivated,
    state,
    videoRef,
    iframeMuted: currentIframe?.muted,
  });

  // Fullscreen management
  const { isFullscreen, toggleFullscreen, showControls, handleMouseMove } = useFullscreen({ containerRef });

  // Activate playout (needed for browser autoplay policy)
  const activatePlayout = useCallback(() => {
    console.log("[Playout] Activating playout (user interaction)");
    setIsActivated(true);

    if (currentVideo && videoRef.current) {
      videoRef.current.play().catch((err) => console.error("[Playout] Play failed after activation:", err));
    }
  }, [currentVideo]);

  const resolution = settings?.resolution || { width: 1920, height: 1080 };

  // Show activation screen if not activated yet
  if (!isActivated) {
    return <ActivationScreen settings={settings} clientId={clientId} resolution={resolution} onActivate={activatePlayout} />;
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-black overflow-hidden"
      style={{
        width: isFullscreen ? "100vw" : resolution.width,
        height: isFullscreen ? "100vh" : resolution.height,
        maxWidth: "100vw",
        maxHeight: "100vh",
      }}
      onMouseMove={handleMouseMove}
    >
      {/* Content layers */}
      <KabelkrantLayer settings={settings} state={state} kabelkrantRef={kabelkrantRef} />
      <IframeLayer currentIframe={currentIframe} state={state} itemKey={itemKey} iframeRef={playlistIframeRef} />
      <RaadsvergaderingLayer currentRaadsvergadering={currentRaadsvergadering} state={state} itemKey={itemKey} containerRef={raadsvergaderingRef} />
      <VideoLayer videoRef={videoRef} state={state} onEnded={handleItemEnded} />

      {/* Control overlay */}
      <PlayoutControls
        settings={settings}
        state={state}
        currentVideo={currentVideo}
        currentIframe={currentIframe}
        currentRaadsvergadering={currentRaadsvergadering}
        playlist={playlist}
        microphoneEnabled={microphoneEnabled}
        isFullscreen={isFullscreen}
        showControls={showControls}
        onToggleMicrophone={toggleAudio}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
}
