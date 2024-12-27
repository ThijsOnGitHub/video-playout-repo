import { VideoItem } from "../../global/types/VideoItem"
import { z } from "zod"

export const schema = z.object({
    id: z.string(),
    programName: z.string(),
    playAll: z.boolean(),
    path: z.string(),
    planning: z.array(z.object({
        days: z.array(z.number()),
        times: z.array(z.string()) 
    })).default([{
        days: [],
        times: ["00:00:00"]
    }]),
})

export type ProgrammaFormSchema = z.infer<typeof schema> & VideoItem