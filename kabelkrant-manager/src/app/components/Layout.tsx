import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { TopBar } from './topBar'
import { Sidebar, SidebarItemProgram, SidebarItemTypes, SidebarItems } from './sidebar/sidebar'
import { ProgrammaFormSchema } from '../type/programFormName'
import { v4 } from 'uuid'
import { apiClient } from '../lib/apiClient'

export function Layout() {
  const [programs, setPrograms] = useState<ProgrammaFormSchema[]>([])
  const [firstRender, setFirstRender] = useState(true)
  const [obsIsConnected, setObsIsConnected] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined)
  const navigate = useNavigate()
  const location = useLocation()

  function readPrograms() {
    apiClient.getPrograms().then((data) => {
      var newData = JSON.parse(data)
      if (newData != null && Array.isArray(newData)) {
        setPrograms(newData)
      }
    })
  }

  function addProgram() {
    setPrograms([...programs, {
      id: v4(),
      path: '',
      programName: 'nieuw programma',
      planning: [],
      playAll: true
    }])
  }

  useEffect(() => {
    (async () => {
      const status = await apiClient.getObsIsRunning()
      setObsIsConnected(status)
    })()
    const unsubEvent = apiClient.onObsStatusChange((status: boolean) => {
      console.log('obs status changed', status)
      setObsIsConnected(status)
    })
    return () => {
      unsubEvent()
    }
  }, [])

  function deleteItem(index: number) {
    const newPrograms = [...programs]
    newPrograms.splice(index, 1)
    setPrograms(newPrograms)
  }

  useEffect(() => {
    if (firstRender) {
      setFirstRender(false)
      try {
        readPrograms()
      } catch (e) {
        console.log(e)
      }

      return
    }
    console.log('saving')
    apiClient.savePrograms(programs)
  }, [programs])

  const isPlaylistPage = location.pathname === '/playlist'
  const isProgramsPage = location.pathname === '/' || location.pathname === '/programs'

  const sidebarItems = useMemo<SidebarItems>(() => ({
    "Blokken": [...programs.map<SidebarItemProgram>((program, index) => ({
      type: SidebarItemTypes.PROGRAM,
      isSelected: index === selectedIndex && isProgramsPage,
      onSelected: () => {
        setSelectedIndex(index)
      },
      value: program,
      onClick: () => { setSelectedIndex(index); navigate('/programs') },
      onDelete: () => deleteItem(index)
    })), {
      type: SidebarItemTypes.BUTTON,
      text: "Voeg nieuw programma toe",
      isAdd: true,
      onClick: addProgram
    }],
    "Instellingen": [{
      type: SidebarItemTypes.BUTTON,
      text: "Speelt nu af",
      isSelected: isPlaylistPage,
      onClick: () => navigate('/playlist')
    }]
  }), [programs, selectedIndex, location.pathname])

  return (
    <div>
      <TopBar>
        {!obsIsConnected && <div style={{ color: "red", height: "100%" }}>OBS is niet geopend, dit kan problemen geven</div>}
      </TopBar>
      <div className='flex gap-5 '>
        <Sidebar items={sidebarItems} />
        <div className='mt-5 flex-1 bg-white px-5 py-2 rounded-md'>
          <Outlet context={{ programs, setPrograms, selectedIndex }} />
        </div>
      </div>
    </div>
  )
}
