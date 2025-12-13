import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
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
    storage.savePrograms(data)
    return { success: true }
  })
