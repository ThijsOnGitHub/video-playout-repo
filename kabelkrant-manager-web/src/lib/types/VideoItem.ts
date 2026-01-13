export interface ScheduledDate {
  id: string;
  dateTime: string; // ISO 8601 format: "2026-01-15T14:30:00"
  note?: string; // Optionele notitie voor deze specifieke uitzending
}

export type ProgramType = "video" | "iframe" | "raadsvergadering";

export interface VideoItem {
  id: string;
  playAll: boolean;
  programName: string;
  path: string;
  planning: Planning[];
  scheduledDates?: ScheduledDate[]; // Specifieke datum/tijd planning
  // Iframe support
  programType?: ProgramType; // "video" (default), "iframe", or "raadsvergadering"
  iframeUrl?: string; // URL voor iframe type
  iframeDurationSeconds?: number | null; // Hoe lang de iframe getoond wordt (null = oneindig)
  iframeMuted?: boolean; // Of de audio gedempt moet worden (standaard true)
  // Raadsvergadering (CompanyWebcast) specific
  webcastId?: string; // CompanyWebcast ID, e.g., "abc5703d-b1f7-46d6-9ef9-4a224001f8e6"
  webcastCode?: string; // CompanyWebcast code, e.g., "gemeentekrimpenerwaard/20260106_1"
}

export interface Planning {
  days: number[];
  times: string[];
}

export type VideoItems = VideoItem[];
