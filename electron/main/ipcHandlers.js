/**
 * IPC Handlers — Đón tín hiệu IPC từ React (Renderer Process)
 * 
 * Quy ước channel naming:
 *   - auth:*   → Xác thực & Token
 *   - focus:*  → Focus Engine
 *   - ai:*     → AI Guard
 */

import { saveToken, loadToken, clearToken } from './services/authHelper.js';
import { startFocus, stopFocus, getSessionStatus } from './services/focusEngine.js';
import { classifyContent, clearCache } from './services/aiGuard.js';

import { BrowserWindow } from 'electron';

export function registerIpcHandlers(ipcMain, win, createTimerWidget, closeTimerWidget) {
  // ... (auth handlers keep the same)
  ipcMain.handle('auth:saveToken', async (_event, token) => {
    return saveToken(token);
  });

  ipcMain.handle('auth:loadToken', async () => {
    return loadToken();
  });

  ipcMain.handle('auth:clearToken', async () => {
    return clearToken();
  });

  // ═══════════════════════════════════════════
  //  FOCUS ENGINE — Giám sát & chặn ứng dụng
  // ═══════════════════════════════════════════
  ipcMain.handle('focus:start', async (_event, data) => {
    const result = await startFocus(data);
    if (result && result.success) {
      if (win) win.hide();
      createTimerWidget();
    }
    return result;
  });

  ipcMain.handle('focus:stop', async () => {
    const result = await stopFocus();
    closeTimerWidget();
    if (win) win.show();
    return result;
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
}
