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
});

export type ScheduledDate = z.infer<typeof scheduledDateSchema>;

export type ProgramFormSchema = z.infer<typeof programSchema> & VideoItem;
