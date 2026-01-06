# Real-time Sync Architectuur

Deze documentatie beschrijft hoe de real-time synchronisatie werkt tussen playout clients en admin interfaces via Server-Sent Events (SSE).

## 🏗️ Architectuur Overzicht

Het systeem gebruikt **twee gescheiden SSE verbindingen**:

### 1. Playout SSE (`/api/playout/events`)
Voor playout clients - de schermen die video's afspelen.

**Locatie**: `src/server/api.ts:57-104`

**Functionaliteit**:
- Client registratie met unieke ID
- Event broadcasting (addVideos, addIframe, addRaadsvergadering, clearPlaylist, etc.)
- Automatische cleanup bij disconnect

### 2. Admin SSE (`/api/admin-events`)
Voor admin pagina's zoals planning, playlist en programs.

**Locatie**: `src/server/api.ts:109-151`

**Functionaliteit**:
- Status updates van alle clients
- Settings updates
- Real-time synchronisatie zonder polling

---

## 📺 Complete Flow: Video Afspelen

### Stap 1: User Interaction
```
Gebruiker klikt "Speel nu af" op admin interface
    ↓
playVideoItem() server functie wordt aangeroepen
Locatie: src/server/functions/obs.ts:20
```

### Stap 2: PlayoutEngine Routing
```typescript
// Locatie: src/server/services/playoutEngine.ts:131
playVideoItem(videoItem: VideoItem) {
  // Bepaal welke playout target actief is
  const target = this.getActivePlayoutTarget();

  // Lees video bestanden uit folder
  const videos = fileNames.map(file => path.join(fullPath, file));

  // Voeg toe aan target (BrowserPlayout of VideoPlaylist)
  target.addVideos(videos);
}
```

### Stap 3: Target Bepaling
```typescript
// Locatie: src/server/services/playoutEngine.ts:32
private getActivePlayoutTarget(): PlayoutTarget {
  const settings = this.storage.getPlayoutSettings();

  if (settings.playoutMode === "browser" && this.browserPlayout) {
    return this.browserPlayout;  // Voor browser-based playout
  }

  return this.videoPlaylist;  // Voor OBS
}
```

### Stap 4: BrowserPlayout Broadcasting
```typescript
// Locatie: src/server/services/browserPlayout.ts:206
async addVideos(videoPaths: string[]): Promise<void> {
  // Converteer file paths naar browser-toegankelijke URLs
  const newVideos = videoPaths.map(p => ({
    path: p,
    url: this.getVideoUrl(p)  // Genereert /api/video/... URL
  }));

  // Broadcast naar ALLE playout clients via SSE
  this.broadcast({
    type: "addVideos",
    data: { videos: newVideos }
  });

  // Broadcast naar ALLE admin listeners voor live updates
  this.broadcastToAdmins({
    type: "clientsUpdate",
    data: { clients: this.getAllClientStatuses() }
  });

  this.emit("change");
}
```

### Stap 5: Playout Client Ontvangt Event
```typescript
// Locatie: src/hooks/usePlayoutSSE.ts:142
eventSource.addEventListener("addVideos", (event) => {
  const newItems: ClientPlaylistItem[] = data.videos.map(v => ({
    type: "video",
    path: v.path,
    url: v.url
  }));

  // Check huidige status via refs (geen stale closures!)
  const wasPlaying = currentItemRef.current !== null;
  const hadPlaylist = playlistRef.current.length > 0;

  if (!wasPlaying && !hadPlaylist && newItems.length > 0) {
    // Niets speelt, start eerste video direct
    const [firstItem, ...rest] = newItems;
    setItemKey(k => k + 1);      // Trigger video player reset
    setState(firstItem.type);     // Update state naar "video"
    setCurrentItem(firstItem);    // Zet als huidige item
    setPlaylist(rest);            // Rest naar wachtrij
  } else {
    // Iets speelt al, voeg toe aan wachtrij
    setPlaylist([...playlistRef.current, ...newItems]);
  }
});
```

### Stap 6: Client Rapporteert Status Terug
```typescript
// Locatie: src/hooks/usePlayoutSSE.ts:77-79
// Wordt getriggerd bij elke state wijziging
useEffect(() => {
  reportStatus();
}, [currentItem, playlist, state, reportStatus]);

// reportStatus functie (regel 61-74)
const reportStatus = useCallback(() => {
  if (!clientIdRef.current) return;

  fetch("/api/playout/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: clientIdRef.current,
      currentItem: currentItemRef.current,
      playlist: playlistRef.current,
      state: stateRef.current,
    }),
  }).catch(console.error);
}, []);
```

