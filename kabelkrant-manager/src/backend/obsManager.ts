import { BrowserWindow } from 'electron';
import OBSWebSocket from 'obs-websocket-js';
import { EventKeys } from '../global/events';
import { VideoPlaylist } from './obsClassses/VideoPlaylist';
import { Playout } from './obsClassses/Playout';
const obs = new OBSWebSocket();

const KABELKRANT_SCENE = "Kabelkrant"

const Playout: Playout[] = [
    {
        sceneName:"Video1",
        videoSource: "Playout1"
    },
    {
        sceneName:"Video2",
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


async function conntect(){
    await obs.connect('ws://localhost:4455', 'rtvserver');
}

export async function startObsConnector(){
    // Connect to obs-ws running on 192.168.0.4
    setInterval(async () => {
        if(!obsIsRunning){
            try{
                await conntect()
            }catch(e){
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
        videoPlaylist.playNextVideo(data)
    })

    obs.on('CurrentProgramSceneChanged', async (data) => {
        if(Playout.some(playout => playout.sceneName.toLowerCase() == data.sceneName.toLowerCase())){
            return
        }
        videoPlaylist.removeItemsFromPlaylist()
    })
}

function log(data:any){
    console.log(data)
}
export namespace ObsPlayer {

    export async function goToKabelkrant(){
        await obs.call('SetInputVolume',{
            inputName: RADIO_INPUT,
            inputVolumeMul: 0
        })
        console.log("Naar kabelkrant schakelen")
        await obs.call('SetCurrentProgramScene', {
            sceneName: KABELKRANT_SCENE
        })
        await ObsPlayer.fadeVolume(RADIO_INPUT, 2000, true)
    }

    export async function clearVideoPlayer(data: {inputName: string}){
        console.log("clear video player", data)
        await obs.call("SetInputSettings",{
            inputName: data.inputName,
            inputSettings: {
                local_file: ""
            }
        })
    }


    export async function fadeVolume(sourceName:string, duration:number, buildUp:boolean){
        for(let i =1 ; i < 11; i++){
            console.log("volume" ,1 - i/10)
            await wait(duration/ 10)
            await obs.call("SetInputVolume",{
                inputName: RADIO_INPUT,
                inputVolumeMul: buildUp ? i/10 :1 - i/10
            })
        }
    }
    
    export async function prepairVideo(filePath:string, playout: Playout){
        await obs.call("SetStudioModeEnabled",{
            studioModeEnabled: true
        })

        log("input settings")
        await obs.call("SetInputSettings",{
            inputName: playout.videoSource,
            inputSettings: {
                local_file: filePath
            }
        })
    
        log("preview scene" )
        console.log("SetCurrentPreviewScene", playout.sceneName)
        await obs.call("SetCurrentPreviewScene",{
            sceneName: playout.sceneName
        })
    
    
        log("get item id")
        const itemId= await obs.call("GetSceneItemId",{
            sceneName: playout.sceneName,
            sourceName: playout.videoSource,
        })
    
    
        log("stop video")
        await obs.call("TriggerMediaInputAction", {
            inputName: playout.videoSource,
            mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP",
        })
    
    
        log("start video")
        await wait(200)
        await obs.call("TriggerMediaInputAction", {
            inputName: playout.videoSource,
            mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART",
        })
        await wait(200)
        log("get transform")
        const {sceneItemTransform:transform} = await obs.call("GetSceneItemTransform",{
            sceneName: playout.sceneName,
            sceneItemId: itemId.sceneItemId
        })
    
        
        const object = {
            transform,
            itemId,
            scaleX:  1920 / (transform.sourceWidth as number) ,
            scaleY: 1080/ (transform.sourceHeight as number) ,
        }
    
        console.log(object)
    
    
        if(object.scaleX != Infinity && object.scaleY != Infinity){
            console.log("scale", object.scaleX, object.scaleY)
            await obs.call("SetSceneItemTransform",{
                sceneName: playout.sceneName,
                sceneItemId: itemId.sceneItemId,
                sceneItemTransform: {
                    positionX: 0,
                    positionY: 0,
                    scaleX:  object.scaleX,
                    scaleY: object.scaleY,
                }
            })
        }
        await obs.call("TriggerMediaInputAction", {
            inputName: playout.videoSource,
            mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP",
        })
    }
    
    export async function playVideo(filePath:string, playout:Playout, shouldFadeMusic:boolean = true){

        if(shouldFadeMusic){
            await fadeVolume(RADIO_INPUT, 2000, false)
        }
        console.log(`play ${filePath} on ${playout.videoSource} in ${playout.videoSource}`)
        await obs.call("SetCurrentProgramScene",{
            sceneName: playout.sceneName
        })
        await wait(2000)
        await obs.call("SetInputVolume",{
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

        log("Check if video is playing \n" + JSON.stringify(mediaInputState,undefined,2) + "\n" + JSON.stringify(mediaInputSettings,undefined,2) + "\n" + JSON.stringify(playout,undefined,2))
        if(mediaInputState.mediaDuration == 0 || mediaInputSettings.inputSettings.local_file == ""){
            log("Video is not playing")	
            return false
        }
        log("Video is playing")
        return true
    }
    
}

export let videoPlaylist: VideoPlaylist = new VideoPlaylist(ObsPlayer.playVideo,ObsPlayer.clearVideoPlayer, ObsPlayer.prepairVideo, ObsPlayer.checkIfVideoPlays, ObsPlayer.goToKabelkrant, Playout)