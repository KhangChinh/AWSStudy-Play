/**
 * Preload Script — CẦU NỐI BẢO MẬT giữa React (Renderer) và Node.js (Main)
 * 
 * Định nghĩa window.api thông qua contextBridge
 * React gọi: await window.api.invoke('channel', data)
 * React lắng nghe: window.api.on('channel', callback)
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // ═══ Gọi Main Process (request-response) ═══
  invoke: (channel, data) => {
    const validChannels = [
      'auth:saveToken',
      'auth:loadToken',
      'auth:clearToken',
      'focus:start',
      'focus:stop',
      'focus:status',
      'ai:classify',
      'ai:clearCache'
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
