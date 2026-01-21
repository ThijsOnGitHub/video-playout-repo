import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { programSchema } from '@/lib/schemas/program'
import { initializeServer } from '../init'

export const getPrograms = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { storage } = await initializeServer()
    return storage.getPrograms()
  }
)

export const savePrograms = createServerFn({ method: 'POST' })
  .inputValidator(z.array(programSchema))
  .handler(async ({ data }) => {
    const { storage } = await initializeServer()

    // Generate proper UUIDs for scheduled dates that have temporary IDs
    const programsWithUUIDs = data.map(program => ({
      ...program,
      scheduledDates: program.scheduledDates?.map(scheduled => ({
        ...scheduled,
        // Replace temporary IDs (non-UUID format) with proper UUIDs
        id: isValidUUID(scheduled.id) ? scheduled.id : randomUUID(),
      })) ?? [],
    }))

    storage.savePrograms(programsWithUUIDs)
    return { success: true }
  })

// Check if string is a valid UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}
