import { z } from "zod";
import type { VideoItem } from "@/lib/types/VideoItem";

export const planningSchema = z.object({
  days: z.array(z.number()),
  times: z.array(z.string()),
});

// Schema voor specifieke datum/tijd planning
export const scheduledDateSchema = z.object({
  id: z.string(),
  dateTime: z.string(), // ISO 8601 format: "2026-01-15T14:30:00"
  note: z.string().optional(), // Optionele notitie voor deze specifieke uitzending
});

export const programSchema = z.object({
  id: z.string(),
  programName: z.string(),
  playAll: z.boolean(),
  path: z.string(),
  planning: z.array(planningSchema).default([
    {
      days: [],
      times: ["00:00:00"],
    },
  ]),
  // Specifieke datum/tijd planning (naast de wekelijkse planning)
  scheduledDates: z.array(scheduledDateSchema).optional().default([]),
  // Program type: video (default), iframe, or raadsvergadering
  programType: z.enum(["video", "iframe", "raadsvergadering"]).optional().default("video"),
  iframeUrl: z.string().optional(),
  iframeDurationSeconds: z.number().min(1).nullable().optional().default(60),
  iframeMuted: z.boolean().optional().default(true),
  // Raadsvergadering (CompanyWebcast) specific
  webcastId: z.string().optional(), // e.g., "abc5703d-b1f7-46d6-9ef9-4a224001f8e6"
  webcastCode: z.string().optional(), // e.g., "gemeentekrimpenerwaard/20260106_1"
});

export type ScheduledDate = z.infer<typeof scheduledDateSchema>;

export type ProgramFormSchema = z.infer<typeof programSchema> & VideoItem;
