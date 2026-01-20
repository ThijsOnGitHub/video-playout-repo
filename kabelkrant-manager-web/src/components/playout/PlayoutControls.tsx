import type { PlayoutSettings } from "@/lib/types/PlayoutSettings";
import type { PlayoutState, CurrentVideo, CurrentIframe, CurrentRaadsvergadering, ClientPlaylistItem } from "@/lib/types/playout";

interface PlayoutControlsProps {
  settings: PlayoutSettings | undefined;
  state: PlayoutState;
  currentVideo: CurrentVideo | null;
  currentIframe: CurrentIframe | null;
  currentRaadsvergadering: CurrentRaadsvergadering | null;
  playlist: ClientPlaylistItem[];
  microphoneEnabled: boolean;
  isFullscreen: boolean;
  showControls: boolean;
  onToggleMicrophone: () => void;
  onToggleFullscreen: () => void;
}

export function PlayoutControls({
  settings,
  state,
  currentVideo,
  currentIframe,
  currentRaadsvergadering,
  playlist,
  microphoneEnabled,
  isFullscreen,
  showControls,
  onToggleMicrophone,
  onToggleFullscreen,
}: PlayoutControlsProps) {
  const isPlaying = currentVideo !== null || currentIframe !== null || currentRaadsvergadering !== null;

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      style={{ zIndex: 10 }}
    >
      <div className="flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          {/* Audio toggle */}
          <button onClick={onToggleMicrophone} className={`px-4 py-2 rounded-md transition-colors ${microphoneEnabled ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"}`}>
            {settings?.audioSource === "stream" ? "📻" : "🎤"} {microphoneEnabled ? "Audio Aan" : "Audio Uit"}
          </button>

          {/* Fullscreen toggle */}
          <button onClick={onToggleFullscreen} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 transition-colors">
            {isFullscreen ? "⬜ Venster" : "⬛ Fullscreen"}
          </button>
        </div>

        {/* Status info */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-400">
            Status:{" "}
            <span
              className={
                state === "video"
                  ? "text-green-400"
                  : state === "iframe"
                    ? "text-purple-400"
                    : state === "raadsvergadering:waiting"
                      ? "text-yellow-400"
                      : state === "raadsvergadering:playing"
                        ? "text-orange-400"
                        : "text-blue-400"
              }
            >
              {state === "video"
                ? "Video"
                : state === "iframe"
                  ? "Iframe"
                  : state === "raadsvergadering:waiting"
                    ? "Wachten op stream..."
                    : state === "raadsvergadering:playing"
                      ? "Raadsvergadering"
                      : "Kabelkrant"}
            </span>
          </span>
          {(playlist.length > 0 || isPlaying) && (
            <span className="text-gray-400">
              Wachtrij: <span className="text-white">{playlist.length + (isPlaying ? 1 : 0)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
