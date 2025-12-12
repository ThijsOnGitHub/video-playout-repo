import { FC } from "react";
import { ScheduledEvent, HOUR_HEIGHT, HOURS_IN_DAY } from "./types";
import { AgendaEvent } from "./AgendaEvent";

export interface AgendaDayColumnProps {
    dayName: string;
    date: Date;
    isToday: boolean;
    events: ScheduledEvent[];
    programColorMap: Map<string, string>;
}

const hours = Array.from({ length: HOURS_IN_DAY }, (_, i) => i);

const formatDate = (date: Date) => {
    return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
};

export const AgendaDayColumn: FC<AgendaDayColumnProps> = ({
    dayName,
    date,
    isToday,
    events,
    programColorMap,
}) => {
    // Group events by hour for rendering
    const eventsByHour = new Map<number, ScheduledEvent[]>();
    hours.forEach((hour) => eventsByHour.set(hour, []));

    events.forEach((event) => {
        const hourEvents = eventsByHour.get(event.hour);
        if (hourEvents) {
            hourEvents.push(event);
        }
    });

    const headerClass = isToday ? "bg-blue-50 text-blue-600" : "bg-gray-50";
    const columnClass = isToday ? "bg-blue-50/30" : "";

    return (
        <div className="flex-1 min-w-[120px] border-r">
            {/* Day header */}
            <div className={`p-2 border-b text-center sticky top-0 z-10 ${headerClass}`}>
                <div className="font-medium text-sm">{dayName}</div>
                <div className="text-xs text-gray-500">{formatDate(date)}</div>
            </div>

            {/* Hour slots */}
            <div className={columnClass}>
                {hours.map((hour) => {
                    const hourEvents = eventsByHour.get(hour) || [];

                    return (
                        <div
                            key={hour}
                            className="border-b relative"
                            style={{ height: `${HOUR_HEIGHT}px` }}
                        >
                            {hourEvents.map((event, index) => (
                                <AgendaEvent
                                    key={`${event.program.id}-${event.time}-${index}`}
                                    event={event}
                                    color={programColorMap.get(event.program.id) || "bg-gray-500"}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
