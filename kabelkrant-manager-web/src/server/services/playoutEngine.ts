import { getDay, isAfter, isBefore, subSeconds, parseISO } from "date-fns";
import fs from "fs";
import path from "path";
import * as NodeCron from "node-cron";
import type { VideoItem } from "@/lib/types/VideoItem";
import { sortFilesWithNumbers } from "@/lib/sortFunction";
import type { FileStorage } from "./fileStorage";
import type { VideoPlaylist } from "./videoPlaylist";
import type { BrowserPlayout } from "./browserPlayout";
import type { ScheduledDate } from "@/lib/schemas/program";

const VIDEO_EXTENSIONS = [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm"];

export interface PlayoutTarget {
  addVideos(videos: string[]): Promise<void>;
}

export class PlayoutEngine {
  private cronJob: NodeCron.ScheduledTask | null = null;
  private browserPlayout: BrowserPlayout | null = null;

  constructor(
    private storage: FileStorage,
    private videoPlaylist: VideoPlaylist
  ) {}

  setBrowserPlayout(browserPlayout: BrowserPlayout): void {
    this.browserPlayout = browserPlayout;
    console.log("[PlayoutEngine] BrowserPlayout set");
  }

  private getActivePlayoutTarget(): PlayoutTarget {
    const settings = this.storage.getPlayoutSettings();
    console.log("[PlayoutEngine] getActivePlayoutTarget - mode:", settings.playoutMode, "hasBrowserPlayout:", !!this.browserPlayout);
    if (settings.playoutMode === "browser" && this.browserPlayout) {
      console.log("[PlayoutEngine] Using BrowserPlayout, connected clients:", this.browserPlayout.getClientCount());
      return this.browserPlayout;
    }
    console.log("[PlayoutEngine] Using VideoPlaylist (OBS)");
    return this.videoPlaylist;
  }

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
    console.log("[PlayoutEngine] Checking if video must play");
    const videos = this.storage.getPrograms();
    const now = new Date();
    const start = subSeconds(now, 1);
    const currentDay = getDay(now);

    //console.log("[PlayoutEngine] Current day:", currentDay, "Now:", now.toISOString(), "!!!!Start check from:", start.toISOString());
    videos.some((video) => {
      if (this.shouldVideoPlay(video, currentDay, now, start)) {
        console.log("[PlayoutEngine] Video should play now:", video);
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
    // Check scheduled dates (specific date + time)
    if (video.scheduledDates && video.scheduledDates.length > 0) {
      //console.log("[PlayoutEngine] Checking scheduled dates for video", video.scheduledDates);
      const scheduledMatch = this.shouldScheduledDatePlay(video.scheduledDates, currentDate, prevCheckDate);
      if (scheduledMatch) {
        return true;
      }
    }

    // Check regular planning (day of week + times)
    return video.planning.some((planning) => {
      const sameDay = planning.days.some((day) => day === currentDay);
      const sameTime = planning.times.some((time) => this.isTimeInTimeRange(time, currentDate, prevCheckDate));
      return sameDay && sameTime;
    });
  }

  private shouldScheduledDatePlay(scheduledDates: ScheduledDate[], currentDate: Date, prevCheckDate: Date): boolean {
    return scheduledDates.some((scheduled) => {
      // Parse the ISO dateTime string
      const scheduledDateTime = parseISO(scheduled.dateTime);

      // Check if the scheduled time falls within the check window (between prevCheckDate and currentDate)
      return isBefore(scheduledDateTime, currentDate) && isAfter(scheduledDateTime, prevCheckDate);
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

  private isVideoFile(fileName: string): boolean {
    const extension = path.extname(fileName).toLowerCase();
    return VIDEO_EXTENSIONS.includes(extension);
  }

  playVideoItem(videoItem: VideoItem) {
    // Check if this is an iframe program
    if (videoItem.programType === "iframe") {
      this.playIframeItem(videoItem);
      return;
    }

    // Check if this is a raadsvergadering program
    if (videoItem.programType === "raadsvergadering") {
      this.playRaadsvergaderingItem(videoItem);
      return;
    }

    console.log("Video item prepare to play", videoItem, process.env.VIDEO_BASE_PATH ?? "undefined");

    const videoBasePath = process.env.VIDEO_BASE_PATH || "./videos";
    const fullPath = path.join(videoBasePath, videoItem.path);

    console.log("Video path exists, reading files", fullPath);

    if (!fs.existsSync(fullPath)) {
      console.error("Video path does not exist", fullPath);
      return;
    }

    const fileNames = fs
      .readdirSync(fullPath)
      .filter((file) => this.isVideoFile(file))
      .sort(sortFilesWithNumbers);

    if (fileNames.length === 0) {
      console.error("No video files found in folder", fullPath);
      return;
    }

    let videos: string[];
    if (!videoItem.playAll) {
      videos = [this.getSingleVideoPath(fileNames, fullPath)];
    } else {
      videos = fileNames.map((file) => path.join(fullPath, file));
    }

    console.log("The following video's will be added to the playlist", videos);
    const target = this.getActivePlayoutTarget();
    target.addVideos(videos);
  }

  private playIframeItem(videoItem: VideoItem) {
    if (!videoItem.iframeUrl) {
      console.error("Iframe program has no URL", videoItem);
      return;
    }

    // Use null for infinite duration, only default to 60 if undefined
    const durationSeconds = videoItem.iframeDurationSeconds === undefined ? 60 : videoItem.iframeDurationSeconds;
    const muted = videoItem.iframeMuted !== false; // Default to true
    console.log(`[PlayoutEngine] Adding iframe to playlist: ${videoItem.iframeUrl} for ${durationSeconds === null ? "infinite" : durationSeconds + " seconds"}, muted: ${muted}`);

    if (this.browserPlayout) {
      this.browserPlayout.addIframe(videoItem.iframeUrl, durationSeconds, muted);
    }
  }

  private playRaadsvergaderingItem(videoItem: VideoItem) {
    if (!videoItem.webcastId) {
      console.error("Raadsvergadering program has no webcastId", videoItem);
      return;
    }

    console.log(`[PlayoutEngine] Adding raadsvergadering to playlist: ${videoItem.webcastId}`);

    if (this.browserPlayout) {
      this.browserPlayout.addRaadsvergadering(videoItem.webcastId);
    }
  }

  getPlaylist(): string[] {
    // Return OBS playlist for backwards compatibility
    return this.videoPlaylist.videos;
  }

  cleanup(): void {
    console.log("Cleaning up PlayoutEngine");
    this.stopCron();
  }
}
