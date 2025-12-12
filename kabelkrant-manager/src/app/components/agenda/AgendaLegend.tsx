import { FC } from "react";
import { ProgrammaFormSchema } from "../../type/programFormName";

export interface AgendaLegendProps {
    programs: ProgrammaFormSchema[];
    programColorMap: Map<string, string>;
}

export const AgendaLegend: FC<AgendaLegendProps> = ({
    programs,
    programColorMap,
}) => {
    if (programs.length === 0) {
        return null;
    }

    return (
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
    );
};
