// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { IpcRendererEvent, contextBridge, ipcRenderer } from "electron";
import { EventKeys, Events, FunctionKeys, Functions } from "./global/events";

const invoke = <EventName extends keyof Functions>(event: EventName) => 
    (...args: Parameters<Functions[EventName]>): Promise<Awaited<ReturnType<Functions[EventName]>>>  => ipcRenderer.invoke(event, ...args)

const listenForEvent = <EventName extends keyof Events>(event: EventName) => (callback: ( ...args: Events[EventName]) => void) =>{
    const callbackEvent = (_:IpcRendererEvent, ...args: Events[EventName]) => {
        callback(...args)
    }
    ipcRenderer.on(event, callbackEvent)
    return () => ipcRenderer.removeListener(event, callbackEvent)
}

const api = {
    secretMessage: "Hello, not so secret message! 😀",
    selectFolder: invoke(FunctionKeys.SELECT_FOLDER),
    savePrograms: invoke(FunctionKeys.SAVE_PROGRAMS),
    getPrograms: invoke(FunctionKeys.GET_PROGRAMS),
    getFilesInFolder: invoke(FunctionKeys.GET_VIDEOS),
    getObsIsRunning: invoke(FunctionKeys.CHECK_OBS_IS_RUNNING),
    onObsStatusChange: listenForEvent<keyof Events>(EventKeys.OBS_STATUS_CHANGE),
    getPlaylist: invoke(FunctionKeys.GET_PLAYLIST),
    playVideoItem: invoke(FunctionKeys.PLAY_VIDEO_ITEM)
}


export type ElectronApi = typeof api

contextBridge.exposeInMainWorld("electronApi", api)