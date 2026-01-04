import type { Control } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ScheduledDatesEditorProps {
  control: Control<any>;
}

// Helper om een unieke ID te genereren
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Helper om te checken of een datum in het verleden ligt
function isInPast(dateTime: string): boolean {
  if (!dateTime) return false;
  const date = new Date(dateTime);
  return date < new Date();
}

// Helper om datum te formatteren voor weergave
function formatDateTime(dateTime: string): string {
  if (!dateTime) return "";
  const date = new Date(dateTime);
  return date.toLocaleString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Helper om standaard datetime-local waarde te krijgen (nu + 1 uur)
function getDefaultDateTime(): string {
  const date = new Date();
  date.setHours(date.getHours() + 1);
  date.setMinutes(0);
  date.setSeconds(0);
  // Format voor datetime-local input: YYYY-MM-DDTHH:mm
  return date.toISOString().slice(0, 16);
}

export const ScheduledDatesEditor: React.FC<ScheduledDatesEditorProps> = ({ control }) => {
  const { fields, append, remove } = useFieldArray({
    name: "scheduledDates",
    control,
  });

  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 && <div className="text-center text-gray-500 py-4">Nog geen specifieke datums gepland</div>}

      {fields.map((field, index) => {
        const dateTimeValue = control._getWatch(`scheduledDates.${index}.dateTime`);
        const isPast = isInPast(dateTimeValue);

        return (
          <Card key={field.id} className={`p-4 ${isPast ? "opacity-60 bg-gray-50" : ""}`}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Geplande uitzending</span>
                </div>
                {isPast && (
                  <Badge variant="secondary" className="bg-gray-200">
                    Verlopen
                  </Badge>
                )}
              </div>

              <div className="flex flex-row items-center gap-3">
                <div className="flex-1">
                  <Input type="datetime-local" className="w-full" {...control.register(`scheduledDates.${index}.dateTime`)} />
                  {dateTimeValue && <div className="text-sm text-gray-500 mt-1">{formatDateTime(dateTimeValue)}</div>}
                </div>

                <div className="flex-1">
                  <Input placeholder="Notitie (optioneel)" {...control.register(`scheduledDates.${index}.note`)} />
                </div>

                <Button variant="destructive" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}

      <Button
        variant="outline"
        className="w-full"
        onClick={() =>
          append({
            id: generateId(),
            dateTime: getDefaultDateTime(),
            note: "",
          })
        }
      >
        <Plus className="h-4 w-4 mr-2" />
        Specifieke datum toevoegen
      </Button>
    </div>
  );
};
