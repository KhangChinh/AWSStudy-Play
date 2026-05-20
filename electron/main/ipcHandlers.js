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

export function registerIpcHandlers(ipcMain, win) {
  // ═══════════════════════════════════════════
  //  AUTH — Mã hóa & lưu trữ Token bảo mật
  // ═══════════════════════════════════════════
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
  //  WINDOW — Điều khiển cửa sổ Electron
  // ═══════════════════════════════════════════
  ipcMain.on('login-success', () => {
    // Gỡ bỏ giới hạn max size để có thể phóng to toàn màn hình
    win.setMaximumSize(9999, 9999);
    win.setMinimumSize(800, 600);
    win.setResizable(true);
    win.setMaximizable(true);
    win.setSize(1280, 720);
    win.center();
  });

  ipcMain.on('logout', () => {
    win.setMinimumSize(450, 600);
    win.setMaximumSize(450, 600); // Khóa cứng kích thước
    win.setSize(450, 600);
    win.setResizable(true); // Giữ true để không mất style frame
    win.setMaximizable(false);
    win.center();
  });

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
}