### Stap 7: Server Update Client Status
```typescript
// Locatie: src/server/api.ts:156-186
async function handleClientStatusUpdate(request: Request) {
  const { clientId, currentVideo, currentItem, playlist, state } = body;

  // Update client status in BrowserPlayout
  browserPlayout.updateClientStatus(clientId, {
    currentVideo,
    currentItem,
    playlist,
    state
  });

  return { success: true };
}

// In BrowserPlayout (src/server/services/browserPlayout.ts:142)
updateClientStatus(clientId: string, status: Partial<ClientStatus>) {
  const client = this.connectedClients.get(clientId);
  if (client) {
    client.status = {
      ...client.status,
      ...status,
      lastHeartbeat: new Date(),
    };

    // Emit voor backwards compatibility
    this.emit("clientsChanged", this.getAllClientStatuses());

    // Broadcast naar admin interfaces via SSE
    this.broadcastToAdmins({
      type: "clientsUpdate",
      data: { clients: this.getAllClientStatuses() }
    });
  }
}
```

### Stap 8: Admin Interface Ontvangt Live Update
```typescript
// Locatie: src/hooks/useRealtimeState.ts:47-61
eventSource.addEventListener("clientsUpdate", (event) => {
  try {
    const parsed = JSON.parse(event.data);
    if (parsed.data) {
      const data = parsed.data as ClientsUpdateData;

      // Update state direct - geen polling nodig!
      setState(prev => ({
        ...prev,
        clients: data.clients
      }));
    }
  } catch (e) {
    console.error("Error parsing clientsUpdate event:", e);
  }
});
```

---

## 🔄 Vergelijking: Voor vs. Na

### VOORHEEN: Polling
```
Admin Interface (useRealtimeState)
  ↓
  └─ setInterval(fetchStatus, 2000)
       ↓
       ├─ getObsStatus()         (HTTP request elke 2 sec)
       ├─ getPlayoutClients()    (HTTP request elke 2 sec)  ❌
       └─ getPlayoutSettings()   (HTTP request elke 2 sec)

Problemen:
❌ Veel onnodige HTTP requests
❌ Server load door constante polling
❌ Maximale vertraging van 2 seconden
❌ Batterij/CPU gebruik op client
```

### NU: Server-Sent Events
```
Admin Interface (useRealtimeState)
  ↓
  └─ EventSource("/api/admin-events")  (Eenmalige connectie)
       ↓
       └─ addEventListener("clientsUpdate")
            ↓
            └─ Updates alleen wanneer er verandering is!  ✅

Voordelen:
✅ Minimale netwerk traffic
✅ Instant updates (0ms vertraging)
✅ Lage server load
✅ Efficiënt batterij/CPU gebruik
```

---

## 🔧 De Fix: Dubbele Video's

### Het Probleem
Geneste `setState` callbacks leidden tot race conditions:

```typescript
// PROBLEMATISCH ❌
setCurrentItem((currentItem) => {
  setPlaylist((playlist) => {
    // Nested setState - kan leiden tot:
    // - Stale closures
    // - Race conditions
    // - Dubbele state updates
  });
});
```

### De Oplossing
Gebruik refs voor synchrone state checks + directe updates:

```typescript
// OPGELOST ✅
// Locatie: src/hooks/usePlayoutSSE.ts:161-176

// Check huidige state via refs (altijd actueel)
const wasPlaying = currentItemRef.current !== null;
const hadPlaylist = playlistRef.current.length > 0;

// Directe, sequentiële state updates
if (!wasPlaying && !hadPlaylist && newItems.length > 0) {
  const [firstItem, ...rest] = newItems;
  setItemKey(k => k + 1);
  setState(firstItem.type);
  setCurrentItem(firstItem);   // Direct, geen nesting
  setPlaylist(rest);            // Direct, geen nesting
} else {
  setPlaylist([...playlistRef.current, ...newItems]);
}
```

**Waarom werkt dit?**
- `useRef` bevat altijd de actuele waarde (geen stale closures)
- Directe state updates in volgorde (voorspelbaar)
- Geen race conditions door geneste callbacks

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│                  Admin Interface                     │
│              (Planning/Playlist/Programs)            │
│                                                      │
│  User klikt "Speel nu af"                           │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ playVideoItem()
                  ▼
┌─────────────────────────────────────────────────────┐
│              PlayoutEngine                           │
│                                                      │
│  • Leest video bestanden uit folder                 │
│  • Bepaalt target (Browser/OBS)                     │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ addVideos(videoPaths)
                  ▼
┌─────────────────────────────────────────────────────┐
│              BrowserPlayout                          │
│                                                      │
│  • Converteer paths → URLs                          │
│  • broadcast() naar playout clients (SSE)           │
│  • broadcastToAdmins() naar admin interfaces (SSE)  │
└────────┬────────────────────────┬───────────────────┘
         │                        │
         │ SSE Events             │ SSE Events
         ▼                        ▼
