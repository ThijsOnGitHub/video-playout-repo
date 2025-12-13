import { createContext, useContext } from 'react'
import type { ProgramFormSchema } from '@/lib/schemas/program'

interface ProgramsContextValue {
  programs: ProgramFormSchema[]
  setPrograms: (programs: ProgramFormSchema[]) => void
  selectedIndex: number
}

export const ProgramsContext = createContext<ProgramsContextValue | null>(null)

export function useProgramsContext() {
  const context = useContext(ProgramsContext)
  if (!context) {
    throw new Error('useProgramsContext must be used within a ProgramsContext.Provider')
  }
  return context
}
