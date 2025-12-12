import { useOutletContext } from 'react-router-dom'
import { Programs } from '../page/Programs'
import { ProgrammaFormSchema } from '../type/programFormName'

interface LayoutContext {
  programs: ProgrammaFormSchema[]
  setPrograms: (programs: ProgrammaFormSchema[]) => void
  selectedIndex: number | undefined
}

export function ProgramsPage() {
  const { programs, setPrograms, selectedIndex } = useOutletContext<LayoutContext>()
  const selectedItem = selectedIndex === undefined ? undefined : programs[selectedIndex]

  return (
    <Programs
      selectedItem={selectedItem}
      programs={programs}
      selectedIndex={selectedIndex}
      setPrograms={setPrograms}
    />
  )
}
