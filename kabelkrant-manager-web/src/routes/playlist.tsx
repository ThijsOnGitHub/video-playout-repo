import { createFileRoute } from "@tanstack/react-router";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { FileVideo, Trash2, Monitor, Wifi, WifiOff } from "lucide-react";
import { TopBar } from "@/components/topBar";
import { Sidebar } from "@/components/sidebar/sidebar";
import { useRealtimeState } from "@/hooks/useRealtimeState";
import { useSidebarItems } from "@/hooks/useSidebarItems";
import { getPrograms } from "@/server/functions/programs";
import { clearBrowserPlaylist, clearClientPlaylist } from "@/server/functions/playout";
import type { ProgramFormSchema } from "@/lib/schemas/program";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/playlist")({
  loader: async () => {
    const programs = await getPrograms();
    return { programs };
  },
  component: PlaylistPage,
});

function PlaylistPage() {
  const { programs } = Route.useLoaderData();
  const { obsConnected, clients, playoutMode } = useRealtimeState();

  const sidebarItems = useSidebarItems({
    programs: programs as ProgramFormSchema[],
    activePage: "playlist",
  });

  const totalVideos = clients.reduce((sum, client) => sum + (client.currentVideo ? 1 : 0) + client.playlist.length, 0);

  return (
    <div>
      <TopBar>{playoutMode === "obs" && !obsConnected && <div style={{ color: "red", height: "100%" }}>OBS is niet geopend, dit kan problemen geven</div>}</TopBar>
      <div className="flex gap-5">
        <Sidebar items={sidebarItems} />
        <div className="mt-5 flex-1 bg-white px-5 py-4 rounded-md">
          <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Playout Clients</h3>
                <p className="text-sm text-gray-500">
                  {clients.length} {clients.length === 1 ? "client" : "clients"} verbonden
                </p>
              </div>
              {totalVideos > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    await clearBrowserPlaylist();
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Alle playlists legen
                </Button>
              )}
            </div>

            {/* No clients message */}
            {clients.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                <WifiOff className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                <p>Geen playout clients verbonden</p>
                <p className="text-sm mt-1">Open /playout in een browser om te beginnen</p>
              </div>
            )}

            {/* Client cards */}
            <div className="grid gap-4">
              {clients.map((client) => (
                <Card key={client.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-gray-500" />
                        <CardTitle className="text-base">Client {client.id.slice(0, 8)}...</CardTitle>
                        <Badge variant={client.state === "video" ? "default" : "secondary"}>{client.state === "video" ? "Video" : client.state === "transitioning" ? "Overgang" : "Kabelkrant"}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wifi className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-gray-500">Verbonden sinds {new Date(client.connectedAt).toLocaleTimeString()}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await clearClientPlaylist({ data: { clientId: client.id } });
                          }}
                          disabled={!client.currentVideo && client.playlist.length === 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Current video */}
                    {client.currentVideo && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">Nu aan het afspelen:</p>
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                          <FileVideo className="h-4 w-4 text-green-600" />
                          <span className="text-sm truncate">{client.currentVideo.path}</span>
                        </div>
                      </div>
                    )}

                    {/* Queue */}
                    {client.playlist.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Wachtrij ({client.playlist.length}):</p>
                        <Command className="border rounded">
                          <CommandList>
                            <CommandGroup>
                              {client.playlist.map((video, index) => (
                                <CommandItem key={`${video.path}-${index}`} className="text-sm">
                                  <FileVideo className="mr-2 h-4 w-4" />
                                  <span className="truncate">{video.path}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </div>
                    )}

                    {/* Empty state */}
                    {!client.currentVideo && client.playlist.length === 0 && <p className="text-sm text-gray-400">Geen video's in de wachtrij</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
