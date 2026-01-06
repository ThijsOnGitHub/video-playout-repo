import { EventEmitter } from "events";
import path from "path";
import { randomUUID } from "crypto";
import type { PlayoutSettings } from "@/lib/types/PlayoutSettings";

export interface BrowserPlayoutEvent {
  type: "addVideos" | "addIframe" | "addRaadsvergadering" | "clearPlaylist" | "removeItem" | "stopCurrent" | "currentPlaylist" | "settingsUpdate";
  data?: unknown;
}

export interface AdminStatusEvent {
  type: "clientsUpdate" | "settingsUpdate";
  data?: unknown;
}

export interface ClientsUpdateData {
  clients: ClientStatus[];
}

export interface RemoveItemData {
  index: number;
}

export interface PlaylistVideoItem {
  type: "video";
  path: string;
  url: string;
}

export interface PlaylistIframeItem {
  type: "iframe";
  url: string;
  durationSeconds: number | null; // null = infinite duration
  muted: boolean;
}

export interface PlaylistRaadsvergaderingItem {
  type: "raadsvergadering";
  webcastId: string; // CompanyWebcast ID
}

export type PlaylistItem = PlaylistVideoItem | PlaylistIframeItem | PlaylistRaadsvergaderingItem;

// Legacy interface for backwards compatibility
export interface VideoItem {
  path: string;
  url: string;
}

export interface AddVideosData {
  videos: VideoItem[];
}

export interface AddIframeData {
  iframe: PlaylistIframeItem;
}

export interface AddRaadsvergaderingData {
  raadsvergadering: PlaylistRaadsvergaderingItem;
}

export interface CurrentPlaylistData {
  items: PlaylistItem[];
}

/** Status of a connected playout client */
export interface ClientStatus {
  id: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  currentVideo: VideoItem | null;
  currentItem: PlaylistItem | null;
  playlist: PlaylistItem[];
  state: "kabelkrant" | "video" | "iframe" | "raadsvergadering";
}

/** Client info stored on server */
interface ConnectedClient {
  id: string;
  callback: (event: BrowserPlayoutEvent) => void;
  status: ClientStatus;
}

/** Admin listener for status updates */
interface AdminListener {
  id: string;
  callback: (event: AdminStatusEvent) => void;
}

/**
 * BrowserPlayout manages video playback for browser-based playout clients.
 * - Server sends addVideos events to clients
 * - Clients report their status back to server
 * - Server can view and control individual client playlists
 */
export class BrowserPlayout extends EventEmitter {
  private connectedClients: Map<string, ConnectedClient> = new Map();
  private adminListeners: Map<string, AdminListener> = new Map();

  constructor() {
    super();
    console.log("[BrowserPlayout] Constructor called");
  }

  /** Register a client to receive events, returns client ID */
  addClient(callback: (event: BrowserPlayoutEvent) => void): string {
    const clientId = randomUUID();
    const now = new Date();

    const client: ConnectedClient = {
      id: clientId,
      callback,
      status: {
        id: clientId,
        connectedAt: now,
        lastHeartbeat: now,
        currentVideo: null,
        currentItem: null,
        playlist: [],
        state: "kabelkrant",
      },
    };

    this.connectedClients.set(clientId, client);
    console.log(`[BrowserPlayout] Client ${clientId} connected. Total clients: ${this.connectedClients.size}`);

    this.emit("clientsChanged", this.getAllClientStatuses());
    this.broadcastToAdmins({ type: "clientsUpdate", data: { clients: this.getAllClientStatuses() } });

    return clientId;
  }

  /** Remove a client */
  removeClient(clientId: string): void {
    this.connectedClients.delete(clientId);
    console.log(`[BrowserPlayout] Client ${clientId} disconnected. Total clients: ${this.connectedClients.size}`);
    this.emit("clientsChanged", this.getAllClientStatuses());
    this.broadcastToAdmins({ type: "clientsUpdate", data: { clients: this.getAllClientStatuses() } });
  }

