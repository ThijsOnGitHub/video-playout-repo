/**
 * Shared types for the playout system
 */

/** Legacy OBS playout config */
export interface Playout {
  sceneName: string;
  videoSource: string;
}

/** Possible states of the playout */
export type PlayoutState = "kabelkrant" | "video" | "iframe" | "raadsvergadering";

/** Video item in the playlist */
export interface PlaylistVideoItem {
  type: "video";
  path: string;
  url: string;
}

/** Iframe item in the playlist */
export interface PlaylistIframeItem {
  type: "iframe";
  url: string;
  durationSeconds: number | null; // null = infinite
  muted: boolean;
}

/** Raadsvergadering (CompanyWebcast) item in the playlist */
export interface PlaylistRaadsvergaderingItem {
  type: "raadsvergadering";
  webcastId: string;
}

/** Union type for all playlist items */
export type ClientPlaylistItem = PlaylistVideoItem | PlaylistIframeItem | PlaylistRaadsvergaderingItem;

/** Current video info (when playing a video) */
export interface CurrentVideo {
  path: string;
  url: string;
}

/** Current iframe info (when playing an iframe) */
export interface CurrentIframe {
  url: string;
  durationSeconds: number | null;
  muted: boolean;
}

/** Current raadsvergadering info (when playing a raadsvergadering) */
export interface CurrentRaadsvergadering {
  webcastId: string;
}

/** CompanyWebcast Player instance */
export interface CwcPlayer {
  element: HTMLElement;
  on: (event: string, callback: (data: unknown) => void) => void;
  seek: (options: { timestamp?: number; walltime?: string }) => void;
}

/** CompanyWebcast SDK on window */
export interface CwcSdk {
  sdk: {
    player: {
      client: {
        createPlayer: (options: { id: string; autoplay?: boolean | number | string; display?: number }) => CwcPlayer;
      };
    };
  };
}

// Extend Window interface for CompanyWebcast SDK
declare global {
  interface Window {
    cwc?: CwcSdk;
  }
}
