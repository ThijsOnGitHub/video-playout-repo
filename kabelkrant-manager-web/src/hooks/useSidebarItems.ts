import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Play, Settings, FileVideo, Landmark } from "lucide-react";
import { SidebarItemTypes, type SidebarItems, type SidebarItemProgram } from "@/components/sidebar/sidebar";
import type { VideoItem } from "@/lib/types/VideoItem";

export type ActivePage = "programs" | "planning" | "playlist" | "settings" | "raadsvergadering";

interface UseSidebarItemsOptions {
  programs: VideoItem[];
  activePage: ActivePage;
  selectedProgramId?: string;
  onAddProgram?: () => void;
  onDeleteProgram?: (index: number) => void;
}

// Format a scheduled date for display in the sidebar
function formatScheduledDate(program: VideoItem): string | undefined {
  const firstScheduled = program.scheduledDates?.[0];
  if (!firstScheduled?.dateTime) return undefined;

  const date = new Date(firstScheduled.dateTime);
  return date.toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function useSidebarItems({ programs, activePage, selectedProgramId, onAddProgram, onDeleteProgram }: UseSidebarItemsOptions): SidebarItems {
  const navigate = useNavigate();

  // Separate raadsvergadering programs from regular programs
  const regularPrograms = programs.filter((p) => p.programType !== "raadsvergadering");
  const raadsvergaderingPrograms = programs.filter((p) => p.programType === "raadsvergadering");

  return useMemo<SidebarItems>(
    () => ({
      Blokken: [
        ...regularPrograms.map<SidebarItemProgram>((program) => {
          const originalIndex = programs.findIndex((p) => p.id === program.id);
          return {
            type: SidebarItemTypes.PROGRAM,
            isSelected: program.id === selectedProgramId,
            onSelected: () => {
              navigate({ to: "/programs/$programId", params: { programId: program.id } });
            },
            value: program,
            onClick: () => {
              navigate({ to: "/programs/$programId", params: { programId: program.id } });
            },
            onDelete: onDeleteProgram ? () => onDeleteProgram(originalIndex) : undefined,
            icon: FileVideo,
          };
        }),
        {
          type: SidebarItemTypes.BUTTON,
          text: "Voeg nieuw programma toe",
          isAdd: true,
          onClick: onAddProgram ?? (() => navigate({ to: "/programs" })),
        },
      ],
      Raadsvergadering: [
        ...raadsvergaderingPrograms.map<SidebarItemProgram>((program) => {
          const originalIndex = programs.findIndex((p) => p.id === program.id);
          return {
            type: SidebarItemTypes.PROGRAM,
            isSelected: program.id === selectedProgramId,
            onSelected: () => {
              navigate({ to: "/programs/$programId", params: { programId: program.id } });
            },
            value: program,
            onClick: () => {
              navigate({ to: "/programs/$programId", params: { programId: program.id } });
            },
            onDelete: onDeleteProgram ? () => onDeleteProgram(originalIndex) : undefined,
            icon: Landmark,
            subtitle: formatScheduledDate(program),
          };
        }),
        {
          type: SidebarItemTypes.BUTTON,
          text: "Toevoegen",
          isAdd: true,
          onClick: () => navigate({ to: "/raadsvergadering" }),
          icon: Landmark,
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
