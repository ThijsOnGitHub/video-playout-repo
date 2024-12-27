import * as Sentry from '@sentry/electron';
import { getDay, isAfter, isBefore, subSeconds } from 'date-fns';
import fs from 'fs';
import * as NodeCron from 'node-cron';
import path from 'path';
import { sortFilesWithNumbers } from '../global/sortFunction';
import { VideoItem, VideoItems } from '../global/types/VideoItem';
import { logging } from './logging';
import { videoPlaylist } from './obsManager';

export function startCron(programFilePath: string, hasPlayedPath: string) {
    NodeCron.schedule('* * * * * *', () => {
        try {
            checkIfVideoMustPlay(programFilePath, hasPlayedPath)
        } catch (e) {
            logging.log({
                level: 'error',
                message: `Error in cron job: ${e.message}`,
                stack: e.stack
            })
            Sentry.captureException(e)
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
    logging.log('info', `Video item prepair to play`, videoItem)
    let videos = fs.readdirSync(videoItem.path)
        .sort(sortFilesWithNumbers)
        .map(file => path.join(videoItem.path, file))

    if (videos.length == 0) return
    if (!videoItem.playAll) {
        videos = [getSingleVideoPath(videos, hasPlayedPath, videoItem)]
    }
    logging.log('info', `The following video's will be added to the playlist`, videos)
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