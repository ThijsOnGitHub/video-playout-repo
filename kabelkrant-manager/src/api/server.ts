import Express from "express";
import cors from "cors";
import { getVideos, playVideoItem } from "../backend/playout";
import { getFilesInFolder } from "../backend/getFilesInFolder";
import { obsIsRunning, videoPlaylist } from "../backend/obsManager";
import fs from "fs";
import path from "path";
import { app as electronApp } from "electron";

export interface ApiServerConfig {
  port: number;
  programFilePath: string;
  hasPlayedJSONPath: string;
  enableCors?: boolean;
}

export function startApiServer(config: ApiServerConfig) {
  const app = Express();
  const { port, programFilePath, hasPlayedJSONPath, enableCors = true } = config;

  // Middleware
  if (enableCors) {
    app.use(cors());
  }
  app.use(Express.json());

  // Health check
  app.get("/", (req, res) => {
    res.json({
      status: "ok",
      service: "Kabelkrant Manager API",
      version: "1.0.0"
    });
  });

  // Get all videos from current programs
  app.get("/api/videos", (req, res) => {
    try {
      const videos = getVideos(programFilePath);
      res.json(videos);
    } catch (error) {
      res.status(500).json({ error: "Failed to get videos" });
    }
  });

  // Get programs/settings
  app.get("/api/programs", (req, res) => {
    try {
      if (!fs.existsSync(programFilePath)) {
        return res.json([]);
      }
      const data = fs.readFileSync(programFilePath, "utf-8");
      res.json(JSON.parse(data || "[]"));
    } catch (error) {
      res.status(500).json({ error: "Failed to read programs" });
    }
  });

  // Save programs/settings
  app.post("/api/programs", (req, res) => {
    try {
      const programs = req.body;
      fs.writeFileSync(programFilePath, JSON.stringify(programs, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save programs" });
    }
  });

  // Get files in a folder
  app.post("/api/files", async (req, res) => {
    try {
      const { path: folderPath } = req.body;
      if (!folderPath) {
        return res.status(400).json({ error: "Path is required" });
      }
      const files = await getFilesInFolder(folderPath);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to get files" });
    }
  });

  // Check OBS status
  app.get("/api/obs/status", (req, res) => {
    res.json({ isRunning: obsIsRunning });
  });

  // Get current playlist
  app.get("/api/playlist", (req, res) => {
    try {
      res.json(videoPlaylist.videos);
    } catch (error) {
      res.status(500).json({ error: "Failed to get playlist" });
    }
  });

  // Play video item
  app.post("/api/playlist/play", (req, res) => {
    try {
      const videoItem = req.body;
      playVideoItem(hasPlayedJSONPath, videoItem);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to play video" });
    }
  });

  // Select folder - This endpoint is only for web mode
  // In Electron mode, this will use the native dialog
  app.post("/api/folder/select", (req, res) => {
    const { path: folderPath } = req.body;
    if (!folderPath) {
      return res.status(400).json({ error: "Path is required" });
    }

    // Validate that the path exists
    if (!fs.existsSync(folderPath)) {
      return res.status(404).json({ error: "Path does not exist" });
    }

    res.json({ path: folderPath });
  });

  const server = app.listen(port, () => {
    console.log(`API Server is running on port ${port}`);
    console.log(`Access at: http://localhost:${port}`);
  });

  return server;
}
