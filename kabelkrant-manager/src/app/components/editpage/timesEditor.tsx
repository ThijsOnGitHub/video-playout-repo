import { Control, useFieldArray } from "react-hook-form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Plus, Trash2 } from "lucide-react";




export interface TimesEditorProps {
    index: number;
    control: Control<any>;
}

export const TimesEditor: React.FC<TimesEditorProps> = ({ index, control }) => {
    const { fields, append, remove } = useFieldArray({
        name: `planning[${index}].times`,
        control
    })


    return <div className="flex flex-row items-center gap-2">
        {fields.map((field, timeIndex) => {
            return <div className="flex flex-row gap-2">
                <Input type="time" step={2} style={{height: 45}} {...control.register(`planning[${index}].times[${timeIndex}]`)} />
                <Button style={{ width: 45, height: 45 }} onClick={() => remove(-1)}><Trash2 style={{width: 35, height: 35}} /></Button>
            </div>
        })
        }
        <Button style={{ width: 45, height: 45 }} onClick={() => append("00:00:00")}><Plus className="h-4 w-4" /></Button>

    </div>

}