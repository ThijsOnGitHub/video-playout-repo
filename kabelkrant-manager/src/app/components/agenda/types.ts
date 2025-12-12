import { ProgrammaFormSchema } from "../../type/programFormName";

export interface ScheduledEvent {
    program: ProgrammaFormSchema;
    time: string;
    hour: number;
    minute: number;
    second: number;
    durationSeconds: number;
    endTime: string;
}

export interface ProgramDuration {
    programId: string;
    totalDurationSeconds: number;
}

// Color palette for different programs
export const PROGRAM_COLORS = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-red-500",
    "bg-yellow-500",
    "bg-cyan-500",
];

// Height of one hour in pixels
export const HOUR_HEIGHT = 60;

// Total hours in a day
export const HOURS_IN_DAY = 24;
