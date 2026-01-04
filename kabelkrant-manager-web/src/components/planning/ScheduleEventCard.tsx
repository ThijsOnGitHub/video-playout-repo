import type { ScheduleEvent } from "@/lib/types/planning";
import { getProgramColor } from "@/lib/consts/planning";
import { formatDuration } from "@/lib/formatDuration";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

interface ScheduleEventCardProps {
  event: ScheduleEvent;
  variant?: "compact" | "full";
  style?: React.CSSProperties;
  className?: string;
}

export function ScheduleEventCard({ event, variant = "compact", style, className = "" }: ScheduleEventCardProps) {
  const navigate = useNavigate();
  const color = getProgramColor(event.program.id);

  const handleClick = () => {
    navigate({
      to: "/programs/$programId",
      params: { programId: event.program.id },
    });
  };

  if (variant === "compact") {
    return (
      <div
        className={`${color} bg-opacity-90 hover:bg-opacity-100 rounded text-white p-1 cursor-pointer transition-all shadow-sm hover:shadow-md z-10 overflow-hidden ${className}`}
        style={style}
        onClick={handleClick}
      >
        <div className="text-xs font-semibold truncate">{event.program.programName}</div>
        <div className="text-[10px] opacity-90 flex items-center gap-1">
          <Clock className="w-2 h-2" />
          {event.time}
          {event.durationMinutes > 0 && <span className="ml-1">({formatDuration(event.durationMinutes * 60 * 1000)})</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-2 last:mb-0 ${color} bg-opacity-90 hover:bg-opacity-100 rounded-lg p-4 cursor-pointer transition-all shadow-md hover:shadow-lg ${className}`} onClick={handleClick}>
      <div className="flex items-start justify-between gap-4 text-white">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{event.program.programName}</h3>
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
          </div>
        </div>
        <div className="text-xs opacity-75 bg-white/20 px-2 py-1 rounded">{event.program.path}</div>
      </div>
    </div>
  );
}
