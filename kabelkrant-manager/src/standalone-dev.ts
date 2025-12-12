#!/usr/bin/env node

/**
 * Standalone development server
 * Runs the backend API while Vite serves the frontend
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { startApiServer } from './api/server';
import { startPlayoutServer } from './backend';

// Configuration
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

async function startDevServer() {
  console.log('Starting Kabelkrant Manager backend in standalone mode...');
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

  console.log('\nBackend is ready!');
  console.log(`API server running at: http://localhost:${API_PORT}`);
  console.log('\nNow run "npm run dev:web" in another terminal to start the frontend');
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
startDevServer().catch((error) => {
  console.error('Failed to start dev server:', error);
  process.exit(1);
});
