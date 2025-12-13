import { createFileRoute } from '@tanstack/react-router'
import { ProgramForm } from '@/components/editpage/programForm'
import { useProgramsContext } from '@/contexts/ProgramsContext'

export const Route = createFileRoute('/programs/$programId')({
  component: ProgramDetail,
})

function ProgramDetail() {
  const { programId } = Route.useParams()
  const { programs, setPrograms } = useProgramsContext()

  const selectedIndex = programs.findIndex((p) => p.id === programId)
  const selectedItem = programs[selectedIndex]

  if (!selectedItem) {
    return (
      <div className="text-center text-gray-500 h-full flex flex-col justify-center">
        Programma niet gevonden
      </div>
    )
  }

  return (
    <ProgramForm
      key={selectedItem.id}
      value={selectedItem}
      onSubmit={(data) => {
        const newPrograms = [...programs]
        newPrograms[selectedIndex] = data
        setPrograms(newPrograms)
      }}
    />
  )
}
