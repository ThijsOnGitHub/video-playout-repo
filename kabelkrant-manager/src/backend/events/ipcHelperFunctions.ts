import { ipcMain } from "electron";
import { Functions } from "src/global/events";

export function handleFunction<EventName extends keyof Functions>(event: EventName, callback: Functions[EventName]) {
    ipcMain.handle(event,async (_, ...args: Parameters<Functions[EventName]>) => {
      //@ts-ignore
      return await callback(...args);
    });
  }

export function triggerEvent<EventName extends keyof Functions>(event: EventName, ...args: Parameters<Functions[EventName]>) {
    ipcMain.emit(event, ...args)
}