import { createFileRoute, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
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
  const { programs: initialPrograms } = Route.useLoaderData();
  const navigate = useNavigate();
  const { obsConnected, playoutMode } = useRealtimeState();
  // Use useParams from @tanstack/react-router to get params from child routes
  const { programId } = useParams({ strict: false }) as { programId?: string };

  const [programs, setPrograms] = useState<VideoItem[]>(initialPrograms);
  const [firstRender, setFirstRender] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedIndex = programs.findIndex((p) => p.id === programId);

  const clearSaveError = useCallback(() => {
    setSaveError(null);
  }, []);

  function addProgram() {
    const newProgram: VideoItem = {
      id: v4(),
      path: "",
      programName: "nieuw programma",
      planning: [],
      playAll: true,
      scheduledDates: [],
      programType: "video",
    };
    setPrograms([...programs, newProgram]);
    navigate({ to: "/programs/$programId", params: { programId: newProgram.id } });
  }

  function deleteItem(index: number) {
    const newPrograms = [...programs];
    newPrograms.splice(index, 1);
    setPrograms(newPrograms);
    if (selectedIndex === index) {
      navigate({ to: "/programs" });
    }
  }

  useEffect(() => {
    if (firstRender) {
      setFirstRender(false);
      return;
    }

    const doSave = async () => {
      try {
        setSaveError(null);
        console.log("saving programs");
        await savePrograms({ data: programs });
      } catch (error) {
        console.error("Error saving programs:", error);
        const errorMessage = error instanceof Error ? error.message : "Onbekende fout bij opslaan";
        setSaveError(errorMessage);
      }
    };

    doSave();
  }, [programs, firstRender]);

  const sidebarItems = useSidebarItems({
    programs,
    activePage: "programs",
    selectedProgramId: programId,
    onAddProgram: addProgram,
    onDeleteProgram: deleteItem,
  });

  return (
    <ProgramsContext.Provider value={{ programs, setPrograms, selectedIndex, saveError, clearSaveError }}>
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
