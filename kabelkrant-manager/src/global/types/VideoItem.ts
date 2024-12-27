export interface VideoItem{
    id:string
    playAll: boolean
    programName: string
    path: string
    planning: Planning[]
}

export interface Planning{
    days: number[]
    times: string[]
}

export type VideoItems = VideoItem[]
