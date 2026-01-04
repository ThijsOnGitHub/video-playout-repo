import { EventEmitter } from "events";
import path from "path";
import { randomUUID } from "crypto";
import type { PlayoutSettings } from "@/lib/types/PlayoutSettings";

export interface BrowserPlayoutEvent {
  type: "addVideos" | "clearPlaylist" | "currentPlaylist" | "settingsUpdate";
  data?: unknown;
}

export interface VideoItem {
  path: string;
  url: string;
}

export interface AddVideosData {
  videos: VideoItem[];
}

export interface CurrentPlaylistData {
  videos: VideoItem[];
}

/** Status of a connected playout client */
export interface ClientStatus {
  id: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  currentVideo: VideoItem | null;
  playlist: VideoItem[];
  state: "kabelkrant" | "video" | "transitioning";
}

/** Client info stored on server */
interface ConnectedClient {
  id: string;
  callback: (event: BrowserPlayoutEvent) => void;
  status: ClientStatus;
}

/**
 * BrowserPlayout manages video playback for browser-based playout clients.
 * - Server sends addVideos events to clients
 * - Clients report their status back to server
 * - Server can view and control individual client playlists
 */
export class BrowserPlayout extends EventEmitter {
  private connectedClients: Map<string, ConnectedClient> = new Map();

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
        playlist: [],
        state: "kabelkrant",
      },
    };

    this.connectedClients.set(clientId, client);
    console.log(`[BrowserPlayout] Client ${clientId} connected. Total clients: ${this.connectedClients.size}`);

    this.emit("clientsChanged", this.getAllClientStatuses());

    return clientId;
  }

  /** Remove a client */
  removeClient(clientId: string): void {
    this.connectedClients.delete(clientId);
    console.log(`[BrowserPlayout] Client ${clientId} disconnected. Total clients: ${this.connectedClients.size}`);
    this.emit("clientsChanged", this.getAllClientStatuses());
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
  // Check if instance exists and has all required methods (handles hot reload)
  if (globalThis.__browserPlayoutInstance && typeof globalThis.__browserPlayoutInstance.broadcastSettingsUpdate !== "function") {
    console.log("[BrowserPlayout] Recreating instance due to missing methods (hot reload)");
    globalThis.__browserPlayoutInstance = undefined;
  }

  if (!globalThis.__browserPlayoutInstance) {
    console.log("[BrowserPlayout] Creating new singleton instance");
    globalThis.__browserPlayoutInstance = new BrowserPlayout();
  }
  return globalThis.__browserPlayoutInstance;
}
