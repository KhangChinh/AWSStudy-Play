/**
 * IPC Window Service — Gửi tín hiệu quản lý cửa sổ tới Electron Main Process
 * (fire-and-forget, one-way communication)
 *
 * Các tín hiệu này điều khiển kích thước cửa sổ Electron:
 *   - login-success: Mở rộng cửa sổ từ 450×600 → 1280×720 (Desktop mode)
 *   - logout: Thu nhỏ cửa sổ từ 1280×720 → 450×600 (Login mode)
 */

export const notifyLoginSuccess = () => {
  if (window.api) window.api.send('login-success');
};

export const notifyLogout = () => {
  if (window.api) window.api.send('logout');
};