  /** Update client status (called when client reports back) */
  updateClientStatus(clientId: string, status: Partial<Omit<ClientStatus, "id" | "connectedAt">>): void {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.status = {
        ...client.status,
        ...status,
        lastHeartbeat: new Date(),
      };
      this.emit("clientsChanged", this.getAllClientStatuses());
      this.broadcastToAdmins({ type: "clientsUpdate", data: { clients: this.getAllClientStatuses() } });
    }
  }

  /** Get all connected client statuses */
  getAllClientStatuses(): ClientStatus[] {
    return Array.from(this.connectedClients.values()).map((c) => c.status);
  }

  /** Get a specific client's status */
  getClientStatus(clientId: string): ClientStatus | null {
    const client = this.connectedClients.get(clientId);
    return client ? client.status : null;
  }

  /** Send event to a specific client */
  private sendToClient(clientId: string, event: BrowserPlayoutEvent): boolean {
    const client = this.connectedClients.get(clientId);
    if (client) {
      try {
        client.callback(event);
        return true;
      } catch (e) {
        console.error(`[BrowserPlayout] Error sending event to client ${clientId}:`, e);
      }
    }
    return false;
  }

  /** Broadcast event to all connected clients */
  private broadcast(event: BrowserPlayoutEvent): void {
    console.log(`[BrowserPlayout] Broadcasting ${event.type} to ${this.connectedClients.size} clients`);
    for (const client of this.connectedClients.values()) {
      try {
        client.callback(event);
      } catch (e) {
        console.error(`[BrowserPlayout] Error sending event to client ${client.id}:`, e);
      }
    }
  }

  /** Convert file path to URL that browser can access */
  public getVideoUrl(filePath: string): string {
    const videoBasePath = process.env.VIDEO_BASE_PATH || "./videos";
    const relativePath = path.relative(videoBasePath, filePath);
    // Encode each path segment separately to preserve slashes
    const encodedPath = relativePath
      .split(path.sep)
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    console.log("[BrowserPlayout] Video URL:", `/api/video/${encodedPath}`, "from path:", filePath);
    return `/api/video/${encodedPath}`;
  }

  /** Add videos to all clients */
  async addVideos(videoPaths: string[]): Promise<void> {
    console.log("[BrowserPlayout] Adding videos to all clients:", videoPaths);

    const newVideos = videoPaths.map((p) => ({
      path: p,
      url: this.getVideoUrl(p),
    }));

    this.broadcast({
      type: "addVideos",
      data: {
        videos: newVideos,
      } as AddVideosData,
    });

    this.emit("change");
  }

  /** Add videos to a specific client */
  async addVideosToClient(clientId: string, videoPaths: string[]): Promise<boolean> {
    console.log(`[BrowserPlayout] Adding videos to client ${clientId}:`, videoPaths);

    const newVideos = videoPaths.map((p) => ({
      path: p,
      url: this.getVideoUrl(p),
    }));

    return this.sendToClient(clientId, {
      type: "addVideos",
      data: {
        videos: newVideos,
      } as AddVideosData,
    });
  }

  /** Clear playlist for all clients */
  clearPlaylist(): void {
    console.log("[BrowserPlayout] Clearing playlist for all clients");

    this.broadcast({
      type: "clearPlaylist",
    });

    this.emit("change");
  }

  /** Clear playlist for a specific client */
  clearClientPlaylist(clientId: string): boolean {
    console.log(`[BrowserPlayout] Clearing playlist for client ${clientId}`);

    return this.sendToClient(clientId, {
      type: "clearPlaylist",
    });
  }

  /** Remove a specific item from a client's playlist by index */
  removeItemFromClient(clientId: string, index: number): boolean {
    console.log(`[BrowserPlayout] Removing item at index ${index} from client ${clientId}`);

    return this.sendToClient(clientId, {
      type: "removeItem",
      data: { index } as RemoveItemData,
    });
  }

  /** Stop the currently playing item for a specific client */
  stopCurrentItem(clientId: string): boolean {
    console.log(`[BrowserPlayout] Stopping current item for client ${clientId}`);

    return this.sendToClient(clientId, {
      type: "stopCurrent",
    });
  }

  /** Get number of connected clients */
  getClientCount(): number {
    return this.connectedClients.size;
  }

  /** Broadcast settings update to all clients */
  broadcastSettingsUpdate(settings: PlayoutSettings): void {
    console.log("[BrowserPlayout] Broadcasting settings update to all clients");
    this.broadcast({
      type: "settingsUpdate",
      data: settings,
    });
    // Also notify admin listeners
    this.broadcastToAdmins({
      type: "settingsUpdate",
      data: settings,
    });
  }

  /** Register an admin listener for status updates, returns listener ID */
  addAdminListener(callback: (event: AdminStatusEvent) => void): string {
    const listenerId = randomUUID();
    this.adminListeners.set(listenerId, { id: listenerId, callback });
    console.log(`[BrowserPlayout] Admin listener ${listenerId} connected. Total admin listeners: ${this.adminListeners.size}`);

    // Send initial status
    callback({ type: "clientsUpdate", data: { clients: this.getAllClientStatuses() } });

    return listenerId;
  }

  /** Remove an admin listener */
  removeAdminListener(listenerId: string): void {
    this.adminListeners.delete(listenerId);
    console.log(`[BrowserPlayout] Admin listener ${listenerId} disconnected. Total admin listeners: ${this.adminListeners.size}`);
  }

  /** Broadcast event to all admin listeners */
  private broadcastToAdmins(event: AdminStatusEvent): void {
    for (const listener of this.adminListeners.values()) {
      try {
        listener.callback(event);
      } catch (e) {
        console.error(`[BrowserPlayout] Error sending event to admin listener ${listener.id}:`, e);
      }
    }
  }

  /** Add iframe to all clients' playlist */
  addIframe(url: string, durationSeconds: number | null, muted: boolean): void {
    console.log(`[BrowserPlayout] Adding iframe to playlist: ${url} for ${durationSeconds === null ? "infinite" : durationSeconds + " seconds"}, muted: ${muted}`);
    this.broadcast({
      type: "addIframe",
      data: {
        iframe: {
          type: "iframe",
          url,
          durationSeconds,
          muted,
        },
      } as AddIframeData,
    });
    this.emit("change");
  }

  /** Add raadsvergadering (CompanyWebcast) to all clients' playlist */
  addRaadsvergadering(webcastId: string): void {
    console.log(`[BrowserPlayout] Adding raadsvergadering to playlist: ${webcastId}`);
    this.broadcast({
      type: "addRaadsvergadering",
      data: {
        raadsvergadering: {
          type: "raadsvergadering",
          webcastId,
        },
      } as AddRaadsvergaderingData,
    });
    this.emit("change");
  }

  /** Cleanup */
  cleanup(): void {
    console.log("[BrowserPlayout] Cleaning up");
    this.connectedClients.clear();
    globalThis.__browserPlayoutInstance = undefined;
  }
}

// Use globalThis to ensure singleton across module boundaries
declare global {
  // eslint-disable-next-line no-var
  var __browserPlayoutInstance: BrowserPlayout | undefined;
}

export function getBrowserPlayout(): BrowserPlayout {
  
  if (!globalThis.__browserPlayoutInstance) {
    console.log("[BrowserPlayout] Creating new singleton instance");
    globalThis.__browserPlayoutInstance = new BrowserPlayout();
  }
  return globalThis.__browserPlayoutInstance;
}
