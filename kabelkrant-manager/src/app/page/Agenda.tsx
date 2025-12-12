import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { ProgrammaFormSchema } from "../type/programFormName";
import { VideoFile } from "../../global/types/FileMetaTypes";
import {
    AgendaHeader,
    AgendaLegend,
    AgendaGrid,
    ScheduledEvent,
    PROGRAM_COLORS,
} from "../components/agenda";

export interface AgendaProps {
    programs: ProgrammaFormSchema[];
}

export const Agenda: FC<AgendaProps> = ({ programs }) => {
    const [weekOffset, setWeekOffset] = useState(0);
    const [programDurations, setProgramDurations] = useState<Map<string, number>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    // Fetch video durations for all programs
    const fetchDurations = useCallback(async () => {
        setIsLoading(true);
        const durations = new Map<string, number>();

        await Promise.all(
            programs.map(async (program) => {
                if (!program.path) {
                    durations.set(program.id, 0);
                    return;
                }

                try {
                    const files = await window.electronApi.getFilesInFolder(program.path);
                    const videoFiles = files.filter((f): f is VideoFile => f.type === "video");

                    // Calculate total duration based on playAll setting
                    let totalDuration = 0;
                    if (program.playAll) {
                        // Sum all video durations
                        totalDuration = videoFiles.reduce((sum, file) => sum + (file.duration || 0), 0);
                    } else {
                        // Use average video duration (since it picks one)
                        const avgDuration = videoFiles.length > 0
                            ? videoFiles.reduce((sum, file) => sum + (file.duration || 0), 0) / videoFiles.length
                            : 0;
                        totalDuration = avgDuration;
                    }

                    durations.set(program.id, totalDuration);
                } catch (error) {
                    console.error(`Error fetching duration for ${program.programName}:`, error);
                    durations.set(program.id, 0);
                }
            })
        );

        setProgramDurations(durations);
        setIsLoading(false);
    }, [programs]);

    useEffect(() => {
        fetchDurations();
    }, [fetchDurations]);

    // Get the current week's dates based on offset
    const weekDates = useMemo(() => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

        const dates: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - currentDay + i + weekOffset * 7);
            dates.push(date);
        }
        return dates;
    }, [weekOffset]);

    // Create a map of program id to color
    const programColorMap = useMemo(() => {
        const map = new Map<string, string>();
        programs.forEach((program, index) => {
            map.set(program.id, PROGRAM_COLORS[index % PROGRAM_COLORS.length]);
        });
        return map;
    }, [programs]);

    // Calculate end time given start time and duration
    const calculateEndTime = (startTime: string, durationSeconds: number): string => {
        const [hours, minutes, seconds] = startTime.split(":").map(Number);
        const startSeconds = hours * 3600 + minutes * 60 + (seconds || 0);
        const endSeconds = startSeconds + durationSeconds;

        const endHours = Math.floor(endSeconds / 3600) % 24;
        const endMinutes = Math.floor((endSeconds % 3600) / 60);
        const endSecs = Math.floor(endSeconds % 60);

        return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}:${endSecs.toString().padStart(2, "0")}`;
    };

    // Build schedule data: for each day, list of events
    const scheduleByDay = useMemo(() => {
        const schedule = new Map<number, ScheduledEvent[]>();

        // Initialize empty schedule for each day
        for (let day = 0; day < 7; day++) {
            schedule.set(day, []);
        }

        // Fill in scheduled events
        programs.forEach((program) => {
            const duration = programDurations.get(program.id) || 0;

            program.planning.forEach((planning) => {
                planning.days.forEach((day) => {
                    planning.times.forEach((time) => {
                        const [hourStr, minuteStr, secondStr] = time.split(":");
                        const hour = parseInt(hourStr, 10);
                        const minute = parseInt(minuteStr, 10);
                        const second = parseInt(secondStr || "0", 10);

                        if (!isNaN(hour) && hour >= 0 && hour < 24) {
                            const endTime = calculateEndTime(time, duration);

                            schedule.get(day)!.push({
                                program,
                                time,
                                hour,
                                minute,
                                second,
                                durationSeconds: duration,
                                endTime,
                            });
                        }
                    });
                });
            });
        });

        // Sort events within each day by time
        schedule.forEach((events) => {
            events.sort((a, b) => {
                if (a.hour !== b.hour) return a.hour - b.hour;
                if (a.minute !== b.minute) return a.minute - b.minute;
                return a.second - b.second;
            });
        });

        return schedule;
    }, [programs, programDurations]);

    const handlePreviousWeek = () => setWeekOffset(weekOffset - 1);
    const handleNextWeek = () => setWeekOffset(weekOffset + 1);
    const handleToday = () => setWeekOffset(0);

    return (
        <div className="flex flex-col gap-4 h-full">
            <AgendaHeader
                weekOffset={weekOffset}
                onPreviousWeek={handlePreviousWeek}
                onNextWeek={handleNextWeek}
                onToday={handleToday}
            />

            <AgendaLegend programs={programs} programColorMap={programColorMap} />

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                    Laden...
                </div>
            ) : (
                <AgendaGrid
                    weekDates={weekDates}
                    scheduleByDay={scheduleByDay}
                    programColorMap={programColorMap}
                />
            )}
        </div>
    );
};
