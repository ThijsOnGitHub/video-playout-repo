import { useEffect } from "react";
import type { CurrentVideo } from "@/lib/types/playout";

interface UseVideoPlayerOptions {
  /** Reference to the video element */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Current video to play (null = no video) */
  currentVideo: CurrentVideo | null;
  /** Unique key to detect video changes */
  itemKey: number;
}

/**
 * Hook to manage video element source.
 * Updates the video src when currentVideo changes and handles loading.
 */
export function useVideoPlayer({ videoRef, currentVideo, itemKey }: UseVideoPlayerOptions): void {
  useEffect(() => {
    if (!videoRef.current) return;

    if (currentVideo?.url) {
      console.log(`[VideoPlayer] Setting video src: ${currentVideo.url} (key: ${itemKey})`);
      videoRef.current.src = currentVideo.url;
      videoRef.current.load();
    } else {
      videoRef.current.src = "";
    }
  }, [currentVideo, itemKey, videoRef]);
}
