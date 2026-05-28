/**
 * IPC Handlers — Đón tín hiệu IPC từ React (Renderer Process)
 * 
 * Quy ước channel naming:
 *   - focus:*  → Focus Engine
 *   - ai:*     → AI Guard
 *   - store:*  → User Store (electron-store cache)
 */

import { startFocus, stopFocus, getSessionStatus } from './services/focusEngine.js';
import { classifyContent, clearCache } from './services/aiGuard.js';
// [DEPRECATED] Client không nên truy cập DynamoDB trực tiếp — vi phạm zero-trust
// import { saveUser, getUser } from './services/dynamoDbService.js';
import { saveUserToStore, getUserFromStore, clearUserStore } from './services/userStore.js';

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
  //  DYNAMODB — [DEPRECATED] Vi phạm zero-trust
  //  Client không nên truy cập DynamoDB trực tiếp
  //  Dùng API Gateway + JWT thay thế (userService.js)
  // ═══════════════════════════════════════════
  // ipcMain.handle('db:saveUser', async (_event, { userId, email, name }) => {
  //   return saveUser(userId, email, name);
  // });

  // ipcMain.handle('db:getUser', async (_event, userId) => {
  //   return getUser(userId);
  // });

  // ═══════════════════════════════════════════
  //  USER STORE — Cache user data cục bộ (electron-store)
  // ═══════════════════════════════════════════
  ipcMain.handle('store:saveUser', async (_event, userData) => {
    return saveUserToStore(userData);
  });

  ipcMain.handle('store:getUser', async () => {
    return getUserFromStore();
  });

  ipcMain.handle('store:clearUser', async () => {
    return clearUserStore();
  });
}
