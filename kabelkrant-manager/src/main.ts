import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron';
import path from 'path';
import { startPlayoutServer } from './obs';
import { handleEvents } from './obs/events/functionHandler';
import { updateElectronApp } from 'update-electron-app';
import logo from './images/logo.png'
import fs from 'fs';
import * as Sentry from "@sentry/electron/main";
import { startServer } from './server/server';
updateElectronApp();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}


Sentry.init({
  dsn: "https://b58b86c9be4a5903b5351d03f3891c50@o4508110447181824.ingest.de.sentry.io/4508540528296016",
});
let tray

const openWindow = () => {
  // allow only one window to be open
  if (BrowserWindow.getAllWindows().length > 0) {
    BrowserWindow.getAllWindows()[0].show()
    return
  }
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: logo,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }


  // open devtools only when in dev mode
  

  // Open the DevTools.
};

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    openWindow()
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

export const programJSONPath = path.join(app.getPath("userData"), "settings.json")
export const hasPlayedJSONPath = path.join(app.getPath("userData"), "hasPlayed.json") 

function prepairTray(){
  const iconPath = path.join(__dirname, "../../src/images/logo-kabelkrant-manager.png")
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    { label: "Open", click: () => openWindow() },
    { label: "Quit", click: () => app.quit() }
  ])
  tray.setContextMenu(contextMenu)
  tray.on("click", () => openWindow())
  tray.setToolTip("Kabelkrant Manager")
}

function createFiles(){
  if (!fs.existsSync(programJSONPath)){
    fs.writeFileSync(programJSONPath, JSON.stringify([]))
  }
  if (!fs.existsSync(hasPlayedJSONPath)){
    fs.writeFileSync(hasPlayedJSONPath, JSON.stringify([]))
  }
}

app.whenReady().then(() => {
  createFiles()
  startPlayoutServer(programJSONPath, hasPlayedJSONPath)
  startServer(programJSONPath)
  prepairTray()
  handleEvents(hasPlayedJSONPath)
  openWindow()
})



// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    openWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
