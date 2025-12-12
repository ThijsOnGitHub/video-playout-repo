import { FC } from "react";
import { HOUR_HEIGHT, HOURS_IN_DAY } from "./types";

export interface AgendaTimeColumnProps {}

const hours = Array.from({ length: HOURS_IN_DAY }, (_, i) => i);

const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, "0")}:00`;
};

export const AgendaTimeColumn: FC<AgendaTimeColumnProps> = () => {
    return (
        <div className="flex-shrink-0 w-16 border-r bg-gray-50">
            {hours.map((hour) => (
                <div
                    key={hour}
                    className="border-b text-xs text-gray-500 text-right pr-2 flex items-start justify-end pt-1"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                >
                    {formatHour(hour)}
                </div>
            ))}
        </div>
    );
};
