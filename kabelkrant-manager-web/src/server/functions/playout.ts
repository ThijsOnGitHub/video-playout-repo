import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getFileStorage } from "../services/fileStorage";
import { getBrowserPlayout, type ClientStatus } from "../services/browserPlayout";
import type { PlayoutSettings } from "@/lib/types/PlayoutSettings";

const playoutSettingsSchema = z.object({
  kabelkrantUrl: z.string(),
  resolution: z.object({
    width: z.number(),
    height: z.number(),
  }),
  playoutMode: z.enum(["obs", "browser"]),
  fadeTransitionDuration: z.number(),
  audioCrossfadeDuration: z.number(),
  audioSource: z.enum(["microphone", "stream", "none"]),
  audioStreamUrl: z.string(),
});

// Get playout settings
export const getPlayoutSettings = createServerFn({ method: "GET" }).handler(async () => {
  const storage = getFileStorage();
  return storage.getPlayoutSettings();
});

// Save playout settings
export const savePlayoutSettings = createServerFn({ method: "POST" })
  .inputValidator(playoutSettingsSchema)
  .handler(async ({ data }) => {
    const storage = getFileStorage();
    storage.savePlayoutSettings(data as PlayoutSettings);

    // Broadcast settings update to all connected playout clients
    const browserPlayout = getBrowserPlayout();
    browserPlayout.broadcastSettingsUpdate(data as PlayoutSettings);

    return { success: true };
  });

// Get all connected clients with their status
export const getPlayoutClients = createServerFn({ method: "GET" }).handler(async (): Promise<ClientStatus[]> => {
  const browserPlayout = getBrowserPlayout();
  return browserPlayout.getAllClientStatuses();
});

// Clear the browser playout playlist for all clients
export const clearBrowserPlaylist = createServerFn({ method: "POST" }).handler(async () => {
  const browserPlayout = getBrowserPlayout();
  browserPlayout.clearPlaylist();
  return { success: true };
});

// Clear playlist for a specific client
export const clearClientPlaylist = createServerFn({ method: "POST" })
  .inputValidator(z.object({ clientId: z.string() }))
  .handler(async ({ data }) => {
    const browserPlayout = getBrowserPlayout();
    const success = browserPlayout.clearClientPlaylist(data.clientId);
    return { success };
  });

// Add videos to a specific client
export const addVideosToClient = createServerFn({ method: "POST" })
  .inputValidator(z.object({ clientId: z.string(), videoPaths: z.array(z.string()) }))
  .handler(async ({ data }) => {
    const browserPlayout = getBrowserPlayout();
    const success = await browserPlayout.addVideosToClient(data.clientId, data.videoPaths);
    return { success };
  });

// Remove item from client playlist
export const removeItemFromPlaylist = createServerFn({ method: "POST" })
  .inputValidator(z.object({ clientId: z.string(), index: z.number() }))
  .handler(async ({ data }) => {
    const browserPlayout = getBrowserPlayout();
    const success = browserPlayout.removeItemFromClient(data.clientId, data.index);
    return { success };
  });

// Stop current item on client
export const stopCurrentItem = createServerFn({ method: "POST" })
  .inputValidator(z.object({ clientId: z.string() }))
  .handler(async ({ data }) => {
    const browserPlayout = getBrowserPlayout();
    const success = browserPlayout.stopCurrentItem(data.clientId);
    return { success };
  });

// Force start stream on client (manual trigger for raadsvergadering)
export const forceStartStream = createServerFn({ method: "POST" })
  .inputValidator(z.object({ clientId: z.string() }))
  .handler(async ({ data }) => {
    const browserPlayout = getBrowserPlayout();
    const success = browserPlayout.forceStartStream(data.clientId);
    return { success };
  });
