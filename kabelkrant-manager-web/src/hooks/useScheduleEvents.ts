import { useMemo } from "react";
import type { ProgramFormSchema } from "@/lib/schemas/program";
import type { ScheduleEvent } from "@/lib/types/planning";

export function useScheduleEvents(programs: ProgramFormSchema[], programDurations: Record<string, number>) {
  const scheduleEvents = useMemo<ScheduleEvent[]>(() => {
    const events: ScheduleEvent[] = [];

    programs.forEach((program) => {
      const durationSeconds = programDurations[program.id] || 0;
      const durationMinutes = Math.ceil(durationSeconds / 60);

      program.planning?.forEach((plan) => {
        plan.days.forEach((day) => {
          plan.times.forEach((time) => {
            const [hours, minutes] = time.split(":").map(Number);
            events.push({
              program,
              time,
              day,
              durationMinutes,
              startHour: hours,
              startMinute: minutes,
            });
          });
        });
      });
    });

    return events.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      if (a.startHour !== b.startHour) return a.startHour - b.startHour;
      return a.startMinute - b.startMinute;
    });
  }, [programs, programDurations]);

  const getEventsForDay = (day: number) => {
    return scheduleEvents.filter((event) => event.day === day);
  };

  return { scheduleEvents, getEventsForDay };
}
