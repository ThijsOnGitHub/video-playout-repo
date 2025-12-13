import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { programSchema } from '@/lib/schemas/program'
import { initializeServer } from '../init'

export const getObsStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { obsManager } = await initializeServer()
    return { connected: obsManager.isConnected }
  }
)

export const getPlaylist = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { playoutEngine } = await initializeServer()
    return playoutEngine.getPlaylist()
  }
)

export const playVideoItem = createServerFn({ method: 'POST' })
  .inputValidator(programSchema)
  .handler(async ({ data }) => {
    const { playoutEngine } = await initializeServer()
    playoutEngine.playVideoItem(data)
    return { success: true }
  })
