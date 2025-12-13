import { getDay, isAfter, isBefore, subSeconds } from "date-fns";
import fs from "fs";
import path from "path";
import * as NodeCron from "node-cron";
import type { VideoItem } from "@/lib/types/VideoItem";
import { sortFilesWithNumbers } from "@/lib/sortFunction";
import type { FileStorage } from "./fileStorage";
import type { VideoPlaylist } from "./videoPlaylist";

export class PlayoutEngine {
  private cronJob: NodeCron.ScheduledTask | null = null;

  constructor(
    private storage: FileStorage,
    private videoPlaylist: VideoPlaylist
  ) {}

  startCron() {
    this.cronJob = NodeCron.schedule("* * * * * *", () => {
      try {
        this.checkIfVideoMustPlay();
      } catch (e) {
        console.error("Error in cron job", e);
      }
    });
    console.log("Playout cron started");
  }

  stopCron() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
  }

  private checkIfVideoMustPlay() {
    const videos = this.storage.getPrograms();
    const now = new Date();
    const start = subSeconds(now, 1);
    const currentDay = getDay(now);

    videos.some((video) => {
      if (this.shouldVideoPlay(video, currentDay, now, start)) {
        this.playVideoItem(video);
        return true;
      }
      return false;
    });
  }

  private isTimeInTimeRange(time: string, now: Date, start: Date): boolean {
    const [hours, minutes, seconds] = time.split(":").map(Number);
    const timeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds);
    return isBefore(timeDate, now) && isAfter(timeDate, start);
  }

  private shouldVideoPlay(video: VideoItem, currentDay: number, currentDate: Date, prevCheckDate: Date): boolean {
    return video.planning.some((planning) => {
      const sameDay = planning.days.some((day) => day === currentDay);
      const sameTime = planning.times.some((time) => this.isTimeInTimeRange(time, currentDate, prevCheckDate));
      return sameDay && sameTime;
    });
  }

  private getSingleVideoPath(fileNames: string[], fullPath: string): string {
    const playedFiles = this.storage.getHasPlayed();
    const mappedFiles = fileNames.map((fileName) => {
      const filePath = path.join(fullPath, fileName);
      const lastPlayed = playedFiles[filePath];
      return {
        fileName,
        filePath,
        date: lastPlayed === undefined ? undefined : new Date(lastPlayed),
      };
    });
    const sortedFiles = mappedFiles.sort((a, b) => (a.date === undefined ? -1 : b.date === undefined ? 1 : a.date.getTime() - b.date.getTime()));
    const selectedFile = sortedFiles[0];
    this.storage.writePlay(selectedFile.filePath);
    return selectedFile.filePath;
  }

  playVideoItem(videoItem: VideoItem) {
    console.log("Video item prepare to play", videoItem, process.env.VIDEO_BASE_PATH ?? "undefined");

    const videoBasePath = process.env.VIDEO_BASE_PATH || "./videos";
    const fullPath = path.join(videoBasePath, videoItem.path);

    console.log("Video path exists, reading files", fullPath);

    if (!fs.existsSync(fullPath)) {
      console.error("Video path does not exist", fullPath);
      return;
    }

    const fileNames = fs.readdirSync(fullPath).sort(sortFilesWithNumbers);

    if (fileNames.length === 0) return;

    let videos: string[];
    if (!videoItem.playAll) {
      videos = [this.getSingleVideoPath(fileNames, fullPath)];
    } else {
      videos = fileNames.map((file) => path.join(fullPath, file));
    }

    console.log("The following video's will be added to the playlist", videos);
    this.videoPlaylist.addVideos(videos);
  }

  getPlaylist(): string[] {
    return this.videoPlaylist.videos;
  }

  cleanup(): void {
    console.log("Cleaning up PlayoutEngine");
    this.stopCron();
  }
}
