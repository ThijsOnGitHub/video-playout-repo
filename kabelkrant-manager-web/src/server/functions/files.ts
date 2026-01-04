import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { initializeServer } from "../init";

export const getFilesInFolder = createServerFn({ method: "GET" })
  .inputValidator(z.object({ path: z.string() }))
  .handler(async ({ data }) => {
    const { storage } = await initializeServer();
    return storage.getFilesInFolder(data.path);
  });

export const browseDirectory = createServerFn({ method: "GET" })
  .inputValidator(z.object({ relativePath: z.string().optional() }))
  .handler(async ({ data }) => {
    const { storage } = await initializeServer();
    return storage.browseDirectory(data.relativePath || "");
  });

export const deleteVideo = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      folderPath: z.string(),
      fileName: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const { storage } = await initializeServer();
    return storage.deleteVideo(data.folderPath, data.fileName);
  });

export const reorderVideos = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      folderPath: z.string(),
      orderedFileNames: z.array(z.string()),
    })
  )
  .handler(async ({ data }) => {
    const { storage } = await initializeServer();
    return storage.reorderVideos(data.folderPath, data.orderedFileNames);
  });

export const uploadVideo = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      folderPath: z.string(),
      fileName: z.string(),
      fileData: z.string(), // Base64 encoded
    })
  )
  .handler(async ({ data }) => {
    const { storage } = await initializeServer();
    const buffer = Buffer.from(data.fileData, "base64");
    return storage.saveUploadedVideo(data.folderPath, data.fileName, buffer);
  });
