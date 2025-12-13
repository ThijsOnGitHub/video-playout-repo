import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { initializeServer } from '../init'

export const getFilesInFolder = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ path: z.string() }))
  .handler(async ({ data }) => {
    const { storage } = await initializeServer()
    return storage.getFilesInFolder(data.path)
  })

export const browseDirectory = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ relativePath: z.string().optional() }))
  .handler(async ({ data }) => {
    const { storage } = await initializeServer()
    return storage.browseDirectory(data.relativePath || '')
  })
