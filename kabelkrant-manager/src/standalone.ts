#!/usr/bin/env node

/**
 * Standalone server entry point
 * Runs the Kabelkrant Manager without Electron
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { startApiServer } from './api/server';
import { startPlayoutServer } from './backend';

// Configuration
const PORT = process.env.PORT || 3000;
const API_PORT = process.env.API_PORT || 3002;
const DATA_DIR = process.env.DATA_DIR || path.join(os.homedir(), '.kabelkrant-manager');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const programJSONPath = path.join(DATA_DIR, 'settings.json');
const hasPlayedJSONPath = path.join(DATA_DIR, 'hasPlayed.json');

// Create initial files if they don't exist
function createFiles() {
  if (!fs.existsSync(programJSONPath)) {
    fs.writeFileSync(programJSONPath, JSON.stringify([]));
    console.log(`Created settings file at: ${programJSONPath}`);
  }
  if (!fs.existsSync(hasPlayedJSONPath)) {
    fs.writeFileSync(hasPlayedJSONPath, JSON.stringify([]));
    console.log(`Created hasPlayed file at: ${hasPlayedJSONPath}`);
  }
}

async function startStandaloneServer() {
  console.log('Starting Kabelkrant Manager in standalone mode...');
  console.log(`Data directory: ${DATA_DIR}`);

  createFiles();

  // Start the playout server (handles video scheduling)
  console.log('Starting playout server...');
  startPlayoutServer(programJSONPath, hasPlayedJSONPath);

  // Start the API server
  console.log(`Starting API server on port ${API_PORT}...`);
  startApiServer({
    port: Number(API_PORT),
    programFilePath: programJSONPath,
    hasPlayedJSONPath: hasPlayedJSONPath,
    enableCors: true,
  });

  // Start the frontend server
  const app = express();

  // Serve static files from the built frontend
  const frontendPath = path.join(__dirname, '../renderer', 'main_window');
  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));

    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });

    app.listen(PORT, () => {
      console.log(`Frontend server running at: http://localhost:${PORT}`);
      console.log(`API server running at: http://localhost:${API_PORT}`);
      console.log('\nKabelkrant Manager is ready!');
      console.log(`Open http://localhost:${PORT} in your browser`);
    });
  } else {
    console.error(`Frontend build not found at: ${frontendPath}`);
    console.error('Please run "npm run package" first to build the frontend');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

// Start the server
startStandaloneServer().catch((error) => {
  console.error('Failed to start standalone server:', error);
  process.exit(1);
});
