import { useEffect, useMemo, useState } from 'react'
import { TopBar } from './components/topBar'
import { Sidebar, SidebarItemProgram, SidebarItemTypes, SidebarItems } from './components/sidebar/sidebar'

import { ProgrammaFormSchema } from './type/programFormName'
import { v4 } from 'uuid'
import { Pages } from './consts/pages'
import { Programs } from './page/Programs'
import { Playlist } from './page/Playlist'

function App() {
  const [programs, setPrograms] = useState<ProgrammaFormSchema[]>([])
  const [firstRender, setFirstRender] = useState(true)
  const [obsIsConnected, setObsIsConnected] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined)
  const [page,setPage] = useState<Pages>(Pages.PROGRAMS)

  const selectedItem = selectedIndex == undefined ? undefined : programs[selectedIndex]

  function readPrograms() {
    window.electronApi.getPrograms().then((data) => {
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
      const status = await window.electronApi.getObsIsRunning()
      setObsIsConnected(status)
    })()
    const unsubEvent = window.electronApi.onObsStatusChange((status:boolean) => {
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
    window.electronApi.savePrograms(JSON.stringify(programs))
  }, [programs])

  const sidebarItems = useMemo<SidebarItems>(() => ({
    "Blokken": [...programs.map<SidebarItemProgram>((program, index) => ({
      type: SidebarItemTypes.PROGRAM,
      isSelected: index === selectedIndex && page == Pages.PROGRAMS,
      onSelected: () => {
        setSelectedIndex(index)
      },
      value: program,
      onClick: () => {setSelectedIndex(index); setPage(Pages.PROGRAMS)},
      onDelete: () => deleteItem(index)
    })),{
      type: SidebarItemTypes.BUTTON, 
      text: "Voeg nieuw programma toe", 
      isAdd: true,
      onClick: addProgram
    }],
    "Instellingen": [{
      type: SidebarItemTypes.BUTTON,
      text: "Speelt nu af",
      isSelected: page == Pages.CURRENT_PLAYLIST,
      onClick: () => setPage(Pages.CURRENT_PLAYLIST)
    }]
  }), [programs, selectedIndex, page ])


  return (
    <div>
      <TopBar >
        {!obsIsConnected && <div style={{color: "red" ,height: "100%"}}>OBS is niet geopend, dit kan problemen geven</div>}
      </TopBar>
      <div className='flex gap-5 '>
        <Sidebar items={sidebarItems} />
        <div className='mt-5 flex-1 bg-white px-5 py-2 rounded-md'>
          {page == Pages.PROGRAMS && <Programs selectedItem={selectedItem} programs={programs} selectedIndex={selectedIndex} setPrograms={setPrograms} />}
          {page == Pages.CURRENT_PLAYLIST && <Playlist/>}
        </div>
      </div>

    </div>
  )
}

export default App
