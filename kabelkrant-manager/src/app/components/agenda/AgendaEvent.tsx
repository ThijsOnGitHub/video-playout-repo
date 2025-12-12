import { FC } from "react";
import { ScheduledEvent, HOUR_HEIGHT } from "./types";

export interface AgendaEventProps {
    event: ScheduledEvent;
    color: string;
}

export const AgendaEvent: FC<AgendaEventProps> = ({ event, color }) => {
    // Calculate position within the hour (in pixels)
    const minuteOffset = (event.minute / 60) * HOUR_HEIGHT;

    // Calculate height based on duration (minimum 20px for visibility)
    const durationMinutes = event.durationSeconds / 60;
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20);

    // Format start time (HH:MM)
    const startTime = event.time.substring(0, 5);

    // Format end time (HH:MM)
    const endTime = event.endTime.substring(0, 5);

    // Format duration for display
    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}u ${mins}m`;
        }
        return `${mins}m`;
    };

    return (
        <div
            className={`${color} text-white text-xs p-1 rounded absolute left-0 right-0 mx-1 overflow-hidden cursor-default shadow-sm border border-white/20`}
            style={{
                top: `${minuteOffset}px`,
                height: `${height}px`,
                minHeight: "20px",
            }}
            title={`${event.program.programName}\n${startTime} - ${endTime}\nDuur: ${formatDuration(event.durationSeconds)}`}
        >
            <div className="font-medium truncate">
                {event.program.programName}
            </div>
            {height >= 35 && (
                <div className="opacity-80 truncate">
                    {startTime} - {endTime}
                </div>
            )}
            {height >= 50 && (
                <div className="opacity-70 text-[10px] truncate">
                    {formatDuration(event.durationSeconds)}
                </div>
            )}
        </div>
    );
};
