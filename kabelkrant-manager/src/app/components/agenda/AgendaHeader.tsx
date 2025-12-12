import { FC } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface AgendaHeaderProps {
    weekOffset: number;
    onPreviousWeek: () => void;
    onNextWeek: () => void;
    onToday: () => void;
}

export const AgendaHeader: FC<AgendaHeaderProps> = ({
    weekOffset,
    onPreviousWeek,
    onNextWeek,
    onToday,
}) => {
    return (
        <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Agenda</h3>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onPreviousWeek}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={onToday}>
                    Vandaag
                </Button>
                <Button variant="outline" size="sm" onClick={onNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
