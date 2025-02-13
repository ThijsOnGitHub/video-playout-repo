import * as Sentry from "@sentry/electron/main";
import { logging } from "../logging";
import { Playout } from './Playout';

export class VideoPlaylist {
    public videos: string[] = [];
    public currentPlayoutIndex = 0;
    public inSwitch = false;

    constructor(
        public playFirstVideo: (videoPath: string, playout: Playout, shouldFade: boolean) => Promise<void>,
        public clearVideoPlayer: (data: { inputName: string }) => Promise<void>,
        public prepairVideo: (videoPath: string, playout: Playout) => Promise<void>,
        public checkIfVideoPlays: (playout: Playout) => Promise<boolean>,
        public playListEmpty: () => Promise<void>,
        public playouts: Playout[]
    ) {
        setInterval(async () => {
            // Check if video is playing when the playlist is not empty 
            console.log("Check if video is playing")
            if (this.videos.length > 0 && !this.inSwitch) {
                const isPlaying = await checkIfVideoPlays(this.getCurrentPlayout())
                if (!isPlaying) {
                    Sentry.captureException('Video is not playing', {
                        extra: {
                            playout: this.getCurrentPlayout(),
                            videos: this.videos,
                            currentPlayoutIndex: this.currentPlayoutIndex,
                            playouts: this.playouts
                        }
                    })
                    this.playNextVideo({ inputName: this.getCurrentPlayout().videoSource })
                }
            }
        }, 1000 /* * 60 * 5*/);
    }

    getCurrentPlayout() {
        return this.playouts[this.currentPlayoutIndex];
    }

    getNextPlayoutIndex() {
        return (this.currentPlayoutIndex + 1) % this.playouts.length
    }

    getNextPlayout() {
        return this.playouts[this.getNextPlayoutIndex()];
    }

    setNextPlayout() {
        this.currentPlayoutIndex = this.getNextPlayoutIndex();
    }

    async addVideos(videoPath: string[]) {
        this.inSwitch = true;
        try {
            const oldLength = this.videos.length;
            this.videos.push(...videoPath);
            if (oldLength == 0) {
                await this.prepairVideo(videoPath[0], this.getCurrentPlayout())
                await this.playFirstVideo(videoPath[0], this.getCurrentPlayout(), true);
            }
            console.log("Playing videos", this.videos)
            if (this.videos.length > 1 && oldLength < 2) {
                await this.prepairVideo(this.videos[1], this.getNextPlayout())
            }
        } catch (e) {
            console.error(e)
            Sentry.captureException(e)
        }
        this.inSwitch = false;
    }

    async playNextVideo(data: { inputName: string }) {
        // Check if it is not an video that stoped in the preview
        this.inSwitch = true;
        try {
            if (data.inputName != this.getCurrentPlayout().videoSource) return;
            this.videos.shift();
            logging.log('info', "Playing videos - video's after shift ", this.videos)
            if (this.videos.length == 0) {
                await this.clearVideoPlayer(data);
                this.playListEmpty();
                return;
            }
            this.setNextPlayout();
            console.log("Playing videos", this.videos)
            await this.playFirstVideo(this.videos[0], this.getCurrentPlayout(), false);
            await this.clearVideoPlayer({ inputName: this.getNextPlayout().videoSource });
            if (this.videos.length > 1) {
                await this.prepairVideo(this.videos[1], this.getNextPlayout())
            }
        } catch (e) {
            console.error(e)
            Sentry.captureException(e)
        }
        this.inSwitch = false
    }

    removeItemsFromPlaylist() {
        logging.log('info', "Remove items from playlist")
        this.videos = [];
        this.clearVideoPlayer({ inputName: this.getCurrentPlayout().videoSource })
        this.clearVideoPlayer({ inputName: this.getNextPlayout().videoSource })
    }
}
