import { FC } from "react";
import { days } from "../../type/days";
import { ScheduledEvent } from "./types";
import { AgendaTimeColumn } from "./AgendaTimeColumn";
import { AgendaDayColumn } from "./AgendaDayColumn";

export interface AgendaGridProps {
    weekDates: Date[];
    scheduleByDay: Map<number, ScheduledEvent[]>;
    programColorMap: Map<string, string>;
}

const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
};

export const AgendaGrid: FC<AgendaGridProps> = ({
    weekDates,
    scheduleByDay,
    programColorMap,
}) => {
    return (
        <div className="flex-1 overflow-auto border rounded-lg">
            <div className="flex min-w-[900px]">
                {/* Time column */}
                <AgendaTimeColumn />

                {/* Day columns */}
                {days.map((day, index) => {
                    const date = weekDates[index];
                    const events = scheduleByDay.get(day.value) || [];

                    return (
                        <AgendaDayColumn
                            key={day.value}
                            dayName={day.name}
                            date={date}
                            isToday={isToday(date)}
                            events={events}
                            programColorMap={programColorMap}
                        />
                    );
                })}
            </div>
        </div>
    );
};
