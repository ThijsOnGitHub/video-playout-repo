import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { FileVideo } from 'lucide-react'
import { TopBar } from '@/components/topBar'
import {
  Sidebar,
  SidebarItemTypes,
  type SidebarItems,
} from '@/components/sidebar/sidebar'
import { useRealtimeState } from '@/hooks/useRealtimeState'
import { getPrograms } from '@/server/functions/programs'
import { useMemo } from 'react'
import type { ProgramFormSchema } from '@/lib/schemas/program'

export const Route = createFileRoute('/playlist')({
  loader: async () => {
    const programs = await getPrograms()
    return { programs }
  },
  component: PlaylistPage,
})

function PlaylistPage() {
  const { programs } = Route.useLoaderData()
  const { obsConnected, playlist } = useRealtimeState()
  const navigate = useNavigate()

  const sidebarItems = useMemo<SidebarItems>(
    () => ({
      Blokken: [
        ...(programs as ProgramFormSchema[]).map((program) => ({
          type: SidebarItemTypes.PROGRAM as const,
          isSelected: false,
          onSelected: () => {
            navigate({ to: '/programs/$programId', params: { programId: program.id } })
          },
          value: program,
          onClick: () => {
            navigate({ to: '/programs/$programId', params: { programId: program.id } })
          },
        })),
        {
          type: SidebarItemTypes.BUTTON as const,
          text: 'Voeg nieuw programma toe',
          isAdd: true,
          onClick: () => navigate({ to: '/programs' }),
        },
      ],
      Instellingen: [
        {
          type: SidebarItemTypes.BUTTON as const,
          text: 'Speelt nu af',
          isSelected: true,
          onClick: () => {},
        },
      ],
    }),
    [programs, navigate]
  )

  return (
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
          <div className="flex flex-col gap-5">
            <h3>Speelt nu af</h3>
            {playlist.length === 0 ? <p>Playlist is leeg</p> : null}
            <Command>
              <CommandList>
                <CommandGroup>
                  {playlist.map((item, index) => (
                    <CommandItem key={`${item}-${index}`}>
                      <FileVideo className="mr-2 h-4 w-4" />
                      <span>{item}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </div>
      </div>
    </div>
  )
}
