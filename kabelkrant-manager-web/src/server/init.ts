import { ObsManager } from "./services/obsManager";
import { VideoPlaylist } from "./services/videoPlaylist";
import { PlayoutEngine } from "./services/playoutEngine";
import { getFileStorage, FileStorage } from "./services/fileStorage";
import { getBrowserPlayout, BrowserPlayout } from "./services/browserPlayout";

export interface KabelkrantServices {
  storage: FileStorage;
  obsManager: ObsManager;
  videoPlaylist: VideoPlaylist;
  playoutEngine: PlayoutEngine;
  browserPlayout: BrowserPlayout;
}

// Store services in globalThis to persist across HMR
declare global {
  // eslint-disable-next-line no-var
  var __kabelkrant_services: KabelkrantServices | undefined;
}

async function createServices(): Promise<KabelkrantServices> {
  console.log("[Server] Starting services...");

  const storage = getFileStorage();
  const obsManager = new ObsManager();
  const videoPlaylist = new VideoPlaylist(obsManager);
  const browserPlayout = getBrowserPlayout();
  const playoutEngine = new PlayoutEngine(storage, videoPlaylist);

  // Connect browser playout to engine
  playoutEngine.setBrowserPlayout(browserPlayout);

  // Wire up OBS events
  obsManager.on("mediaEnded", (data) => videoPlaylist.playNextVideo(data));
  obsManager.on("sceneChanged", (data) => {
    const isVideoScene = obsManager.playouts.some((p) => p.sceneName.toLowerCase() === data.sceneName.toLowerCase());
    if (!isVideoScene) {
      videoPlaylist.removeItemsFromPlaylist();
    }
  });

  // Start background processes
  const settings = storage.getPlayoutSettings();
  if (settings.playoutMode === "obs") {
    await obsManager.startConnectionLoop();
  }
  playoutEngine.startCron();

  console.log("[Server] Services started");
  return { storage, obsManager, videoPlaylist, playoutEngine, browserPlayout };
}

export function stopServices(services: KabelkrantServices): void {
  console.log("[Server] Stopping services...");
  services.playoutEngine.cleanup();
  services.videoPlaylist.cleanup();
  services.obsManager.cleanup();
  services.browserPlayout.cleanup();
}

// Singleton initialization
let initPromise: Promise<KabelkrantServices> | null = null;



export async function initializeServer(): Promise<KabelkrantServices> {
  console.log("[Server] Initializing server...");
  if (globalThis.__kabelkrant_services) {
    return globalThis.__kabelkrant_services;
  }

  if (!initPromise) {
    initPromise = createServices().then((services) => {
      globalThis.__kabelkrant_services = services;
      initPromise = null;
      return services;
    });
  }

  return initPromise;
}

export function getServices(): KabelkrantServices {
  if (!globalThis.__kabelkrant_services) {
    throw new Error("Server not initialized");
  }
  return globalThis.__kabelkrant_services;
}

console.log("[Server] Module loaded", import.meta.url);

// HMR: cleanup old services before new code loads
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    console.log("[Server] HMR Dispose - cleaning up services");
    if (globalThis.__kabelkrant_services) {
      stopServices(globalThis.__kabelkrant_services);
      globalThis.__kabelkrant_services = undefined;
    }
  });
  import.meta.hot.accept();
}
