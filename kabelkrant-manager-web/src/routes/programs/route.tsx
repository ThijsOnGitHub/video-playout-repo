import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { v4 } from 'uuid'
import { TopBar } from '@/components/topBar'
import {
  Sidebar,
  SidebarItemTypes,
  type SidebarItemProgram,
  type SidebarItems,
} from '@/components/sidebar/sidebar'
import type { ProgramFormSchema } from '@/lib/schemas/program'
import { getPrograms, savePrograms } from '@/server/functions/programs'
import { useRealtimeState } from '@/hooks/useRealtimeState'
import { ProgramsContext } from '@/contexts/ProgramsContext'

export const Route = createFileRoute('/programs')({
  loader: async () => {
    const programs = await getPrograms()
    return { programs }
  },
  component: ProgramsLayout,
})

function ProgramsLayout() {
  const { programs: initialPrograms } = Route.useLoaderData()
  const navigate = useNavigate()
  const { obsConnected } = useRealtimeState()
  const { programId } = Route.useParams() as { programId?: string }

  const [programs, setPrograms] = useState<ProgramFormSchema[]>(initialPrograms)
  const [firstRender, setFirstRender] = useState(true)

  const selectedIndex = programs.findIndex((p) => p.id === programId)

  function addProgram() {
    const newProgram = {
      id: v4(),
      path: '',
      programName: 'nieuw programma',
      planning: [],
      playAll: true,
    }
    setPrograms([...programs, newProgram])
    navigate({ to: '/programs/$programId', params: { programId: newProgram.id } })
  }

  function deleteItem(index: number) {
    const newPrograms = [...programs]
    newPrograms.splice(index, 1)
    setPrograms(newPrograms)
    if (selectedIndex === index) {
      navigate({ to: '/programs' })
    }
  }

  useEffect(() => {
    if (firstRender) {
      setFirstRender(false)
      return
    }
    console.log('saving programs')
    savePrograms({ data: programs })
  }, [programs, firstRender])

  const sidebarItems = useMemo<SidebarItems>(
    () => ({
      Blokken: [
        ...programs.map<SidebarItemProgram>((program, index) => ({
          type: SidebarItemTypes.PROGRAM,
          isSelected: program.id === programId,
          onSelected: () => {
            navigate({ to: '/programs/$programId', params: { programId: program.id } })
          },
          value: program,
          onClick: () => {
            navigate({ to: '/programs/$programId', params: { programId: program.id } })
          },
          onDelete: () => deleteItem(index),
        })),
        {
          type: SidebarItemTypes.BUTTON,
          text: 'Voeg nieuw programma toe',
          isAdd: true,
          onClick: addProgram,
        },
      ],
      Instellingen: [
        {
          type: SidebarItemTypes.BUTTON,
          text: 'Speelt nu af',
          isSelected: false,
          onClick: () => navigate({ to: '/playlist' }),
        },
      ],
    }),
    [programs, programId, navigate]
  )

  return (
    <ProgramsContext.Provider value={{ programs, setPrograms, selectedIndex }}>
      <div>
        <TopBar>
          {!obsConnected && (
            <div style={{ color: 'red', height: '100%' }}>
              OBS is niet geopend, dit kan problemen geven
            </div>
          )}
        </TopBar>
        <div className="flex gap-5">
          <Sidebar items={sidebarItems} />
          <div className="mt-5 flex-1 bg-white px-5 py-2 rounded-md">
            <Outlet />
          </div>
        </div>
      </div>
    </ProgramsContext.Provider>
  )
}