┌──────────────────┐    ┌──────────────────┐
│ Playout Client 1 │    │ Admin Listeners  │
│  (/playout)      │    │ (/playlist, etc) │
│                  │    │                  │
│ usePlayoutSSE    │    │ useRealtimeState │
└────────┬─────────┘    └──────────────────┘
         │
         │ Video speelt af
         ▼
┌──────────────────┐
│ Rapporteer       │
│ Status           │
│                  │
│ POST /api/       │
│ playout/status   │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              BrowserPlayout                          │
│         updateClientStatus()                         │
│                  │                                   │
│                  ▼                                   │
│         broadcastToAdmins()                          │
│         (clientsUpdate event)                        │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ SSE Event
                  ▼
┌─────────────────────────────────────────────────────┐
│              Admin Interface                         │
│         Ziet live update in /playlist                │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Belangrijke Code Locaties

### Server-Side

| Component | Locatie | Functie |
|-----------|---------|---------|
| Playout SSE Handler | `src/server/api.ts:57-104` | SSE endpoint voor playout clients |
| Admin SSE Handler | `src/server/api.ts:109-151` | SSE endpoint voor admin interfaces |
| BrowserPlayout | `src/server/services/browserPlayout.ts` | Centrale playout management |
| PlayoutEngine | `src/server/services/playoutEngine.ts` | Routing tussen OBS en Browser playout |
| Status Update Handler | `src/server/api.ts:156-186` | Verwerkt client status updates |

### Client-Side

| Component | Locatie | Functie |
|-----------|---------|---------|
| usePlayoutSSE | `src/hooks/usePlayoutSSE.ts` | Playout client SSE hook |
| useRealtimeState | `src/hooks/useRealtimeState.ts` | Admin interface SSE hook |
| Playlist Page | `src/routes/playlist.tsx` | Admin interface voor client monitoring |

---

## 🔐 Belangrijke Concepts

### 1. Refs vs State
```typescript
// State: Async, kan stale zijn in callbacks
const [item, setItem] = useState(null);

// Ref: Altijd actuele waarde
const itemRef = useRef(null);

// Sync houden
useEffect(() => {
  itemRef.current = item;
}, [item]);

// Gebruik in event handlers
eventSource.addEventListener("event", () => {
  // ✅ itemRef.current is altijd actueel
  // ❌ item kan stale zijn
});
```

### 2. SSE Event Format
```typescript
// Server stuurt:
event: clientsUpdate
data: {"type":"clientsUpdate","data":{"clients":[...]}}

// Client ontvangt:
eventSource.addEventListener("clientsUpdate", (event) => {
  const parsed = JSON.parse(event.data);
  // parsed = { type: "clientsUpdate", data: { clients: [...] } }
});
```

### 3. Bidirectionele Sync
```
Playout Client ←→ Server ←→ Admin Interface

1. Client ontvangt commands via SSE (server → client)
2. Client rapporteert status via POST (client → server)
3. Server broadcast updates naar admins via SSE (server → admin)
```

---

## 🚀 Voordelen van Huidige Architectuur

1. **Real-time**: Updates zijn instant, geen polling vertraging
2. **Efficiënt**: Minimale netwerk traffic en server load
3. **Schaalbaar**: Kan honderden clients en admins aan
4. **Betrouwbaar**: Automatische reconnect bij disconnect
5. **Maintainable**: Duidelijke scheiding tussen playout en admin

---

## 📝 Toekomstige Verbeteringen

Mogelijke verbeteringen voor de toekomst:

1. **Reconnection Logic**: Automatisch herstellen van state bij reconnect
2. **Heartbeat Mechanism**: Detecteer en verwijder stale clients
3. **Message Queuing**: Buffer messages bij tijdelijke disconnects
4. **Performance Monitoring**: Track SSE connection health
5. **Error Recovery**: Graceful degradation naar polling bij SSE failures

---

## 🐛 Troubleshooting

### Video's worden dubbel toegevoegd
**Oorzaak**: Geneste setState callbacks
**Oplossing**: Gebruik refs voor state checks (zie "De Fix: Dubbele Video's")

### Admin ziet geen updates
**Controleer**:
1. SSE connectie actief? (Network tab in DevTools)
2. Console errors? (Check browser console)
3. Server draait? (Check server logs)

### Playout client speelt niets af
**Controleer**:
1. SSE event ontvangen? (Check console: "[Playout] Received addVideos event")
2. Video URL correct? (Check Network tab voor /api/video/... requests)
3. CurrentItem state gezet? (Check React DevTools)

---

*Laatst bijgewerkt: Januari 2026*
