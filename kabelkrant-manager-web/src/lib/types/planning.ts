import type { ProgramFormSchema } from "@/lib/schemas/program";

export interface ScheduleEvent {
  program: ProgramFormSchema;
  time: string;
  day: number;
  durationMinutes: number;
  startHour: number;
  startMinute: number;
}

export type ViewMode = "week" | "day";
