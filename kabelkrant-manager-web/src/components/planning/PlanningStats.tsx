import type { ProgramFormSchema } from "@/lib/schemas/program";
import type { ScheduleEvent } from "@/lib/types/planning";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlanningStatsProps {
  programs: ProgramFormSchema[];
  scheduleEvents: ScheduleEvent[];
}

export function PlanningStats({ programs, scheduleEvents }: PlanningStatsProps) {
  const totalScheduled = scheduleEvents.length;
  const programsWithSchedule = programs.filter((p) => p.planning && p.planning.length > 0 && p.planning.some((plan) => plan.days.length > 0)).length;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
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
          <CardTitle className="text-sm font-medium text-gray-600">Totaal Tijdslots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-600">{totalScheduled}</div>
        </CardContent>
      </Card>
    </div>
  );
}
