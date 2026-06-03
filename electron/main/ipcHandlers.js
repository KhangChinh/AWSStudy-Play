/**
 * IPC Handlers — Đón tín hiệu IPC từ React (Renderer Process)
 *
 * Quy ước channel naming:
 *   - focus:*       → Focus Engine
 *   - ai:*          → AI Guard
 *   - secureStore:* → Secure Store (tokens + timestamp, mã hóa safeStorage)
 */

import { startFocus, stopFocus, getSessionStatus, setFocusWin, setUserId, setAuthToken } from './services/focusEngine.js';
import { classifyContent, clearCache, getAiStatus, getAllowedCategories, saveAllowedCategories, getGroqKey, saveGroqKey } from './services/aiGuard.js';
import { secureSetItem, secureGetItem, secureRemoveItem, secureClear } from './services/secureStore.js';
import { setApiUrl } from './services/sessionApi.js';

export function registerIpcHandlers(ipcMain, win) {
  // Set BrowserWindow reference for focusEngine renderer communication
  setFocusWin(win);

  // ═══════════════════════════════════════════
  //  FOCUS ENGINE — Giám sát & chặn ứng dụng
  // ═══════════════════════════════════════════
  ipcMain.handle('focus:start', async (_event, data) => {
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
  //  SECURE STORE — Tokens + Timestamp (safeStorage)
  //  Zero-Trust: KHÔNG lưu userData, chỉ lưu tokens
  // ═══════════════════════════════════════════
  ipcMain.handle('secureStore:setItem', async (_event, { key, value }) => {
    return secureSetItem(key, value);
  });

  ipcMain.handle('secureStore:getItem', async (_event, key) => {
    return secureGetItem(key);
  });

  ipcMain.handle('secureStore:removeItem', async (_event, key) => {
    return secureRemoveItem(key);
  });

  ipcMain.handle('secureStore:clear', async () => {
    return secureClear();
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
}
