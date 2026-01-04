import { createContext, useContext } from "react";
import type { VideoItem } from "@/lib/types/VideoItem";

interface ProgramsContextValue {
  programs: VideoItem[];
  setPrograms: (programs: VideoItem[]) => void;
  selectedIndex: number;
}

export const ProgramsContext = createContext<ProgramsContextValue | null>(null);

export function useProgramsContext() {
  const context = useContext(ProgramsContext);
  if (!context) {
    throw new Error("useProgramsContext must be used within a ProgramsContext.Provider");
  }
  return context;
}
