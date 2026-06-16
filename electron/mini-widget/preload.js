const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widgetAPI', {
  onTimerUpdate: (callback) => {
    ipcRenderer.on('widget:timer-update', (_event, data) => callback(data));
  },
  onCamStatus: (callback) => {
    ipcRenderer.on('widget:cam-status', (_event, status) => callback(status));
  },
  onSessionEnd: (callback) => {
    ipcRenderer.on('widget:session-end', () => callback());
  },
  restoreMainWindow: () => {
    ipcRenderer.send('widget:restore');
  }
});
