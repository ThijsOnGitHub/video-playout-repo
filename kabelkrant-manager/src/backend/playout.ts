import { getDay, isAfter, isBefore, subSeconds } from 'date-fns';
import fs from 'fs';
import * as NodeCron from 'node-cron';
import path from 'path';
import { sortFilesWithNumbers } from '../global/sortFunction.js';
import { VideoItem, VideoItems } from '../global/types/VideoItem.js';
import { videoPlaylist } from './obsManager.js';


const jsonFolder = path.join(__dirname, '../json');
//const programPath = path.join(jsonFolder, '/program.json');
//const hasPlayedPath = path.join(jsonFolder, '/hasPlayed.json');
//const VIDEOS_FILE_PATH = path.join(__dirname, '../video');

export function startCron(programFilePath: string, hasPlayedPath: string) {
    NodeCron.schedule('* * * * * *', () => {
        // log the current time
        console.log("Running a task every 5 minutes", new Date().toLocaleTimeString());
        try {
            checkIfVideoMustPlay(programFilePath, hasPlayedPath)
        } catch (e) {
            console.log("error", e)
        }
    })

}

export function getVideos(programFilePath: string) {
    // read json file
    const json = fs.readFileSync(programFilePath)
    const program: VideoItems = JSON.parse(json.toString())

    return program
}


function getSingleVideoPath(files: string[], hasPlayedPath: string, videoItem: VideoItem): string {
    console.log("playvide", videoItem)
    const playedFiles = getPlayedVideos(hasPlayedPath)
    const mappedFiles = files.map(file => {
        const filePath = file
        const lastPlayed = playedFiles[filePath]
        return { path: file, date: lastPlayed == undefined ? undefined : new Date(lastPlayed) }
    })
    const sortedFiles = mappedFiles.sort((a, b) => a.date == undefined ? -1 : b.date == undefined ? 1 : a.date.getTime() - b.date.getTime())
    const filePath = path.join(videoItem.path, sortedFiles[0].path)
    writePlay(hasPlayedPath, filePath)
    return filePath
}

function getPlayedVideos(hasPlayedPath: string): { [key: string]: Date } {
    if (!fs.existsSync(hasPlayedPath)) {
        fs.writeFileSync(hasPlayedPath, "{}")
    }
    return JSON.parse(fs.readFileSync(hasPlayedPath, 'utf8'))
}

function writePlay(hasPlayedPath: string, path: string) {
    if (!fs.existsSync(hasPlayedPath)) {
        fs.writeFileSync(hasPlayedPath, "{}")
    }
    let jsonData: { [key: string]: Date } = JSON.parse(fs.readFileSync(hasPlayedPath, 'utf8'))
    jsonData = { ...jsonData, [path]: new Date() }
    console.log("write play", JSON.stringify(jsonData))
    fs.writeFileSync(hasPlayedPath, JSON.stringify(jsonData), { encoding: 'utf8', flag: 'w' })
}

function isTimeInTimeRange(time: string, now: Date, start: Date) {
    const timeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(time.split(":")[0]), parseInt(time.split(":")[1]), parseInt(time.split(":")[2]))
    return isBefore(timeDate, now) && isAfter(timeDate, start)
}

function shouldVideoPlay(video: VideoItem, currentDay: number, currentDate: Date, prevCheckDate: Date) {
    return video.planning.some(planning => {
        const sameDay = planning.days.some(day => day == currentDay)
        const sameTime = planning.times.some(time => isTimeInTimeRange(time, currentDate, prevCheckDate))
        return sameDay && sameTime
    })
}

export function playVideoItem(hasPlayedPath: string, videoItem: VideoItem) {
    console.log("play video", videoItem)
    let videos = fs.readdirSync(videoItem.path)
        .sort(sortFilesWithNumbers)
        .map(file => path.join(videoItem.path, file))
    if (videos.length == 0) return
    if (!videoItem.playAll) {
        videos = [getSingleVideoPath(videos, hasPlayedPath, videoItem)]
    }
    console.log("play videos", videos)
    videoPlaylist.addVideos(videos)
}

export function checkIfVideoMustPlay(programFilePath: string, hasPlayedPath: string) {
    const videos = getVideos(programFilePath)
    const now = new Date()
    const start = subSeconds(now, 1)
    const currentDay = getDay(now)
    videos.some(video => {
        if (shouldVideoPlay(video, currentDay, now, start)) {
            playVideoItem(hasPlayedPath, video)
            return true
        }
    })
    // remove time from now
}