/**
 * IPC Handlers — Đón tín hiệu IPC từ React (Renderer Process)
 *
 * Quy ước channel naming:
 *   - focus:*       → Focus Engine
 *   - ai:*          → AI Guard
 *   - secureStore:* → Secure Store (tokens + timestamp, mã hóa safeStorage)
 */

import { startFocus, stopFocus, getSessionStatus } from './services/focusEngine.js';
import { classifyContent, clearCache } from './services/aiGuard.js';
import { secureSetItem, secureGetItem, secureRemoveItem, secureClear } from './services/secureStore.js';

export function registerIpcHandlers(ipcMain, win) {
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
}
