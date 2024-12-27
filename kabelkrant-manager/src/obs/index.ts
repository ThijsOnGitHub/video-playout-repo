import { startObsConnector } from "./obsManager"
import { startCron } from "./playout"

export function startPlayoutServer(programFilePath: string, hasPlayedPath:string) {
    console.log("startPlayoutServer")
    startObsConnector()
    startCron(programFilePath,hasPlayedPath)
}