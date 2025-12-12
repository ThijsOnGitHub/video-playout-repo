# Migration to Frontend/Backend Architecture

This document describes the refactored architecture that allows Kabelkrant Manager to run both as an Electron app and as a standalone web application.

## Architecture Overview

The application now has a clear separation between frontend and backend:

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6 (HashRouter for Electron, BrowserRouter for Web)
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS + SCSS
- **State Management**: React hooks (local state)

### Backend
- **API Server**: Express.js REST API (Port 3002)
- **Video Scheduling**: Node-cron based playout system
- **OBS Integration**: OBS WebSocket client
- **Data Storage**: JSON files in user data directory

### API Client Abstraction
The `apiClient` module (`src/app/lib/apiClient.ts`) provides a unified interface that works in both modes:
- **Electron Mode**: Uses IPC (Inter-Process Communication)
- **Web Mode**: Uses HTTP fetch to the REST API

## Running the Application

### Electron Mode (Original)

```bash
# Development
npm start

# Build and package
npm run package
npm run make
```

### Standalone Web Mode (New)

#### Development Mode

Terminal 1 - Start the backend:
```bash
npm run dev:backend
```

Terminal 2 - Start the frontend:
```bash
npm run dev:web
```

Then open http://localhost:3000 in your browser.

#### Production Mode

```bash
# Build the web frontend
npm run build:web

# Run the standalone server (serves both frontend and backend)
npm run standalone
```

The app will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:3002

### Environment Variables

For standalone web mode, you can configure:

```bash
# API URL (default: http://localhost:3002)
VITE_API_URL=http://localhost:3002

# Frontend port (default: 3000)
PORT=3000

# API port (default: 3002)
API_PORT=3002

# Data directory (default: ~/.kabelkrant-manager)
DATA_DIR=/path/to/data
```

## Key Changes

### 1. API Server (`src/api/server.ts`)

Replaces the minimal Express server with a full REST API:

**Endpoints:**
- `GET /api/programs` - Get all programs
- `POST /api/programs` - Save programs
- `GET /api/videos` - Get videos from current programs
- `POST /api/files` - Get files in a folder
- `GET /api/obs/status` - Check if OBS is running
- `GET /api/playlist` - Get current playlist
- `POST /api/playlist/play` - Play a video
- `POST /api/folder/select` - Select a folder (web mode)

### 2. API Client (`src/app/lib/apiClient.ts`)

Provides a unified interface:

```typescript
import { apiClient } from './lib/apiClient'

// Works in both Electron and Web mode
const programs = await apiClient.getPrograms()
await apiClient.savePrograms(programs)
const obsRunning = await apiClient.getObsIsRunning()
```

### 3. React Router Integration

- **Layout Component**: `src/app/components/Layout.tsx` - Main layout with sidebar and routing
- **Routes**:
  - `/` or `/programs` - Program management page
  - `/playlist` - Current playlist page

### 4. Standalone Entry Points

- `src/standalone.ts` - Production server (serves built frontend + API)
- `src/standalone-dev.ts` - Development backend (use with `npm run dev:web`)

## File Structure

```
kabelkrant-manager/
├── src/
│   ├── api/
│   │   └── server.ts              # REST API server
│   ├── app/
│   │   ├── components/
│   │   │   ├── Layout.tsx         # Main layout with routing
│   │   │   ├── sidebar/
│   │   │   ├── topBar/
│   │   │   └── ui/                # shadcn/ui components
│   │   ├── lib/
│   │   │   └── apiClient.ts       # API abstraction layer
│   │   ├── routes/
│   │   │   ├── programs.tsx       # Programs route
│   │   │   └── playlist.tsx       # Playlist route
│   │   ├── page/
│   │   │   ├── Programs.tsx       # Programs page component
│   │   │   └── Playlist.tsx       # Playlist page component
│   │   ├── router.tsx             # Router configuration
│   │   └── main.tsx               # React entry point
│   ├── backend/
│   │   ├── playout.ts             # Video scheduling logic
│   │   ├── obsManager.ts          # OBS WebSocket integration
│   │   └── events/                # IPC handlers (Electron only)
│   ├── standalone.ts              # Standalone production server
│   ├── standalone-dev.ts          # Standalone dev server
│   ├── main.ts                    # Electron main process
│   └── preload.ts                 # Electron preload script
├── vite.web.config.ts             # Vite config for web build
└── package.json                   # Updated with new scripts
```

## Migration Checklist

✅ Created REST API server with all IPC endpoints
✅ Created API client abstraction layer
✅ Updated all components to use API client
✅ Set up React Router for navigation
✅ Created Layout component with routing
✅ Updated Electron main process to start API server
✅ Created standalone entry points
✅ Added web build configuration
✅ Updated package.json with new scripts
✅ Added necessary dependencies (express, cors)

## Differences Between Modes

### Electron Mode
- **Folder Selection**: Native OS dialog
- **Routing**: HashRouter (uses `#/` URLs)
- **API**: IPC (no network calls)
- **Updates**: Electron auto-updater
- **Tray Icon**: System tray integration

### Web Mode
- **Folder Selection**: Text input prompt (or File System Access API)
- **Routing**: BrowserRouter (standard URLs)
- **API**: HTTP fetch to localhost:3002
- **Updates**: Manual (refresh browser)
- **Tray Icon**: Not available

## Future Enhancements

Potential improvements:

1. **WebSocket Support**: Replace polling with WebSocket for real-time OBS status updates
2. **File System Access API**: Use modern browser API for folder selection
3. **Authentication**: Add user authentication for web mode
4. **Docker Support**: Create Dockerfile for easy deployment
5. **Database**: Replace JSON files with SQLite or PostgreSQL
6. **Multi-user**: Support multiple concurrent users in web mode

## Troubleshooting

### Electron Mode Issues

**Problem**: API server fails to start
**Solution**: Check if port 3002 is already in use

### Web Mode Issues

**Problem**: Cannot connect to API
**Solution**: Make sure `npm run dev:backend` is running

**Problem**: CORS errors
**Solution**: Verify CORS is enabled in `src/api/server.ts`

**Problem**: Folder selection doesn't work
**Solution**: In web mode, you must type the full path manually

### General Issues

**Problem**: TypeScript errors
**Solution**: Run `npm install` to ensure all dependencies are installed

**Problem**: Build fails
**Solution**: Make sure both TypeScript configs are up to date

## Contributing

When making changes:

1. **API Changes**: Update both `src/api/server.ts` (HTTP) and `src/backend/events/functionHandler.ts` (IPC)
2. **Frontend Changes**: Use `apiClient` instead of direct `window.electronApi` calls
3. **Testing**: Test in both Electron and web modes
4. **Types**: Keep types in `src/global/` for shared usage

## Support

For issues or questions:
- Create an issue on GitHub
- Check the main README for general documentation
