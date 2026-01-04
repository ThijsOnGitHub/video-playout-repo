export interface PlayoutSettings {
  /** URL of the kabelkrant website to display when no video is playing */
  kabelkrantUrl: string;
  /** Output resolution */
  resolution: {
    width: number;
    height: number;
  };
  /** Playout mode: 'obs' for OBS integration, 'browser' for browser-based playout */
  playoutMode: "obs" | "browser";
  /** Fade transition duration in milliseconds (for video visibility) */
  fadeTransitionDuration: number;
  /** Audio crossfade duration in milliseconds */
  audioCrossfadeDuration: number;
  /** Audio source: 'microphone' for mic input, 'stream' for web stream URL, 'none' for no audio */
  audioSource: "microphone" | "stream" | "none";
  /** URL of the audio stream (when audioSource is 'stream') */
  audioStreamUrl: string;
}

export const DEFAULT_PLAYOUT_SETTINGS: PlayoutSettings = {
  kabelkrantUrl: "",
  resolution: {
    width: 1920,
    height: 1080,
  },
  playoutMode: "browser",
  fadeTransitionDuration: 500,
  audioCrossfadeDuration: 1500,
  audioSource: "none",
  audioStreamUrl: "",
};
