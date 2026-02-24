/**
 * Preload - expose isElectron + API PiP pour macOS
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  requestPipWindow: (rect) => ipcRenderer.send('pip-create', rect),
  closePipWindow: () => ipcRenderer.send('pip-close'),
  onPipControl: (cb) => ipcRenderer.on('pip-control', (_, action) => cb(action)),
});
