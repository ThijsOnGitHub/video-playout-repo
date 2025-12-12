import { FC, useMemo, useState } from "react";
import { ProgrammaFormSchema } from "../type/programFormName";
import { days } from "../type/days";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface AgendaProps {
    programs: ProgrammaFormSchema[];
}

interface ScheduledEvent {
    program: ProgrammaFormSchema;
    time: string;
    hour: number;
    minute: number;
}

// Generate time slots for each hour from 0 to 23
const hours = Array.from({ length: 24 }, (_, i) => i);

// Color palette for different programs
const programColors = [
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

export const Agenda: FC<AgendaProps> = ({ programs }) => {
    const [weekOffset, setWeekOffset] = useState(0);

    // Get the current week's dates based on offset
    const weekDates = useMemo(() => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

        const weekDates: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - currentDay + i + (weekOffset * 7));
            weekDates.push(date);
        }
        return weekDates;
    }, [weekOffset]);

    // Create a map of program id to color
    const programColorMap = useMemo(() => {
        const map = new Map<string, string>();
        programs.forEach((program, index) => {
            map.set(program.id, programColors[index % programColors.length]);
        });
        return map;
    }, [programs]);

    // Build schedule data: for each day, for each time slot
    const scheduleByDayAndHour = useMemo(() => {
        // Map: day (0-6) -> hour (0-23) -> events
        const schedule: Map<number, Map<number, ScheduledEvent[]>> = new Map();

        // Initialize empty schedule
        for (let day = 0; day < 7; day++) {
            schedule.set(day, new Map());
            for (let hour = 0; hour < 24; hour++) {
                schedule.get(day)!.set(hour, []);
            }
        }

        // Fill in scheduled events
        programs.forEach((program) => {
            program.planning.forEach((planning) => {
                planning.days.forEach((day) => {
                    planning.times.forEach((time) => {
                        const [hourStr, minuteStr] = time.split(":");
                        const hour = parseInt(hourStr, 10);
                        const minute = parseInt(minuteStr, 10);

                        if (!isNaN(hour) && hour >= 0 && hour < 24) {
                            schedule.get(day)!.get(hour)!.push({
                                program,
                                time,
                                hour,
                                minute,
                            });
                        }
                    });
                });
            });
        });

        // Sort events within each hour by time
        schedule.forEach((hourMap) => {
            hourMap.forEach((events) => {
                events.sort((a, b) => {
                    if (a.hour !== b.hour) return a.hour - b.hour;
                    return a.minute - b.minute;
                });
            });
        });

        return schedule;
    }, [programs]);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const formatHour = (hour: number) => {
        return `${hour.toString().padStart(2, "0")}:00`;
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Agenda</h3>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWeekOffset(weekOffset - 1)}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWeekOffset(0)}
                    >
                        Vandaag
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWeekOffset(weekOffset + 1)}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2">
                {programs.map((program) => (
                    <div key={program.id} className="flex items-center gap-1">
                        <div
                            className={`w-3 h-3 rounded ${programColorMap.get(program.id)}`}
                        />
                        <span className="text-xs">{program.programName}</span>
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto border rounded-lg">
                <div className="min-w-[800px]">
                    {/* Header with days */}
                    <div className="grid grid-cols-8 border-b sticky top-0 bg-white z-10">
                        <div className="p-2 border-r text-center text-sm font-medium text-gray-500">
                            Tijd
                        </div>
                        {days.map((day, index) => {
                            const date = weekDates[index];
                            const todayClass = isToday(date)
                                ? "bg-blue-50 text-blue-600"
                                : "";
                            return (
                                <div
                                    key={day.value}
                                    className={`p-2 border-r text-center ${todayClass}`}
                                >
                                    <div className="font-medium text-sm">{day.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {formatDate(date)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Time slots */}
                    {hours.map((hour) => (
                        <div key={hour} className="grid grid-cols-8 border-b min-h-[60px]">
                            <div className="p-1 border-r text-xs text-gray-500 text-center">
                                {formatHour(hour)}
                            </div>
                            {days.map((day) => {
                                const events = scheduleByDayAndHour.get(day.value)?.get(hour) || [];
                                const date = weekDates[day.value];
                                const todayClass = isToday(date) ? "bg-blue-50/50" : "";

                                return (
                                    <div
                                        key={`${day.value}-${hour}`}
                                        className={`p-1 border-r relative ${todayClass}`}
                                    >
                                        {events.map((event, eventIndex) => (
                                            <div
                                                key={`${event.program.id}-${event.time}-${eventIndex}`}
                                                className={`${programColorMap.get(event.program.id)} text-white text-xs p-1 rounded mb-1 truncate cursor-default`}
                                                title={`${event.program.programName} - ${event.time}`}
                                            >
                                                <div className="font-medium truncate">
                                                    {event.program.programName}
                                                </div>
                                                <div className="opacity-80">
                                                    {event.time.substring(0, 5)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
