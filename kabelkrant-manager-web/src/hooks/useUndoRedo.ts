import { useState, useCallback, useRef, useEffect } from "react";

export interface UseUndoRedoOptions<T> {
  maxHistorySize?: number;
  /** Debounce time in ms for adding to history */
  debounceMs?: number;
}

export interface UseUndoRedoReturn<T> {
  /** Current value */
  value: T;
  /** Set value and add to history */
  setValue: (newValue: T) => void;
  /** Undo to previous state, returns new value or undefined if can't undo */
  undo: () => T | undefined;
  /** Redo to next state, returns new value or undefined if can't redo */
  redo: () => T | undefined;
  /** Check if undo is available */
  canUndo: boolean;
  /** Check if redo is available */
  canRedo: boolean;
  /** Reset history with new initial value */
  reset: (newValue: T) => void;
  /** Number of undo steps available */
  undoCount: number;
  /** Number of redo steps available */
  redoCount: number;
}

export function useUndoRedo<T>(initialValue: T, options: UseUndoRedoOptions<T> = {}): UseUndoRedoReturn<T> {
  const { maxHistorySize = 50, debounceMs = 500 } = options;

  const [history, setHistory] = useState<T[]>([initialValue]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use refs to track current state for use in callbacks
  const historyRef = useRef<T[]>([initialValue]);
  const currentIndexRef = useRef(0);

  // Keep refs in sync with state
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const currentValue = history[currentIndex];

  const setValue = useCallback(
    (newValue: T) => {
      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce adding to history
      debounceTimerRef.current = setTimeout(() => {
        const idx = currentIndexRef.current;
        const hist = historyRef.current;

        // Remove any redo states (everything after current index)
        const newHistory = hist.slice(0, idx + 1);

        // Check if the new value is different from the current
        const currentVal = newHistory[newHistory.length - 1];
        if (JSON.stringify(currentVal) === JSON.stringify(newValue)) {
          return;
        }

        // Add new state
        newHistory.push(newValue);

        // Trim history if it exceeds max size
        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
          setHistory(newHistory);
          setCurrentIndex(newHistory.length - 1);
        } else {
          setHistory(newHistory);
          setCurrentIndex(newHistory.length - 1);
        }
      }, debounceMs);
    },
    [maxHistorySize, debounceMs]
  );

  const undo = useCallback((): T | undefined => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const idx = currentIndexRef.current;
    if (idx > 0) {
      const newIndex = idx - 1;
      setCurrentIndex(newIndex);
      currentIndexRef.current = newIndex;
      return historyRef.current[newIndex];
    }
    return undefined;
  }, []);

  const redo = useCallback((): T | undefined => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const idx = currentIndexRef.current;
    const hist = historyRef.current;
    if (idx < hist.length - 1) {
      const newIndex = idx + 1;
      setCurrentIndex(newIndex);
      currentIndexRef.current = newIndex;
      return hist[newIndex];
    }
    return undefined;
  }, []);

  const reset = useCallback((newValue: T) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setHistory([newValue]);
    setCurrentIndex(0);
    historyRef.current = [newValue];
    currentIndexRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    value: currentValue,
    setValue,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    reset,
    undoCount: currentIndex,
    redoCount: history.length - 1 - currentIndex,
  };
}
