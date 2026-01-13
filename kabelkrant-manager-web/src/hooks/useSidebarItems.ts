import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Play, Settings, FileVideo } from "lucide-react";
import { SidebarItemTypes, type SidebarItems, type SidebarItemProgram } from "@/components/sidebar/sidebar";
import type { VideoItem } from "@/lib/types/VideoItem";

export type ActivePage = "programs" | "planning" | "playlist" | "settings";

interface UseSidebarItemsOptions {
  programs: VideoItem[];
  activePage: ActivePage;
  selectedProgramId?: string;
  onAddProgram?: () => void;
  onDeleteProgram?: (index: number) => void;
}

export function useSidebarItems({ programs, activePage, selectedProgramId, onAddProgram, onDeleteProgram }: UseSidebarItemsOptions): SidebarItems {
  const navigate = useNavigate();

  return useMemo<SidebarItems>(
    () => ({
      Blokken: [
        ...programs.map<SidebarItemProgram>((program, index) => ({
          type: SidebarItemTypes.PROGRAM,
          isSelected: program.id === selectedProgramId,
          onSelected: () => {
            navigate({ to: "/programs/$programId", params: { programId: program.id } });
          },
          value: program,
          onClick: () => {
            navigate({ to: "/programs/$programId", params: { programId: program.id } });
          },
          onDelete: onDeleteProgram ? () => onDeleteProgram(index) : undefined,
          icon: FileVideo,
        })),
        {
          type: SidebarItemTypes.BUTTON,
          text: "Voeg nieuw programma toe",
          isAdd: true,
          onClick: onAddProgram ?? (() => navigate({ to: "/programs" })),
        },
      ],
      Navigatie: [
        {
          type: SidebarItemTypes.BUTTON,
          text: "Planning",
          isSelected: activePage === "planning",
          onClick: activePage === "planning" ? () => {} : () => navigate({ to: "/planning" }),
          icon: Calendar,
        },
        {
          type: SidebarItemTypes.BUTTON,
          text: "Speelt nu af",
          isSelected: activePage === "playlist",
          onClick: activePage === "playlist" ? () => {} : () => navigate({ to: "/playlist" }),
          icon: Play,
        },
        {
          type: SidebarItemTypes.BUTTON,
          text: "Instellingen",
          isSelected: activePage === "settings",
          onClick: activePage === "settings" ? () => {} : () => navigate({ to: "/settings" }),
          icon: Settings,
        },
      ],
    }),
    [programs, activePage, selectedProgramId, onAddProgram, onDeleteProgram, navigate]
  );
}
