const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pipAPI', {
  onFrame: (cb) => ipcRenderer.on('pip-frame', (_, data) => cb(data)),
  onState: (cb) => ipcRenderer.on('pip-state', (_, data) => cb(data)),
  sendControl: (action) => ipcRenderer.send('pip-control', action),
});
