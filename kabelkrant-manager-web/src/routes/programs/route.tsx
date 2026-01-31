import { createFileRoute, Outlet, useNavigate, useParams, useRouter } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { v4 } from "uuid";
import { TopBar } from "@/components/topBar";
import { Sidebar } from "@/components/sidebar/sidebar";
import type { VideoItem } from "@/lib/types/VideoItem";
import { getPrograms, savePrograms } from "@/server/functions/programs";
import { useRealtimeState } from "@/hooks/useRealtimeState";
import { useSidebarItems } from "@/hooks/useSidebarItems";
import { ProgramsContext } from "@/contexts/ProgramsContext";

export const Route = createFileRoute("/programs")({
  loader: async () => {
    const programs = await getPrograms();
    return { programs };
  },
  staleTime: 0, // Always refetch on navigation
  component: ProgramsLayout,
});

function ProgramsLayout() {
  const { programs } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const { obsConnected, playoutMode } = useRealtimeState();
  const { programId } = useParams({ strict: false }) as { programId?: string };

  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedIndex = programs.findIndex((p) => p.id === programId);

  const clearSaveError = useCallback(() => {
    setSaveError(null);
  }, []);

  async function addProgram() {
    const newProgram: VideoItem = {
      id: v4(),
      path: "",
      programName: "nieuw programma",
      planning: [],
      playAll: true,
      scheduledDates: [],
      programType: "video",
    };
    try {
      setSaveError(null);
      await savePrograms({ data: [...programs, newProgram] });
      await router.invalidate();
      navigate({ to: "/programs/$programId", params: { programId: newProgram.id } });
    } catch (error) {
      console.error("Error saving programs:", error);
      setSaveError(error instanceof Error ? error.message : "Onbekende fout bij opslaan");
    }
  }

  async function deleteItem(index: number) {
    const newPrograms = [...programs];
    newPrograms.splice(index, 1);
    try {
      setSaveError(null);
      await savePrograms({ data: newPrograms });
      await router.invalidate();
      if (selectedIndex === index) {
        navigate({ to: "/programs" });
      }
    } catch (error) {
      console.error("Error saving programs:", error);
      setSaveError(error instanceof Error ? error.message : "Onbekende fout bij opslaan");
    }
  }

  // Update programs and save to server
  const updatePrograms = useCallback(async (newPrograms: VideoItem[]) => {
    try {
      setSaveError(null);
      await savePrograms({ data: newPrograms });
      await router.invalidate();
    } catch (error) {
      console.error("Error saving programs:", error);
      setSaveError(error instanceof Error ? error.message : "Onbekende fout bij opslaan");
    }
  }, [router]);

  const sidebarItems = useSidebarItems({
    programs,
    activePage: "programs",
    selectedProgramId: programId,
    onAddProgram: addProgram,
    onDeleteProgram: deleteItem,
  });

  return (
    <ProgramsContext.Provider value={{ programs, setPrograms: updatePrograms, selectedIndex, saveError, clearSaveError }}>
      <div>
        <TopBar>{playoutMode === "obs" && !obsConnected && <div style={{ color: "red", height: "100%" }}>OBS is niet geopend, dit kan problemen geven</div>}</TopBar>
        <div className="flex gap-5">
          <Sidebar items={sidebarItems} />
          <div className="mt-5 flex-1 bg-white px-5 py-2 rounded-md">
            <Outlet />
          </div>
        </div>
      </div>
    </ProgramsContext.Provider>
  );
}
