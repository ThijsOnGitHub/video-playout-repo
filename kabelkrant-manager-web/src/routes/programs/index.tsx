import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/programs/')({
  component: ProgramsIndex,
})

function ProgramsIndex() {
  return (
    <div className="text-center text-gray-500 h-full flex flex-col justify-center">
      Geen programma geselecteerd
    </div>
  )
}
