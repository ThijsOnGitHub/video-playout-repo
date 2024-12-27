import fs from "fs"
import { FilesWithMetadata } from "src/global/types/FileMetaTypes"
import { getVideoDurationInSeconds } from "get-video-duration"



export async function getFilesInFolder(path: string): Promise<FilesWithMetadata[]> {
    const files = fs.readdirSync(path)
    // return the filenames with their types
    return Promise.all(
        files.map(async(file) => {
            // get the file type e.g. .js, .ts, .jsx, .tsx
            const fileType = file.split(".").pop()
            // check if file is video 
            console.log(fileType)
            if (fileType === "mp4" || fileType === "mov" || fileType === "avi" || fileType === "mkv") {
                console.log("file is video")
                console.log(`${path}/${file}`)
                const readableStream = fs.createReadStream(`${path}\\${file}`)
                const duration = await getVideoDurationInSeconds(readableStream)
                readableStream.close()
                console.log(duration)
                return {
                    path : `${path}/${file}`,
                    name: file,
                    type: "video",
                    extension: fileType,
                    duration: duration
                }
            }
            return {
                path : `${path}/${file}`,
                name: file,
                type: fileType,
                extension: fileType
            }
        })
    ) 

}