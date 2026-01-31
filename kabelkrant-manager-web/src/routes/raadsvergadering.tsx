import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { TopBar } from "@/components/topBar";
import { Sidebar } from "@/components/sidebar/sidebar";
import { useRealtimeState } from "@/hooks/useRealtimeState";
import { useSidebarItems } from "@/hooks/useSidebarItems";
import { getPrograms, savePrograms } from "@/server/functions/programs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StreamSelector } from "@/components/editpage/StreamSelector";
import { v4 } from "uuid";
import type { VideoItem } from "@/lib/types/VideoItem";

export const Route = createFileRoute("/raadsvergadering")({
  loader: async () => {
    const programs = await getPrograms();
    return { programs };
  },
  staleTime: 0,
  component: RaadsvergaderingPage,
});

function RaadsvergaderingPage() {
  const { programs } = Route.useLoaderData();
  const { obsConnected, playoutMode } = useRealtimeState();
  const navigate = useNavigate();
  const router = useRouter();

  const sidebarItems = useSidebarItems({
    programs,
    activePage: "raadsvergadering",
  });

  // Get existing webcast codes to warn about duplicates
  const existingWebcastCodes = programs
    .filter((p) => p.programType === "raadsvergadering" && p.webcastCode)
    .map((p) => p.webcastCode!);

  const handleStreamSelect = async (stream: {
    webcastId: string;
    webcastCode: string;
    title: string;
    scheduledStart: string;
  }) => {
    // Create a new program with raadsvergadering data
    const newProgram: VideoItem = {
      id: v4(),
      path: "",
      programName: stream.title,
      planning: [],
      playAll: false,
      programType: "raadsvergadering",
      webcastId: stream.webcastId,
      webcastCode: stream.webcastCode,
      scheduledDates: [
        {
          id: v4(),
          dateTime: stream.scheduledStart,
          note: `Raadsvergadering: ${stream.title}`,
        },
      ],
    };

    // Save the new program
    const updatedPrograms = [...programs, newProgram];
    await savePrograms({ data: updatedPrograms });

    // Invalidate router cache so /programs gets fresh data
    await router.invalidate();

    // Navigate to the program edit page
    navigate({ to: "/programs/$programId", params: { programId: newProgram.id } });
  };

  return (
    <div>
      <TopBar>
        {playoutMode === "obs" && !obsConnected && (
          <div style={{ color: "red", height: "100%" }}>OBS is niet geopend, dit kan problemen geven</div>
        )}
      </TopBar>
      <div className="flex gap-5">
        <Sidebar items={sidebarItems} />
        <div className="mt-5 flex-1 bg-white px-5 py-4 rounded-md">
          <Card>
            <CardHeader>
              <CardTitle>Raadsvergadering Toevoegen</CardTitle>
              <CardDescription>
                Selecteer een raadsvergadering uit de beschikbare streams van CompanyWebcast.
                Na selectie wordt een nieuw programma aangemaakt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StreamSelector onStreamSelect={handleStreamSelect} existingWebcastCodes={existingWebcastCodes} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
