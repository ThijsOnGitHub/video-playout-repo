import OBSWebSocket from "obs-websocket-js";
import { EventEmitter } from "events";
import type { Playout } from "@/lib/types/Playout";

const KABELKRANT_SCENE = "Kabelkrant";
const RADIO_INPUT = "Radio";

const PLAYOUTS: Playout[] = [
  {
    sceneName: "Video1",
    videoSource: "Playout1",
  },
  {
    sceneName: "Video2",
    videoSource: "Playout2",
  },
];

async function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class ObsManager extends EventEmitter {
  private obs = new OBSWebSocket();
  private _isConnected = false;
  private reconnectInterval: ReturnType<typeof setInterval> | null = null;

  get isConnected() {
    return this._isConnected;
  }

  get playouts() {
    return PLAYOUTS;
  }

  async startConnectionLoop() {
    const websocketUrl = process.env.OBS_WEBSOCKET_URL || "ws://localhost:4455";
    const websocketPassword = process.env.OBS_WEBSOCKET_PASSWORD || "rtvserver";

    // Reconnect every second if disconnected
    this.reconnectInterval = setInterval(async () => {
      if (!this._isConnected) {
        try {
          await this.obs.connect(websocketUrl, websocketPassword);
        } catch (e) {
          console.log("OBS not running, retrying...");
        }
      }
    }, 1000);

    this.obs.on("ConnectionOpened", () => {
      console.log("OBS Connection Opened");
      this._isConnected = true;
      this.emit("statusChange", true);
    });

    this.obs.on("ConnectionClosed", () => {
      console.log("OBS Connection Closed");
      this._isConnected = false;
      this.emit("statusChange", false);
    });

    this.obs.on("MediaInputPlaybackEnded", (data) => {
      console.log("Media input playback ended", data);
      this.emit("mediaEnded", data);
    });

    this.obs.on("CurrentProgramSceneChanged", (data) => {
      console.log("Current program scene changed", data);
      this.emit("sceneChanged", data);
    });
  }

  async goToKabelkrant() {
    await this.obs.call("SetInputVolume", {
      inputName: RADIO_INPUT,
      inputVolumeMul: 0,
    });
    console.log("Go to kabelkrant");
    await this.obs.call("SetCurrentProgramScene", {
      sceneName: KABELKRANT_SCENE,
    });
    await this.fadeVolume(RADIO_INPUT, 2000, true);
  }

  async clearVideoPlayer(data: { inputName: string }) {
    console.log(`Clear video player ${data.inputName}`);
    await this.obs.call("SetInputSettings", {
      inputName: data.inputName,
      inputSettings: {
        local_file: "",
      },
    });
  }

  async fadeVolume(sourceName: string, duration: number, buildUp: boolean) {
    console.log(`Fade volume ${sourceName} ${buildUp ? "up" : "down"} in ${duration}ms started`);
    for (let i = 1; i < 11; i++) {
      await wait(duration / 10);
      await this.obs.call("SetInputVolume", {
        inputName: RADIO_INPUT,
        inputVolumeMul: buildUp ? i / 10 : 1 - i / 10,
      });
    }
    console.log(`Fade volume ${sourceName} ${buildUp ? "up" : "down"} in ${duration}ms ended`);
  }

  async prepareVideo(filePath: string, playout: Playout) {
    console.log(`Prepare video ${filePath} on ${playout.videoSource} in ${playout.sceneName} started`);

    await this.obs.call("SetStudioModeEnabled", {
      studioModeEnabled: true,
    });

    await this.obs.call("SetInputSettings", {
      inputName: playout.videoSource,
      inputSettings: {
        local_file: filePath,
      },
    });

    console.log("SetCurrentPreviewScene", playout.sceneName);
    await this.obs.call("SetCurrentPreviewScene", {
      sceneName: playout.sceneName,
    });

    const itemId = await this.obs.call("GetSceneItemId", {
      sceneName: playout.sceneName,
      sourceName: playout.videoSource,
    });

    await this.obs.call("TriggerMediaInputAction", {
      inputName: playout.videoSource,
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP",
    });

    await wait(200);
    await this.obs.call("TriggerMediaInputAction", {
      inputName: playout.videoSource,
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART",
    });
    await wait(200);
    const { sceneItemTransform: transform } = await this.obs.call("GetSceneItemTransform", {
      sceneName: playout.sceneName,
      sceneItemId: itemId.sceneItemId,
    });

    const scaleX = 1920 / (transform.sourceWidth as number);
    const scaleY = 1080 / (transform.sourceHeight as number);

    if (scaleX !== Infinity && scaleY !== Infinity) {
      console.log("scale", scaleX, scaleY);
      await this.obs.call("SetSceneItemTransform", {
        sceneName: playout.sceneName,
        sceneItemId: itemId.sceneItemId,
        sceneItemTransform: {
          positionX: 0,
          positionY: 0,
          scaleX: scaleX,
          scaleY: scaleY,
        },
      });
    }
    await this.obs.call("TriggerMediaInputAction", {
      inputName: playout.videoSource,
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP",
    });
    console.log(`Prepare video ${filePath} on ${playout.videoSource} in ${playout.sceneName} ended`);
  }

  async playVideo(filePath: string, playout: Playout, shouldFadeMusic = true) {
    console.log(`Play video ${filePath} on ${playout.videoSource} ${shouldFadeMusic ? "with" : "without"} fade music`);
    if (shouldFadeMusic) {
      await this.fadeVolume(RADIO_INPUT, 2000, false);
    }
    console.log(`Play video ${filePath} on ${playout.videoSource}`);
    await this.obs.call("SetCurrentProgramScene", {
      sceneName: playout.sceneName,
    });
    await wait(2000);
    await this.obs.call("SetInputVolume", {
      inputName: RADIO_INPUT,
      inputVolumeMul: 0,
    });
  }

  async checkIfVideoPlays(playout: Playout): Promise<boolean> {
    try {
      const mediaInputState = await this.obs.call("GetMediaInputStatus", {
        inputName: playout.videoSource,
      });

      const mediaInputSettings = await this.obs.call("GetInputSettings", {
        inputName: playout.videoSource,
      });

      console.log("Check if video is playing", mediaInputState, mediaInputSettings, playout);
      if (mediaInputState.mediaDuration === 0 || mediaInputSettings.inputSettings.local_file === "") {
        console.log("Video is not playing");
        return false;
      }
      console.log("Video is playing");
      return true;
    } catch (e) {
      console.error("Error checking if video plays", e);
      return false;
    }
  }

  cleanup(): void {
    console.log("Cleaning up ObsManager");
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    this.obs.removeAllListeners();
    this.removeAllListeners();
  }
}
