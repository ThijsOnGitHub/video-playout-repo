export interface ScheduledDate {
  id: string;
  dateTime: string; // ISO 8601 format: "2026-01-15T14:30:00"
  note?: string; // Optionele notitie voor deze specifieke uitzending
}

export interface VideoItem {
  id: string;
  playAll: boolean;
  programName: string;
  path: string;
  planning: Planning[];
  scheduledDates?: ScheduledDate[]; // Specifieke datum/tijd planning
}

export interface Planning {
  days: number[];
  times: string[];
}

export type VideoItems = VideoItem[];
