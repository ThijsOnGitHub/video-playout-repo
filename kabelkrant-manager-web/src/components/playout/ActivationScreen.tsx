import type { PlayoutSettings } from "@/lib/types/PlayoutSettings";

interface ActivationScreenProps {
  settings: PlayoutSettings | undefined;
  clientId: string | null;
  resolution: { width: number; height: number };
  onActivate: () => void;
}

export function ActivationScreen({ settings, clientId, resolution, onActivate }: ActivationScreenProps) {
  return (
    <div
      className="flex items-center justify-center bg-gray-900 cursor-pointer"
      style={{
        width: resolution.width,
        height: resolution.height,
        maxWidth: "100vw",
        maxHeight: "100vh",
      }}
      onClick={onActivate}
    >
      <div className="text-center text-white">
        <div className="text-6xl mb-6">▶️</div>
        <h1 className="text-3xl font-bold mb-4">Klik om te starten</h1>
        <p className="text-gray-400 mb-2">Browser vereist gebruikersinteractie voor audio</p>
        {settings?.audioSource === "microphone" && <p className="text-blue-400 text-sm mb-2">🎤 Microfoon wordt automatisch geactiveerd</p>}
        {settings?.audioSource === "stream" && <p className="text-blue-400 text-sm mb-2">📻 Audio stream wordt automatisch gestart</p>}
        {settings?.audioSource === "none" && <p className="text-gray-500 text-sm mb-2">Geen audio bron geconfigureerd</p>}
        <p className="text-gray-500 text-sm">Klik ergens op het scherm om de playout te activeren</p>
        {clientId && <p className="text-gray-600 text-xs mt-4">Client ID: {clientId.slice(0, 8)}...</p>}
      </div>
    </div>
  );
}
