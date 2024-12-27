import Express from "express";
import { getVideos } from "../backend/playout";
export function startServer(programFilePath: string) {
    const app = Express()
    const port = 3002

    app.get('/', (req, res) => {
        res.send('Hello World!')
    })

    app.get("/videos", (req, res) => {
        const videos = getVideos(programFilePath)
        console.log("videos", videos)
        res.json(videos)
    })

    app.listen(port, () => {
        console.log("Server is running on port " + port)
    })
}
