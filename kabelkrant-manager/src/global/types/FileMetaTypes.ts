export type BaseFile = 
    { 
        name: string
        path: string
        type: string
        extension: string
    }

export type VideoFile = BaseFile & { 
    type: "video" 
    duration?: number
}


export type FilesWithMetadata = BaseFile | VideoFile

