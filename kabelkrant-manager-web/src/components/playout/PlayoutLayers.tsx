import type { PlayoutState, CurrentIframe, CurrentRaadsvergadering } from "@/lib/types/playout";
import type { PlayoutSettings } from "@/lib/types/PlayoutSettings";
import type { RefObject } from "react";

interface KabelkrantLayerProps {
  settings: PlayoutSettings | undefined;
  state: PlayoutState;
  kabelkrantRef: RefObject<HTMLIFrameElement | null>;
}

/**
 * Kabelkrant iframe layer - always mounted but hidden when other content is playing
 * Note: stays visible during raadsvergadering:waiting, only hides when :playing
 */
export function KabelkrantLayer({ settings, state, kabelkrantRef }: KabelkrantLayerProps) {
  const isHidden = state === "video" || state === "iframe" || state === "raadsvergadering:playing";




  
  if (!settings?.kabelkrantUrl) {
    // Show placeholder when no kabelkrant URL is set
    if (state === "kabelkrant") {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Kabelkrant</h1>
            <p className="text-gray-400">Geen kabelkrant URL ingesteld</p>
            <p className="text-gray-500 text-sm mt-2">Configureer de URL in de instellingen</p>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <iframe
      ref={kabelkrantRef as RefObject<HTMLIFrameElement>}
      src={settings.kabelkrantUrl}
      className="absolute inset-0 w-full h-full border-0"
      style={{
        opacity: isHidden ? 0 : 1,
        zIndex: isHidden ? 0 : 1,
      }}
      allow="autoplay"
    />
  );
}

interface IframeLayerProps {
  currentIframe: CurrentIframe | null;
  state: PlayoutState;
  itemKey: number;
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

/**
 * Playlist iframe layer - rendered when an iframe program is active
 */
export function IframeLayer({ currentIframe, state, itemKey, iframeRef }: IframeLayerProps) {
  if (state !== "iframe" || !currentIframe) {
    return null;
  }

  return (
    <iframe
      ref={iframeRef as RefObject<HTMLIFrameElement>}
      key={itemKey}
      src={currentIframe.url}
      className="absolute inset-0 w-full h-full border-0"
      style={{ zIndex: 2 }}
      allow={currentIframe.muted ? "autoplay" : "autoplay; microphone"}
    />
  );
}

interface RaadsvergaderingLayerProps {
  currentRaadsvergadering: CurrentRaadsvergadering | null;
  state: PlayoutState;
  itemKey: number;
  containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Raadsvergadering layer - container for CompanyWebcast player
 * Renders at both :waiting and :playing states (for iframe preloading), but only visible at :playing
 */
export function RaadsvergaderingLayer({ currentRaadsvergadering, state, itemKey, containerRef }: RaadsvergaderingLayerProps) {
  const isRaadsvergaderingState = state === "raadsvergadering:waiting" || state === "raadsvergadering:playing";
  if (!isRaadsvergaderingState || !currentRaadsvergadering) {
    return null;
  }

  const isVisible = state === "raadsvergadering:playing";

  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement>}
      key={`raadsvergadering-${itemKey}`}
      className="absolute inset-0 w-full h-full"
      style={{
        zIndex: isVisible ? 2 : -1,
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? "auto" : "none",
      }}
    />
  );
}

interface VideoLayerProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  state: PlayoutState;
  onEnded: () => void;
}

/**
 * Video layer - always mounted but only visible when playing video
 */
export function VideoLayer({ videoRef, state, onEnded }: VideoLayerProps) {
  const isVisible = state === "video";

  return (
    <video
      ref={videoRef as RefObject<HTMLVideoElement>}
      className="absolute inset-0 w-full h-full object-contain"
      style={{
        opacity: isVisible ? 1 : 0,
        zIndex: isVisible ? 1 : 0,
      }}
      onEnded={onEnded}
      onPlay={() => console.log("[VideoLayer] Video play event")}
      onError={(e) => console.error("[VideoLayer] Video error:", e.currentTarget.error)}
      onLoadStart={() => console.log("[VideoLayer] Video load started")}
      onLoadedData={() => console.log("[VideoLayer] Video data loaded")}
      onCanPlay={(e) => {
        console.log("[VideoLayer] Video can play, starting playback...");
        e.currentTarget.play().catch((err) => {
          console.warn("[VideoLayer] Play failed (expected if not activated):", err.message);
        });
      }}
      playsInline
      autoPlay
    />
  );
}
