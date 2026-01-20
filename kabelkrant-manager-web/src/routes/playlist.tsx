import { createFileRoute } from "@tanstack/react-router";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { FileVideo, Trash2, Monitor, Wifi, WifiOff, Globe, X, Square, Video, Play } from "lucide-react";
import { TopBar } from "@/components/topBar";
import { Sidebar } from "@/components/sidebar/sidebar";
import { useRealtimeState } from "@/hooks/useRealtimeState";
import { useSidebarItems } from "@/hooks/useSidebarItems";
import { getPrograms } from "@/server/functions/programs";
import { clearBrowserPlaylist, clearClientPlaylist, removeItemFromPlaylist, stopCurrentItem, forceStartStream } from "@/server/functions/playout";
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

  const totalVideos = clients.reduce((sum, client) => sum + (client.currentItem ? 1 : 0) + client.playlist.length, 0);

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
                        <Badge
                          variant={
                            client.state === "video" || client.state === "iframe" || client.state === "raadsvergadering:playing"
                              ? "default"
                              : client.state === "raadsvergadering:waiting"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {client.state === "video"
                            ? "Video"
                            : client.state === "iframe"
                              ? "Iframe"
                              : client.state === "raadsvergadering:waiting"
                                ? "Wachten op stream"
                                : client.state === "raadsvergadering:playing"
                                  ? "Raadsvergadering"
                                  : "Kabelkrant"}
                        </Badge>
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
                          disabled={!client.currentItem && client.playlist.length === 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Current item (video, iframe or raadsvergadering) */}
                    {client.currentItem && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">Nu aan het afspelen:</p>
                        <div
                          className={`flex items-center justify-between gap-2 p-2 rounded border ${
                            client.currentItem.type === "iframe"
                              ? "bg-purple-50 border-purple-200"
                              : client.currentItem.type === "raadsvergadering"
                                ? client.state === "raadsvergadering:waiting"
                                  ? "bg-yellow-50 border-yellow-200"
                                  : "bg-orange-50 border-orange-200"
                                : "bg-green-50 border-green-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {client.currentItem.type === "iframe" ? (
                              <Globe className="h-4 w-4 text-purple-600 flex-shrink-0" />
                            ) : client.currentItem.type === "raadsvergadering" ? (
                              <Video className={`h-4 w-4 flex-shrink-0 ${client.state === "raadsvergadering:waiting" ? "text-yellow-600 animate-pulse" : "text-orange-600"}`} />
                            ) : (
                              <FileVideo className="h-4 w-4 text-green-600 flex-shrink-0" />
                            )}
                            <span className="text-sm truncate">
                              {client.currentItem.type === "iframe"
                                ? client.currentItem.url
                                : client.currentItem.type === "raadsvergadering"
                                  ? client.state === "raadsvergadering:waiting"
                                    ? `Wachten op stream: ${client.currentItem.webcastId}`
                                    : `Raadsvergadering: ${client.currentItem.webcastId}`
                                  : client.currentItem.path}
                            </span>
                            {client.currentItem.type === "iframe" && (
                              <span className="text-xs text-gray-500 flex-shrink-0">({client.currentItem.durationSeconds !== null ? `${client.currentItem.durationSeconds}s` : "∞"})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Show Start button when waiting for raadsvergadering stream */}
                            {client.state === "raadsvergadering:waiting" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 hover:bg-green-100"
                                onClick={async () => {
                                  await forceStartStream({ data: { clientId: client.id } });
                                }}
                              >
                                <Play className="h-3 w-3 text-green-600 mr-1" />
                                <span className="text-xs text-green-600">Start</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 hover:bg-red-100"
                              onClick={async () => {
                                await stopCurrentItem({ data: { clientId: client.id } });
                              }}
                            >
                              <Square className="h-3 w-3 text-red-500 mr-1" />
                              <span className="text-xs text-red-500">Stop</span>
                            </Button>
                          </div>
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
                              {client.playlist.map((item, index) => (
                                <CommandItem key={`${item.type === "video" ? item.path : item.type === "iframe" ? item.url : item.webcastId}-${index}`} className="text-sm justify-between">
                                  <div className="flex items-center">
                                    {item.type === "iframe" ? (
                                      <Globe className="mr-2 h-4 w-4 text-purple-500" />
                                    ) : item.type === "raadsvergadering" ? (
                                      <Video className="mr-2 h-4 w-4 text-orange-500" />
                                    ) : (
                                      <FileVideo className="mr-2 h-4 w-4" />
                                    )}
                                    <span className="truncate">{item.type === "iframe" ? item.url : item.type === "raadsvergadering" ? `Raadsvergadering: ${item.webcastId}` : item.path}</span>
                                    {item.type === "iframe" && <span className="ml-2 text-xs text-gray-500">({item.durationSeconds !== null ? `${item.durationSeconds}s` : "∞"})</span>}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-red-100"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await removeItemFromPlaylist({ data: { clientId: client.id, index } });
                                    }}
                                  >
                                    <X className="h-3 w-3 text-gray-500 hover:text-red-500" />
                                  </Button>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </div>
                    )}

                    {/* Empty state */}
                    {!client.currentItem && client.playlist.length === 0 && <p className="text-sm text-gray-400">Geen items in de wachtrij</p>}
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
