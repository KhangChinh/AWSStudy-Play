const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // ═══ Gọi Main Process (request-response) ═══
  invoke: (channel, data) => {
    const validChannels = [
      'aws:setCredentials',
      'focus:start',
      'focus:stop',
      'focus:status',
      'focus:setConfig',
      'ai:classify',
      'ai:clearCache',
      'ai:status',
      'ai:saveGroqKey',
      'ai:getGroqKey',
      'ai:getAllowedCategories',
      'ai:saveAllowedCategories',
      'setup:openExtensionFolder',
      'setup:openBrowserExtPage',
      // Quest
      'quest:save',
      'quest:load',
      'quest:clear',
      // Store
      'store:saveProfile',
      'store:loadProfile',
      'store:clearProfile',
      'store:saveInventory',
      'store:loadInventory',
      'store:clearInventory',
      'store:saveGachaHistory',
      'store:loadGachaHistory',
      'store:clearGachaHistory',
      'store:saveSudokuLevels',
      'store:loadSudokuLevels',
      'store:clearSudokuLevels',
      'store:saveSocial',
      'store:loadSocial',
      'store:clearSocial',
      'store:saveDaily',
      'store:loadDaily',
      'store:clearDaily',
      'store:saveMasterData',
      'store:loadMasterData',
      'store:clearMasterData',
      'store:saveShop',
      'store:loadShop',
      'store:clearShop',
      'store:saveVersion',
      'store:loadVersion',
      'store:clearLoginData',
      'store:saveAiSettings',
      'store:loadAiSettings',
      // Study Planner
      'study:chat',
      'study:generatePlan',
      'study:generateQuiz',
      'study:loadChats',
      'study:saveChat',
      'study:deleteChat',
      'study:loadPlans',
      'study:savePlan',
      'study:deletePlan',
      'study:loadQuizzes',
      'study:saveQuiz',
      'study:deleteQuiz',
      'study:loadSettings',
      'study:saveSettings',
      'study:uploadFile',
      'study:removeFile',
      'study:getFileStatus',
      'dialog:openFile',
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    return Promise.reject(new Error(`Invalid channel: ${channel}`));
  },

  // ═══ Gửi tín hiệu 1 chiều (fire-and-forget) ═══
  send: (channel, data) => {
    const validChannels = [
      'focus:widget-state',
      'focus:widget-timer',
      'focus:widget-cam',
      'logout',
      'login-success'
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
      'focus:sessionEnd',
      'focus:sessionEndData',
      'focus-mode-changed',
      'gate-status',
      'timer-expired',
      'strike-recorded',
      'session-failed',
      'ai-status-lost',
      'ai-classifying',
      // Quest
      'quest-updated',
    ];
    if (validChannels.includes(channel)) {
      const wrapper = (_event, ...args) => callback(...args);
      // Gán thuộc tính ẩn vào callback để có thể truy xuất lúc removeListener
      callback._wrapper = wrapper;
      ipcRenderer.on(channel, wrapper);
    }
  },

  // ═══ Gỡ listener ═══
  removeListener: (channel, callback) => {
    if (callback._wrapper) {
      ipcRenderer.removeListener(channel, callback._wrapper);
      delete callback._wrapper;
    }
  }
});
