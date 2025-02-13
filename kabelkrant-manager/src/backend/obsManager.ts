import { BrowserWindow } from 'electron';
import OBSWebSocket from 'obs-websocket-js';
import { EventKeys } from '../global/events';
import { logging } from './logging';
import { Playout } from './obsClassses/Playout';
import { VideoPlaylist } from './obsClassses/VideoPlaylist';
const obs = new OBSWebSocket();

const KABELKRANT_SCENE = "Kabelkrant"

const Playout: Playout[] = [
    {
        sceneName: "Video1",
        videoSource: "Playout1"
    },
    {
        sceneName: "Video2",
        videoSource: "Playout2"
    }
]

const VLC_MEDIA_SOURCE = "VLC"
const RADIO_INPUT = "Radio"

export let obsIsRunning = false


async function wait(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}


async function conntect() {
    await obs.connect('ws://localhost:4455', 'rtvserver');
}

export async function startObsConnector() {
    // Connect to obs-ws running on 192.168.0.4
    setInterval(async () => {
        if (!obsIsRunning) {
            try {
                await conntect()
            } catch (e) {
                logging.error(e)
                console.log("OBS not running")
            }
        }
    }, 1000)

    obs.on('ConnectionOpened', () => {
        console.log('Connection Opened');
        obsIsRunning = true
        console.log("event obs status change", obsIsRunning)
        BrowserWindow.getAllWindows().forEach(window => {
            window.webContents.send(EventKeys.OBS_STATUS_CHANGE, obsIsRunning)
        })
    });

    obs.on('ConnectionClosed', () => {
        console.log('Connection Closed');
        obsIsRunning = false
        console.log("event obs status change", obsIsRunning)
        BrowserWindow.getAllWindows().forEach(window => {
            window.webContents.send(EventKeys.OBS_STATUS_CHANGE, obsIsRunning)
        })
    });

    obs.on('MediaInputPlaybackEnded', async (data) => {
        logging.log('info', 'Media input playback ended', data)
        videoPlaylist.playNextVideo(data)
    })

    obs.on('CurrentProgramSceneChanged', async (data) => {
        logging.log('info', 'Current program scene changed', data)
        if (Playout.some(playout => playout.sceneName.toLowerCase() == data.sceneName.toLowerCase())) {
            return
        }
        videoPlaylist.removeItemsFromPlaylist()
    })
}

function log(data: string, ...context: any) {
    logging.log('info', data, ...context)
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ObsPlayer {

    export async function goToKabelkrant() {
        await obs.call('SetInputVolume', {
            inputName: RADIO_INPUT,
            inputVolumeMul: 0
        })
        logging.log('info', 'Go to kabelkrant')
        await obs.call('SetCurrentProgramScene', {
            sceneName: KABELKRANT_SCENE
        })
        await ObsPlayer.fadeVolume(RADIO_INPUT, 2000, true)
    }

    export async function clearVideoPlayer(data: { inputName: string }) {
        logging.info(`Clear video player ${data.inputName}`)
        await obs.call("SetInputSettings", {
            inputName: data.inputName,
            inputSettings: {
                local_file: ""
            }
        })
    }


    export async function fadeVolume(sourceName: string, duration: number, buildUp: boolean) {
        log(`Fade volume ${sourceName} ${buildUp ? "up" : "down"} in ${duration}ms on ${sourceName} started`)
        for (let i = 1; i < 11; i++) {

            await wait(duration / 10)
            await obs.call("SetInputVolume", {
                inputName: RADIO_INPUT,
                inputVolumeMul: buildUp ? i / 10 : 1 - i / 10
            })
        }
        log(`Fade volume ${sourceName} ${buildUp ? "up" : "down"} in ${duration}ms on ${sourceName} eneded`)
    }

    export async function prepairVideo(filePath: string, playout: Playout) {
        log(`Prepair video ${filePath} on ${playout.videoSource} in ${playout.sceneName} started`)

        await obs.call("SetStudioModeEnabled", {
            studioModeEnabled: true
        })

        await obs.call("SetInputSettings", {
            inputName: playout.videoSource,
            inputSettings: {
                local_file: filePath
            }
        })

        console.log("SetCurrentPreviewScene", playout.sceneName)
        await obs.call("SetCurrentPreviewScene", {
            sceneName: playout.sceneName
        })


        const itemId = await obs.call("GetSceneItemId", {
            sceneName: playout.sceneName,
            sourceName: playout.videoSource,
        })


        await obs.call("TriggerMediaInputAction", {
            inputName: playout.videoSource,
            mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP",
        })


        await wait(200)
        await obs.call("TriggerMediaInputAction", {
            inputName: playout.videoSource,
            mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART",
        })
        await wait(200)
        const { sceneItemTransform: transform } = await obs.call("GetSceneItemTransform", {
            sceneName: playout.sceneName,
            sceneItemId: itemId.sceneItemId
        })


        const object = {
            transform,
            itemId,
            scaleX: 1920 / (transform.sourceWidth as number),
            scaleY: 1080 / (transform.sourceHeight as number),
        }

        console.log(object)

        if (object.scaleX != Infinity && object.scaleY != Infinity) {
            console.log("scale", object.scaleX, object.scaleY)
            await obs.call("SetSceneItemTransform", {
                sceneName: playout.sceneName,
                sceneItemId: itemId.sceneItemId,
                sceneItemTransform: {
                    positionX: 0,
                    positionY: 0,
                    scaleX: object.scaleX,
                    scaleY: object.scaleY,
                }
            })
        }
        await obs.call("TriggerMediaInputAction", {
            inputName: playout.videoSource,
            mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP",
        })
        log(`Prepair video ${filePath} on ${playout.videoSource} in ${playout.sceneName} ended`)
    }

    export async function playVideo(filePath: string, playout: Playout, shouldFadeMusic = true) {
        logging.log('info', `Play video ${filePath} on ${playout.videoSource} in ${playout.videoSource} ${shouldFadeMusic ? 'with' : 'without'} fade music`)
        if (shouldFadeMusic) {
            await fadeVolume(RADIO_INPUT, 2000, false)
        }
        logging.log('info', `Play video ${filePath} on ${playout.videoSource} in ${playout.videoSource}`)
        await obs.call("SetCurrentProgramScene", {
            sceneName: playout.sceneName
        })
        await wait(2000)
        await obs.call("SetInputVolume", {
            inputName: RADIO_INPUT,
            inputVolumeMul: 0
        })
    }

    export async function checkIfVideoPlays(playout: Playout) {
        // Send issue to sentry
        const mediaInputState = await obs.call("GetMediaInputStatus", {
            inputName: playout.videoSource
        })

        const mediaInputSettings = await obs.call("GetInputSettings", {
            inputName: playout.videoSource
        })

        log("Check if video is playing", mediaInputState, mediaInputSettings, playout)
        if (mediaInputState.mediaDuration == 0 || mediaInputSettings.inputSettings.local_file == "") {
            log("Video is not playing")
            return false
        }
        log("Video is playing")
        return true
    }

}

export const videoPlaylist: VideoPlaylist = new VideoPlaylist(ObsPlayer.playVideo, ObsPlayer.clearVideoPlayer, ObsPlayer.prepairVideo, ObsPlayer.checkIfVideoPlays, ObsPlayer.goToKabelkrant, Playout)