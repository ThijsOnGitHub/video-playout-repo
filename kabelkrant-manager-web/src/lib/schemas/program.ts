import { z } from 'zod'
import type { VideoItem } from '@/lib/types/VideoItem'

export const planningSchema = z.object({
  days: z.array(z.number()),
  times: z.array(z.string()),
})

export const programSchema = z.object({
  id: z.string(),
  programName: z.string(),
  playAll: z.boolean(),
  path: z.string(),
  planning: z.array(planningSchema).default([
    {
      days: [],
      times: ['00:00:00'],
    },
  ]),
})

export type ProgramFormSchema = z.infer<typeof programSchema> & VideoItem
