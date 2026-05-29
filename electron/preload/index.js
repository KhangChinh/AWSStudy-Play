const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // ═══ Gọi Main Process (request-response) ═══
  invoke: (channel, data) => {
    const validChannels = [
      'focus:start',
      'focus:stop',
      'focus:status',
      'ai:classify',
      'ai:clearCache',
      'secureStore:setItem',
      'secureStore:getItem',
      'secureStore:removeItem',
      'secureStore:clear'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    return Promise.reject(new Error(`Invalid channel: ${channel}`));
  },

  // ═══ Gửi tín hiệu 1 chiều (fire-and-forget) ═══
  send: (channel, data) => {
    const validChannels = [
      'login-success',
      'logout'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  // ═══ Lắng nghe sự kiện từ Main Process ═══
  on: (channel, callback) => {
    const validChannels = [
      'focus:warning',
      'focus:forceClose',
      'focus:sessionEnd'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  }
});
