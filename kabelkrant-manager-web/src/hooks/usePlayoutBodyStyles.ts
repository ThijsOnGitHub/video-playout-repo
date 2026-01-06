import { useEffect } from "react";

/**
 * Hook to override body styles for the playout page.
 * Sets black background, removes padding, and hides overflow.
 * Restores original styles on unmount.
 */
export function usePlayoutBodyStyles(): void {
  useEffect(() => {
    // Store original values
    const originalStyles = {
      paddingTop: document.body.style.paddingTop,
      backgroundColor: document.body.style.backgroundColor,
      minHeight: document.body.style.minHeight,
      margin: document.body.style.margin,
      overflow: document.body.style.overflow,
    };

    // Apply playout styles
    document.body.style.paddingTop = "0";
    document.body.style.backgroundColor = "#000";
    document.body.style.minHeight = "100vh";
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";

    // Restore on unmount
    return () => {
      document.body.style.paddingTop = originalStyles.paddingTop;
      document.body.style.backgroundColor = originalStyles.backgroundColor;
      document.body.style.minHeight = originalStyles.minHeight;
      document.body.style.margin = originalStyles.margin;
      document.body.style.overflow = originalStyles.overflow;
    };
  }, []);
}
