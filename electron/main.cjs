/**
 * Processus principal Electron - Slide Recorder
 * Charge l'app web avec les mêmes fonctionnalités (enregistrement, édition)
 */

const { app, BrowserWindow, session, desktopCapturer, ipcMain } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let mainWindow = null;
let pipWindow = null;
let pipCaptureInterval = null;

function setupDisplayMediaHandler() {
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      if (sources.length === 0) {
        callback({});
        return;
      }
      callback({ video: sources[0] });
    }).catch((err) => {
      console.error('desktopCapturer error:', err);
      callback({});
    });
  }, { useSystemPicker: true });
}

function createPipWindow() {
  if (pipWindow && !pipWindow.isDestroyed()) return pipWindow;
  const pipPath = path.join(__dirname, 'pip-window.html');
  pipWindow = new BrowserWindow({
    width: 380,
    height: 260,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    minimizable: false,
    fullscreenable: false,
    title: 'Slide Recorder - Aperçu',
    webPreferences: {
      preload: path.join(__dirname, 'pip-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  pipWindow.loadFile(pipPath);
  pipWindow.on('closed', () => {
    pipWindow = null;
    stopPipCapture();
  });
  return pipWindow;
}

function startPipCapture(rect) {
  stopPipCapture();
  if (!mainWindow || mainWindow.isDestroyed() || !pipWindow || pipWindow.isDestroyed()) return;
  pipCaptureInterval = setInterval(async () => {
    try {
      if (!mainWindow || mainWindow.isDestroyed() || !pipWindow || pipWindow.isDestroyed()) return;
      const img = await mainWindow.webContents.capturePage(rect);
      const dataUrl = 'data:image/jpeg;base64,' + img.toJPEG(70).toString('base64');
      pipWindow.webContents.send('pip-frame', dataUrl);
    } catch (e) {
      console.warn('PIP capture error:', e);
    }
  }, 100);
}

function stopPipCapture() {
  if (pipCaptureInterval) {
    clearInterval(pipCaptureInterval);
    pipCaptureInterval = null;
  }
}

function setupPipHandlers() {
  ipcMain.on('pip-create', (event, rect) => {
    createPipWindow();
    startPipCapture(rect);
  });
  ipcMain.on('pip-close', () => {
    stopPipCapture();
    if (pipWindow && !pipWindow.isDestroyed()) {
      pipWindow.close();
    }
  });
  ipcMain.on('pip-control', (event, action) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pip-control', action);
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    title: 'Slide Recorder',
    show: false,
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  mainWindow = win;

  if (isDev) {
    win.loadURL('http://localhost:5173').catch(() => {
      win.loadFile(path.join(__dirname, '../dist/index.html'));
    });
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  setupDisplayMediaHandler();
  setupPipHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
