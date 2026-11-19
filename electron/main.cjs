// Electron main process — minimal desktop shell around the built Vite app.
//
// Uses .cjs so it always runs as CommonJS regardless of the "type": "module"
// setting in package.json (that setting is for the Vite/React source, not
// this file).
//
// This does NOT run the Vite dev server — it loads the already-built
// dist/index.html. Run `npm run build` first, then `npm run electron:preview`
// to try the shell locally before packaging.

const { app, BrowserWindow } = require('electron')
const path = require('node:path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      // No preload script needed: the app doesn't call any Node/Electron
      // APIs from the renderer, so keep the default secure sandbox
      // (contextIsolation: true, nodeIntegration: false).
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(() => {
  createWindow()

  // macOS convention: re-open a window when the dock icon is clicked and no
  // windows are open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Windows/Linux convention: quit when all windows are closed (macOS apps
// typically stay running in the dock until Cmd+Q).
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
