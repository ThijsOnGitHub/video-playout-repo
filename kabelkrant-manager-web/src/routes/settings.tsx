import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/topBar";
import { Sidebar } from "@/components/sidebar/sidebar";
import { useRealtimeState } from "@/hooks/useRealtimeState";
import { useSidebarItems } from "@/hooks/useSidebarItems";
import { getPrograms } from "@/server/functions/programs";
import { getPlayoutSettings, savePlayoutSettings } from "@/server/functions/playout";
import { useState } from "react";
import type { ProgramFormSchema } from "@/lib/schemas/program";
import type { PlayoutSettings } from "@/lib/types/PlayoutSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/settings")({
  loader: async () => {
    const [programs, playoutSettings] = await Promise.all([getPrograms(), getPlayoutSettings()]);
    return { programs, playoutSettings };
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { programs, playoutSettings: initialSettings } = Route.useLoaderData();
  const { obsConnected } = useRealtimeState();

  const [settings, setSettings] = useState<PlayoutSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const sidebarItems = useSidebarItems({
    programs: programs as ProgramFormSchema[],
    activePage: "settings",
  });

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await savePlayoutSettings({ data: settings });
      setSaveMessage("Instellingen opgeslagen!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveMessage("Fout bij opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  const openPlayoutWindow = () => {
    const width = settings.resolution.width;
    const height = settings.resolution.height;
    window.open("/playout", "kabelkrant-playout", `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`);
  };

  return (
    <div>
      <TopBar>{settings.playoutMode === "obs" && !obsConnected && <div style={{ color: "red", height: "100%" }}>OBS is niet geopend, dit kan problemen geven</div>}</TopBar>
      <div className="flex gap-5">
        <Sidebar items={sidebarItems} />
        <div className="mt-5 flex-1 bg-white px-5 py-2 rounded-md">
          <div className="flex flex-col gap-6 max-w-2xl">
            <h3 className="text-xl font-semibold">Instellingen</h3>

            {/* Playout Mode */}
            <Card>
              <CardHeader>
                <CardTitle>Playout Modus</CardTitle>
                <CardDescription>Kies hoe video's worden afgespeeld</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="playoutMode">Modus</Label>
                  <Select value={settings.playoutMode} onValueChange={(value: "obs" | "browser") => setSettings({ ...settings, playoutMode: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="browser">Browser (geen OBS nodig)</SelectItem>
                      <SelectItem value="obs">OBS Studio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settings.playoutMode === "browser" && (
                  <Button onClick={openPlayoutWindow} variant="outline">
                    🖥️ Open Playout Venster
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Kabelkrant URL */}
            <Card>
              <CardHeader>
                <CardTitle>Kabelkrant</CardTitle>
                <CardDescription>De website die wordt getoond wanneer er geen video's spelen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="kabelkrantUrl">Kabelkrant URL</Label>
                  <Input
                    id="kabelkrantUrl"
                    type="url"
                    placeholder="https://voorbeeld.nl/kabelkrant"
                    value={settings.kabelkrantUrl}
                    onChange={(e) => setSettings({ ...settings, kabelkrantUrl: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Resolution */}
            <Card>
              <CardHeader>
                <CardTitle>Resolutie</CardTitle>
                <CardDescription>De output resolutie voor de playout</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="width">Breedte (px)</Label>
                    <Input
                      id="width"
                      type="number"
                      value={settings.resolution.width}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          resolution: { ...settings.resolution, width: parseInt(e.target.value) || 1920 },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Hoogte (px)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={settings.resolution.height}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          resolution: { ...settings.resolution, height: parseInt(e.target.value) || 1080 },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSettings({ ...settings, resolution: { width: 1920, height: 1080 } })}>
                    1920×1080 (Full HD)
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSettings({ ...settings, resolution: { width: 1280, height: 720 } })}>
                    1280×720 (HD)
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSettings({ ...settings, resolution: { width: 3840, height: 2160 } })}>
                    3840×2160 (4K)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Audio Source */}
            <Card>
              <CardHeader>
                <CardTitle>Audio Bron</CardTitle>
                <CardDescription>De audio die wordt afgespeeld wanneer de kabelkrant wordt getoond</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="audioSource">Audio bron</Label>
                  <Select value={settings.audioSource} onValueChange={(value: "microphone" | "stream" | "none") => setSettings({ ...settings, audioSource: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen audio</SelectItem>
                      <SelectItem value="microphone">Microfoon / Audio input</SelectItem>
                      <SelectItem value="stream">Webstream URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settings.audioSource === "stream" && (
                  <div className="space-y-2">
                    <Label htmlFor="audioStreamUrl">Stream URL</Label>
                    <Input
                      id="audioStreamUrl"
                      type="url"
                      placeholder="https://stream.voorbeeld.nl/radio.mp3"
                      value={settings.audioStreamUrl}
                      onChange={(e) => setSettings({ ...settings, audioStreamUrl: e.target.value })}
                    />
                    <p className="text-sm text-gray-500">URL naar een audio stream (bijv. Icecast, Shoutcast)</p>
                  </div>
                )}

                {settings.audioSource === "microphone" && <p className="text-sm text-gray-500">De browser zal om toestemming vragen voor de microfoon/audio input.</p>}
              </CardContent>
            </Card>

            {/* Transitions */}
            <Card>
              <CardHeader>
                <CardTitle>Overgangen</CardTitle>
                <CardDescription>Instellingen voor fade overgangen tussen video's en kabelkrant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fadeTransition">Video fade duur (ms)</Label>
                  <Input
                    id="fadeTransition"
                    type="number"
                    min={0}
                    max={5000}
                    step={100}
                    value={settings.fadeTransitionDuration}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        fadeTransitionDuration: parseInt(e.target.value) || 500,
                      })
                    }
                  />
                  <p className="text-sm text-gray-500">Fade duur voor video zichtbaarheid. Stel in op 0 voor directe overgangen.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audioCrossfade">Audio crossfade duur (ms)</Label>
                  <Input
                    id="audioCrossfade"
                    type="number"
                    min={0}
                    max={5000}
                    step={100}
                    value={settings.audioCrossfadeDuration}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        audioCrossfadeDuration: parseInt(e.target.value) || 1500,
                      })
                    }
                  />
                  <p className="text-sm text-gray-500">Crossfade tussen radio/mic audio en video audio. Aanbevolen: 1500ms.</p>
                </div>
              </CardContent>
            </Card>

            {/* Save button */}
            <div className="flex items-center gap-4">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Opslaan..." : "Opslaan"}
              </Button>
              {saveMessage && <span className={saveMessage.includes("Fout") ? "text-red-500" : "text-green-500"}>{saveMessage}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
