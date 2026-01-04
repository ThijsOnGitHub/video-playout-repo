import type { ScheduleEvent } from "@/lib/types/planning";
import { DAYS_NL, HOURS } from "@/lib/consts/planning";
import { ScheduleEventCard } from "./ScheduleEventCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface DayViewProps {
  selectedDay: number;
  weekDates: Date[];
  getEventsForDay: (day: number) => ScheduleEvent[];
}

export function DayView({ selectedDay, weekDates, getEventsForDay }: DayViewProps) {
  const events = getEventsForDay(selectedDay);
  const date = weekDates[selectedDay];

  return (
    <div className="space-y-4">
      {/* Day Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {DAYS_NL[selectedDay]} - {date.getDate()}/{date.getMonth() + 1}/{date.getFullYear()}
          </CardTitle>
        </CardHeader>
      </Card>

      {events.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Geen video's gepland voor deze dag</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline for the day */}
          {HOURS.map((hour) => {
            const eventsInHour = events.filter((e) => e.startHour === hour);

            return (
              <div key={hour} className="flex border-b last:border-b-0">
                {/* Hour label */}
                <div className="w-20 flex-shrink-0 p-3 bg-gray-50 text-sm font-medium text-gray-600 border-r">{hour.toString().padStart(2, "0")}:00</div>

                {/* Events area */}
                <div className="flex-1 relative min-h-[80px] p-2">
                  {eventsInHour.map((event, index) => (
                    <ScheduleEventCard key={index} event={event} variant="full" />
                  ))}
                  {eventsInHour.length === 0 && <div className="text-gray-400 text-sm italic">Geen planning</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
