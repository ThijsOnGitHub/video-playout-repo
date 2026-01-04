import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PlayoutSettings } from "@/lib/types/PlayoutSettings";
import { getPlayoutSettings } from "@/server/functions/playout";
import { ActivationScreen } from "@/components/playout/ActivationScreen";
import { PlayoutControls } from "@/components/playout/PlayoutControls";
import { usePlayoutSSE } from "@/hooks/usePlayoutSSE";
import { usePlayoutAudio } from "@/hooks/usePlayoutAudio";
import { useFullscreen } from "@/hooks/useFullscreen";

export const Route = createFileRoute("/playout")({
  component: PlayoutPage,
});

function PlayoutPage() {
  const [isActivated, setIsActivated] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const kabelkrantRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // SSE connection and video state management
  const { clientId, currentVideo, playlist, state, videoKey, handleVideoEnded } = usePlayoutSSE();

  // Fetch settings with React Query
  const { data: settings } = useQuery<PlayoutSettings>({
    queryKey: ["playoutSettings"],
    queryFn: () => getPlayoutSettings(),
    staleTime: 1000 * 60 * 5,
  });

  // Audio management
  const { microphoneEnabled, toggleAudio } = usePlayoutAudio({
    settings,
    isActivated,
    state,
    videoRef,
  });

  // Fullscreen management
  const { isFullscreen, toggleFullscreen, showControls, handleMouseMove } = useFullscreen({ containerRef });

  // Update video source when currentVideo or videoKey changes
  useEffect(() => {
    if (!videoRef.current) return;

    if (currentVideo?.url) {
      console.log(`[Playout] Setting video src: ${currentVideo.url} (key: ${videoKey})`);
      videoRef.current.src = currentVideo.url;
      videoRef.current.load();
    } else {
      videoRef.current.src = "";
    }
  }, [currentVideo, videoKey]);

  // Activate playout (needed for browser autoplay policy)
  const activatePlayout = useCallback(() => {
    console.log("[Playout] Activating playout (user interaction)");
    setIsActivated(true);

    if (currentVideo && videoRef.current) {
      videoRef.current.play().catch((err) => console.error("[Playout] Play failed after activation:", err));
    }
  }, [currentVideo]);

  // Override body styles for playout page
  useEffect(() => {
    const originalPadding = document.body.style.paddingTop;
    const originalBackground = document.body.style.backgroundColor;
    const originalMinHeight = document.body.style.minHeight;

    document.body.style.paddingTop = "0";
    document.body.style.backgroundColor = "#000";
    document.body.style.minHeight = "100vh";
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.paddingTop = originalPadding;
      document.body.style.backgroundColor = originalBackground;
      document.body.style.minHeight = originalMinHeight;
      document.body.style.overflow = "";
    };
  }, []);

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
      {/* Kabelkrant iframe */}
      {settings?.kabelkrantUrl && (
        <iframe
          ref={kabelkrantRef}
          src={settings.kabelkrantUrl}
          className="absolute inset-0 w-full h-full border-0"
          style={{
            opacity: state === "video" ? 0 : 1,
            zIndex: state === "video" ? 0 : 1,
          }}
          allow="autoplay"
        />
      )}

      {/* Placeholder when no kabelkrant URL is set */}
      {!settings?.kabelkrantUrl && state === "kabelkrant" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Kabelkrant</h1>
            <p className="text-gray-400">Geen kabelkrant URL ingesteld</p>
            <p className="text-gray-500 text-sm mt-2">Configureer de URL in de instellingen</p>
          </div>
        </div>
      )}

      {/* Video player */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain"
        style={{
          opacity: state === "video" ? 1 : 0,
          zIndex: state === "video" ? 1 : 0,
        }}
        onEnded={handleVideoEnded}
        onPlay={() => console.log("[Playout] Video play event fired")}
        onError={(e) => console.error("[Playout] Video error:", e.currentTarget.error)}
        onLoadStart={() => console.log("[Playout] Video load started")}
        onLoadedData={() => console.log("[Playout] Video data loaded")}
        onCanPlay={(e) => {
          console.log("[Playout] Video can play, starting playback...");
          e.currentTarget.play().catch((err) => {
            console.warn("[Playout] Play failed (expected if not activated):", err.message);
          });
        }}
        playsInline
        autoPlay
      />

      {/* Control overlay */}
      <PlayoutControls
        settings={settings}
        state={state}
        currentVideo={currentVideo}
        playlistLength={playlist.length}
        microphoneEnabled={microphoneEnabled}
        isFullscreen={isFullscreen}
        showControls={showControls}
        onToggleMicrophone={toggleAudio}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
}
