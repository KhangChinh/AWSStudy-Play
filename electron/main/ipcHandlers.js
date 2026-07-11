/**
 * IPC Handlers — Đón tín hiệu IPC từ React (Renderer Process)
 *
 * Quy ước channel naming:
 *   - focus:*       → Focus Engine
 *   - ai:*          → AI Guard
 *   - secureStore:* → Secure Store (tokens + timestamp, mã hóa safeStorage)
 *   - setup:*       → Setup Wizard
 */

import { app } from 'electron';

import { startFocus, stopFocus, getSessionStatus, setFocusWin, setUserId, setAuthToken } from './services/focusEngine.js';
import { classifyContent, clearCache, getAiStatus, getAllowedCategories, saveAllowedCategories, getGroqKey, saveGroqKey, setBlockerModel } from './services/aiGuard.js';
import { setApiUrl } from './services/sessionApi.js';
import { chatWithAI, generateStudyPlan, generateQuiz } from './services/aiStudyService.js';
import { 
  loadChatHistory, saveChatSession, deleteChatSession, 
  loadStudyPlans, saveStudyPlan, deleteStudyPlan, 
  loadQuizHistory, saveQuizResult, deleteQuizResult, 
  loadStudySettings, saveStudySettings 
} from './services/studyPlannerStore.js';

export function registerIpcHandlers(ipcMain, win) {
  // Set BrowserWindow reference for focusEngine renderer communication
  setFocusWin(win);

  // ═══════════════════════════════════════════
  //  FOCUS ENGINE — Giám sát & chặn ứng dụng
  // ═══════════════════════════════════════════
  ipcMain.handle('focus:start', async (_event, data) => {
    // Log face tracking model on start
    console.log('[FocusEngine] 📷 Face Tracking → Model: MediaPipe BlazeFace Short-Range (TFLite, local)');
    // Apply AI Blocker model from settings if provided
    if (data?.blockerModel) {
      setBlockerModel(data.blockerModel);
    }
    return startFocus(data);
  });

  ipcMain.handle('focus:stop', async () => {
    return stopFocus();
  });

  ipcMain.handle('focus:status', async () => {
    return getSessionStatus();
  });

  // ═══════════════════════════════════════════
  //  AI GUARD — Phân loại nội dung
  // ═══════════════════════════════════════════
  ipcMain.handle('ai:classify', async (_event, content) => {
    return classifyContent(content);
  });

  ipcMain.handle('ai:clearCache', async () => {
    return clearCache();
  });

  // ═══════════════════════════════════════════
  //  FOCUS CONFIG — Token + API URL (gọi 1 lần sau login)
  // ═══════════════════════════════════════════
  ipcMain.handle('focus:setConfig', async (_event, { token, apiUrl }) => {
    if (token) setAuthToken(token);
    if (apiUrl) setApiUrl(apiUrl);
    return { success: true };
  });

  // ═══════════════════════════════════════════
  //  AI STATUS & SETTINGS
  // ═══════════════════════════════════════════
  ipcMain.handle('ai:status', async () => {
    return getAiStatus();
  });

  ipcMain.handle('ai:saveGroqKey', async (_event, key) => {
    saveGroqKey(key);
    return { success: true };
  });

  ipcMain.handle('ai:getGroqKey', async () => {
    return getGroqKey();
  });

  ipcMain.handle('ai:getAllowedCategories', async () => {
    return getAllowedCategories();
  });

  ipcMain.handle('ai:saveAllowedCategories', async (_event, cats) => {
    saveAllowedCategories(cats);
    return { success: true };
  });

  // ═══════════════════════════════════════════
  //  SETUP WIZARD — Extension installation helpers
  // ═══════════════════════════════════════════
  ipcMain.handle('setup:openExtensionFolder', async () => {
    const { shell } = await import('electron');
    // Find the browser-extension folder relative to the app
    const appPath = app.getAppPath();
    const path = await import('path');
    
    // In dev: project root/browser-extension
    // In prod: resources/browser-extension
    let extPath = path.default.join(appPath, '..', '..', 'browser-extension');
    
    // Fallback: try common dev path
    const fs = await import('fs');
    if (!fs.default.existsSync(extPath)) {
      extPath = path.default.join(appPath, 'browser-extension');
    }
    if (!fs.default.existsSync(extPath)) {
      // Try project root (dev mode with Vite)
      extPath = path.default.join(process.cwd(), 'browser-extension');
    }
    
    if (fs.default.existsSync(extPath)) {
      shell.openPath(extPath);
      return { success: true, path: extPath };
    }
    return { success: false, error: 'Extension folder not found' };
  });

  ipcMain.handle('setup:openBrowserExtPage', async (_event, browserId) => {
    const { shell } = await import('electron');
    const urls = {
      chrome: 'https://www.google.com/search?q=chrome+extensions+developer+mode',
      edge: 'https://www.google.com/search?q=edge+extensions+developer+mode',
      firefox: 'https://www.google.com/search?q=firefox+extensions+developer+mode',
    };
    // We can't open chrome:// URLs via shell.openExternal (blocked by OS)
    // Instead open a helper page. The user will need to type chrome://extensions manually.
    // But we CAN try to launch the browser with the extensions page as argument:
    const { exec } = await import('child_process');
    
    if (browserId === 'chrome') {
      exec('start chrome chrome://extensions', (err) => {
        if (err) shell.openExternal(urls.chrome);
      });
    } else if (browserId === 'edge') {
      exec('start msedge edge://extensions', (err) => {
        if (err) shell.openExternal(urls.edge);
      });
    } else {
      shell.openExternal(urls[browserId] || urls.chrome);
    }
    return { success: true };
  });
  // ═══════════════════════════════════════════
  //  STUDY PLANNER — AI Chat, Plans, Quizzes
  // ═══════════════════════════════════════════
  ipcMain.handle('study:chat', async (_event, { messages }) => {
    return chatWithAI(messages);
  });

  ipcMain.handle('study:generatePlan', async (_event, { collectedInfo }) => {
    return generateStudyPlan(collectedInfo);
  });

  ipcMain.handle('study:generateQuiz', async (_event, { phase, planTitle }) => {
    return generateQuiz(phase, planTitle);
  });

  ipcMain.handle('study:loadChats', async () => loadChatHistory());
  ipcMain.handle('study:saveChat', async (_event, session) => saveChatSession(session));
  ipcMain.handle('study:deleteChat', async (_event, chatId) => deleteChatSession(chatId));

  ipcMain.handle('study:loadPlans', async () => loadStudyPlans());
  ipcMain.handle('study:savePlan', async (_event, plan) => saveStudyPlan(plan));
  ipcMain.handle('study:deletePlan', async (_event, planId) => deleteStudyPlan(planId));

  ipcMain.handle('study:loadQuizzes', async () => loadQuizHistory());
  ipcMain.handle('study:saveQuiz', async (_event, quiz) => saveQuizResult(quiz));
  ipcMain.handle('study:deleteQuiz', async (_event, quizId) => deleteQuizResult(quizId));

  ipcMain.handle('study:loadSettings', async () => loadStudySettings());
  ipcMain.handle('study:saveSettings', async (_event, settings) => saveStudySettings(settings));

}
