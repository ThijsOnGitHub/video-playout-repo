import { useEffect, useRef } from "react";
import type { CurrentIframe, PlayoutState } from "@/lib/types/playout";

interface UseIframeTimerOptions {
  /** Current iframe being displayed (null = no iframe) */
  currentIframe: CurrentIframe | null;
  /** Current playout state */
  state: PlayoutState;
  /** Unique key to detect iframe changes */
  itemKey: number;
  /** Callback when iframe duration ends */
  onDurationEnd: () => void;
}

/**
 * Hook to manage iframe duration timer.
 * Starts a timer when an iframe with a duration is shown, calls onDurationEnd when it expires.
 * If durationSeconds is null, the iframe plays indefinitely (no timer).
 */
export function useIframeTimer({ currentIframe, state, itemKey, onDurationEnd }: UseIframeTimerOptions): void {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Only start timer if we have an iframe with a defined duration
    if (currentIframe && state === "iframe" && currentIframe.durationSeconds !== null) {
      console.log(`[IframeTimer] Starting timer for ${currentIframe.durationSeconds} seconds`);

      timerRef.current = setTimeout(() => {
        console.log("[IframeTimer] Duration ended");
        onDurationEnd();
      }, currentIframe.durationSeconds * 1000);
    } else if (currentIframe && state === "iframe") {
      console.log("[IframeTimer] Iframe has no duration limit (infinite)");
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentIframe, state, itemKey, onDurationEnd]);
}
