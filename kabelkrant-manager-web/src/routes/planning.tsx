import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/topBar";
import { Sidebar } from "@/components/sidebar/sidebar";
import { useRealtimeState } from "@/hooks/useRealtimeState";
import { useSidebarItems } from "@/hooks/useSidebarItems";
import { getPrograms } from "@/server/functions/programs";
import { useState, useEffect, useMemo } from "react";
import type { VideoItem, ScheduledDate } from "@/lib/types/VideoItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, Clock, CalendarClock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDuration } from "@/lib/formatDuration";
import { getFilesInFolder } from "@/server/functions/files";
import type { VideoFile } from "@/lib/types/FileMetaTypes";

export const Route = createFileRoute("/planning")({
  loader: async () => {
    const programs = await getPrograms();
    return { programs };
  },
  staleTime: 0, // Always refetch to get latest schedule data
  component: PlanningPage,
});

const DAYS_NL = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
const DAYS_SHORT = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface ScheduleEvent {
  program: VideoItem;
  time: string;
  day: number;
  durationMinutes: number;
  startHour: number;
  startMinute: number;
  // Voor specifieke datum events
  isScheduledDate?: boolean;
  scheduledDate?: ScheduledDate;
  date?: Date;
}

// Generate color for program based on its ID
function getProgramColor(programId: string): string {
  const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500", "bg-red-500", "bg-yellow-500", "bg-cyan-500"];

  // Simple hash function to get consistent color for same program
  let hash = 0;
  for (let i = 0; i < programId.length; i++) {
    hash = programId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function PlanningPage() {
  const { programs } = Route.useLoaderData();
  const { obsConnected, playoutMode } = useRealtimeState();
  const navigate = useNavigate();
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  // Fetch durations for all programs
  const [programDurations, setProgramDurations] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchDurations() {
      const durations: Record<string, number> = {};

      for (const program of programs) {
        if (!program.path) continue;

        try {
          const files = await getFilesInFolder({ data: { path: program.path } });
          const videoFiles = files.filter((f) => f.type === "video") as VideoFile[];

          if (program.playAll) {
            // Sum all video durations
            const totalDuration = videoFiles.reduce((sum, file) => sum + (file.duration || 0), 0);
            durations[program.id] = totalDuration;
          } else {
            // Use average or first video duration
            const avgDuration = videoFiles.length > 0 ? videoFiles.reduce((sum, file) => sum + (file.duration || 0), 0) / videoFiles.length : 0;
            durations[program.id] = avgDuration;
          }
        } catch (e) {
          console.error(`Error fetching files for program ${program.id}`, e);
          durations[program.id] = 0;
        }
      }

      setProgramDurations(durations);
    }

    fetchDurations();
  }, [programs]);

  const sidebarItems = useSidebarItems({
    programs,
    activePage: "planning",
  });

  // Get current week dates
  const getWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay + currentWeekOffset * 7);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  };

  const weekDates = getWeekDates();

  // Process programs into schedule events (including scheduled dates)
  const scheduleEvents = useMemo<ScheduleEvent[]>(() => {
    const events: ScheduleEvent[] = [];

    programs.forEach((program) => {
      const durationSeconds = programDurations[program.id] || 0;
      const durationMinutes = Math.ceil(durationSeconds / 60);

      // Wekelijkse planning
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
              isScheduledDate: false,
            });
          });
        });
      });

      // Specifieke datum/tijd planning
      program.scheduledDates?.forEach((scheduled) => {
        if (!scheduled.dateTime) return;

        const scheduledDateObj = new Date(scheduled.dateTime);
        const day = scheduledDateObj.getDay();
        const hours = scheduledDateObj.getHours();
        const minutes = scheduledDateObj.getMinutes();
        const time = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;

        events.push({
          program,
          time,
          day,
          durationMinutes,
          startHour: hours,
          startMinute: minutes,
          isScheduledDate: true,
          scheduledDate: scheduled,
          date: scheduledDateObj,
        });
      });
    });

    return events.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      if (a.startHour !== b.startHour) return a.startHour - b.startHour;
      return a.startMinute - b.startMinute;
    });
  }, [programs, programDurations]);

  // Get events for a specific day and date
  const getEventsForDayAndDate = (day: number, date: Date) => {
    return scheduleEvents.filter((event) => {
      if (event.day !== day) return false;

      // Voor specifieke datum events, check of de datum overeenkomt
      if (event.isScheduledDate && event.date) {
        return event.date.toDateString() === date.toDateString();
      }

      // Wekelijkse events worden altijd getoond
      return true;
    });
  };

  // Legacy functie voor backward compatibility
  const getEventsForDay = (day: number) => {
    return scheduleEvents.filter((event) => event.day === day && !event.isScheduledDate);
  };

  const renderWeekView = () => {
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
                  const date = weekDates[dayIndex];
                  const eventsInHour = getEventsForDayAndDate(dayIndex, date).filter((event) => event.startHour === hour);

                  return (
                    <div key={dayIndex} className="relative border-r last:border-r-0 min-h-[60px] p-1">
                      {eventsInHour.map((event, eventIndex) => {
                        const heightPerMinute = 1; // pixels per minute
                        const height = Math.max(event.durationMinutes * heightPerMinute, 24);
                        const color = getProgramColor(event.program.id);
                        const isScheduled = event.isScheduledDate;

                        return (
                          <div
                            key={eventIndex}
                            className={`absolute left-1 right-1 ${color} bg-opacity-90 hover:bg-opacity-100 rounded text-white p-1 cursor-pointer transition-all shadow-sm hover:shadow-md z-10 overflow-hidden ${isScheduled ? "ring-2 ring-yellow-400" : ""}`}
                            style={{
                              top: `${event.startMinute * heightPerMinute}px`,
                              height: `${height}px`,
                            }}
                            onClick={() => {
                              navigate({
                                to: "/programs/$programId",
                                params: { programId: event.program.id },
                              });
                            }}
                          >
                            <div className="text-xs font-semibold truncate flex items-center gap-1">
                              {isScheduled && <CalendarClock className="w-3 h-3 text-yellow-300" />}
                              {event.program.programName}
                            </div>
                            <div className="text-[10px] opacity-90 flex items-center gap-1">
                              <Clock className="w-2 h-2" />
                              {event.time}
                              {event.durationMinutes > 0 && <span className="ml-1">({formatDuration(event.durationMinutes * 60 * 1000)})</span>}
                            </div>
                          </div>
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
  };

  const renderDayView = () => {
    const date = weekDates[selectedDay];
    const events = getEventsForDayAndDate(selectedDay, date);

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
                    {eventsInHour.map((event, index) => {
                      const color = getProgramColor(event.program.id);
                      const isScheduled = event.isScheduledDate;

                      return (
                        <div
                          key={index}
                          className={`mb-2 last:mb-0 ${color} bg-opacity-90 hover:bg-opacity-100 rounded-lg p-4 cursor-pointer transition-all shadow-md hover:shadow-lg ${isScheduled ? "ring-2 ring-yellow-400" : ""}`}
                          onClick={() => {
                            navigate({
                              to: "/programs/$programId",
                              params: { programId: event.program.id },
                            });
                          }}
                        >
                          <div className="flex items-start justify-between gap-4 text-white">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                                {isScheduled && <CalendarClock className="w-5 h-5 text-yellow-300" />}
                                {event.program.programName}
                              </h3>
                              <div className="flex items-center gap-4 text-sm opacity-90">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{event.time}</span>
                                </div>
                                {event.durationMinutes > 0 && (
                                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                                    Duur: {formatDuration(event.durationMinutes * 60 * 1000)}
                                  </Badge>
                                )}
                                {event.program.playAll && (
                                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                                    Speel alles af
                                  </Badge>
                                )}
                                {isScheduled && (
                                  <Badge variant="secondary" className="bg-yellow-400/30 text-white border-yellow-400/50">
                                    Specifieke datum
                                  </Badge>
                                )}
                              </div>
                              {isScheduled && event.scheduledDate?.note && <div className="mt-2 text-sm opacity-80 italic">Notitie: {event.scheduledDate.note}</div>}
                            </div>
                            <div className="text-xs opacity-75 bg-white/20 px-2 py-1 rounded">{event.program.path}</div>
                          </div>
                        </div>
                      );
                    })}
                    {eventsInHour.length === 0 && <div className="text-gray-400 text-sm italic">Geen planning</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderStats = () => {
    const weeklyScheduled = scheduleEvents.filter((e) => !e.isScheduledDate).length;
    const specificDatesScheduled = scheduleEvents.filter((e) => e.isScheduledDate).length;
    const programsWithSchedule = programs.filter(
      (p) => (p.planning && p.planning.length > 0 && p.planning.some((plan) => plan.days.length > 0)) || (p.scheduledDates && p.scheduledDates.length > 0)
    ).length;

    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Totaal Programma's</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{programs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ingepland</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{programsWithSchedule}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Wekelijkse slots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{weeklyScheduled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <CalendarClock className="w-4 h-4" />
              Specifieke datums
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{specificDatesScheduled}</div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div>
      <TopBar>{playoutMode === "obs" && !obsConnected && <div style={{ color: "red", height: "100%" }}>OBS is niet geopend, dit kan problemen geven</div>}</TopBar>
      <div className="flex gap-5">
        <Sidebar items={sidebarItems} />
        <div className="mt-5 flex-1 bg-white px-5 py-4 rounded-md">
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                Video Planning
              </h2>
              <div className="flex items-center gap-2">
                <Select value={viewMode} onValueChange={(v) => setViewMode(v as "week" | "day")}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Week overzicht</SelectItem>
                    <SelectItem value="day">Dag overzicht</SelectItem>
                  </SelectContent>
                </Select>
                {viewMode === "day" && (
                  <Select value={selectedDay.toString()} onValueChange={(v) => setSelectedDay(parseInt(v))}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_NL.map((day, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {renderStats()}

            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="sm" onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Vorige week
              </Button>
              <div className="text-sm font-medium">
                {weekDates[0].getDate()}/{weekDates[0].getMonth() + 1} - {weekDates[6].getDate()}/{weekDates[6].getMonth() + 1}/{weekDates[6].getFullYear()}
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}>
                Volgende week
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {viewMode === "week" ? renderWeekView() : renderDayView()}

            {scheduleEvents.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Nog geen video's ingepland</p>
                <p className="text-sm">Ga naar een programma om tijden en dagen in te plannen</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
