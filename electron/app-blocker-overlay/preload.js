const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appBlockerAPI', {
  // Nhận thông tin app cần hiển thị (processName, displayName, reason)
  onCountdownData: (callback) => {
    ipcRenderer.on('appblocker:data', (_event, data) => callback(data));
  },
  // User chủ động đóng app — KHÔNG tính Strike
  forceCloseApp: () => {
    ipcRenderer.send('appblocker:userForceClose');
  }
});
