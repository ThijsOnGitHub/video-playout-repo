import type { ScheduleEvent } from "@/lib/types/planning";
import { DAYS_NL, DAYS_SHORT, HOURS } from "@/lib/consts/planning";
import { ScheduleEventCard } from "./ScheduleEventCard";

interface WeekViewProps {
  weekDates: Date[];
  getEventsForDay: (day: number) => ScheduleEvent[];
}

export function WeekView({ weekDates, getEventsForDay }: WeekViewProps) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1200px]">
        {/* Header with day names */}
        <div className="grid grid-cols-8 gap-1 mb-2">
          <div className="text-xs font-medium text-gray-500 sticky left-0 bg-white"></div>
          {DAYS_NL.map((day, index) => {
            const date = weekDates[index];
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <div key={index} className={`text-center p-2 rounded-t ${isToday ? "bg-blue-100 border-b-2 border-blue-500" : "bg-gray-50"}`}>
                <div className="text-sm font-semibold">{DAYS_SHORT[index]}</div>
                <div className={`text-xs ${isToday ? "text-blue-600 font-bold" : "text-gray-500"}`}>
                  {date.getDate()}/{date.getMonth() + 1}
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline grid */}
        <div className="border rounded-lg overflow-hidden bg-white">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
              {/* Time label */}
              <div className="p-2 bg-gray-50 border-r text-xs text-gray-600 font-medium sticky left-0">{hour.toString().padStart(2, "0")}:00</div>

              {/* Day columns */}
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const eventsInHour = getEventsForDay(dayIndex).filter((event) => event.startHour === hour);

                return (
                  <div key={dayIndex} className="relative border-r last:border-r-0 min-h-[60px] p-1">
                    {eventsInHour.map((event, eventIndex) => {
                      const heightPerMinute = 1; // pixels per minute
                      const height = Math.max(event.durationMinutes * heightPerMinute, 24);

                      return (
                        <ScheduleEventCard
                          key={eventIndex}
                          event={event}
                          variant="compact"
                          className="absolute left-1 right-1"
                          style={{
                            top: `${event.startMinute * heightPerMinute}px`,
                            height: `${height}px`,
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
