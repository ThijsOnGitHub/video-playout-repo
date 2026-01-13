import { EventEmitter } from "events";
import type { Playout } from "@/lib/types/playout";
import type { ObsManager } from "./obsManager";

export class VideoPlaylist extends EventEmitter {
  public videos: string[] = [];
  public currentPlayoutIndex = 0;
  public inSwitch = false;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private obsManager: ObsManager) {
    super();

    // Check if video is playing every second
    this.checkInterval = setInterval(async () => {
      if (this.videos.length > 0 && !this.inSwitch) {
        try {
          const isPlaying = await this.obsManager.checkIfVideoPlays(this.getCurrentPlayout());
          if (!isPlaying) {
            console.error("Video is not playing, triggering next video", {
              playout: this.getCurrentPlayout(),
              videos: this.videos,
              currentPlayoutIndex: this.currentPlayoutIndex,
            });
            this.playNextVideo({
              inputName: this.getCurrentPlayout().videoSource,
            });
          }
        } catch (e) {
          console.error("Error checking if video plays", e);
        }
      }
    }, 1000);
  }

  getCurrentPlayout(): Playout {
    return this.obsManager.playouts[this.currentPlayoutIndex];
  }

  getNextPlayoutIndex(): number {
    return (this.currentPlayoutIndex + 1) % this.obsManager.playouts.length;
  }

  getNextPlayout(): Playout {
    return this.obsManager.playouts[this.getNextPlayoutIndex()];
  }

  setNextPlayout(): void {
    this.currentPlayoutIndex = this.getNextPlayoutIndex();
  }

  async addVideos(videoPath: string[]): Promise<void> {
    this.inSwitch = true;
    try {
      const oldLength = this.videos.length;
      this.videos.push(...videoPath);
      if (oldLength === 0) {
        await this.obsManager.prepareVideo(videoPath[0], this.getCurrentPlayout());
        await this.obsManager.playVideo(videoPath[0], this.getCurrentPlayout(), true);
      }
      console.log("Playing videos", this.videos);
      if (this.videos.length > 1 && oldLength < 2) {
        await this.obsManager.prepareVideo(this.videos[1], this.getNextPlayout());
      }
      this.emit("change", this.videos);
    } catch (e) {
      console.error("Error adding videos", e);
    }
    this.inSwitch = false;
  }

  async playNextVideo(data: { inputName: string }): Promise<void> {
    this.inSwitch = true;
    try {
      // Check if it is not a video that stopped in the preview
      if (data.inputName !== this.getCurrentPlayout().videoSource) {
        this.inSwitch = false;
        return;
      }
      this.videos.shift();
      console.log("Playing videos - video's after shift", this.videos);
      if (this.videos.length === 0) {
        await this.obsManager.clearVideoPlayer(data);
        await this.obsManager.goToKabelkrant();
        this.emit("change", this.videos);
        this.inSwitch = false;
        return;
      }
      this.setNextPlayout();
      console.log("Playing videos", this.videos);
      await this.obsManager.playVideo(this.videos[0], this.getCurrentPlayout(), false);
      await this.obsManager.clearVideoPlayer({
        inputName: this.getNextPlayout().videoSource,
      });
      if (this.videos.length > 1) {
        await this.obsManager.prepareVideo(this.videos[1], this.getNextPlayout());
      }
      this.emit("change", this.videos);
    } catch (e) {
      console.error("Error playing next video", e);
    }
    this.inSwitch = false;
  }

  removeItemsFromPlaylist(): void {
    console.log("Remove items from playlist");
    this.videos = [];
    this.obsManager.clearVideoPlayer({
      inputName: this.getCurrentPlayout().videoSource,
    });
    this.obsManager.clearVideoPlayer({
      inputName: this.getNextPlayout().videoSource,
    });
    this.emit("change", this.videos);
  }

  cleanup(): void {
    console.log("Cleaning up VideoPlaylist");
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.removeAllListeners();
  }
}
