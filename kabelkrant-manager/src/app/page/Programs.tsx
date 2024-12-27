import { ProgramForm } from "@/components/editpage/programForm"
import { ProgrammaFormSchema } from "@/type/programFormName"
import { FC } from "react"

export interface ProgramsProps {
    selectedItem?: ProgrammaFormSchema
    programs: ProgrammaFormSchema[]
    selectedIndex: number | undefined
    setPrograms: (newPrograms: ProgrammaFormSchema[]) => void
}

export const Programs: FC<ProgramsProps> = ({selectedItem, programs,selectedIndex, setPrograms }) => {
    return selectedItem == null ?
      <div className='text-center text-gray-500 h-full flex flex-col justify-center'>Geen programma geselecteerd</div> :
      <ProgramForm key={selectedItem.programName} value={selectedItem} onSubmit={(data) => {
        const newPrograms = [...programs]
        newPrograms[selectedIndex!] = data
        setPrograms(newPrograms)
      }} />
}