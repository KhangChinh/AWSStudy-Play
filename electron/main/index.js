import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerIpcHandlers } from './ipcHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 450, // Nhỏ nhắn vừa đủ popup form login
    height: 600,
    minWidth: 450,
    maxWidth: 450,
    minHeight: 600,
    maxHeight: 600,
    resizable: true, // Giữ cờ true để không mất style native của Windows
    maximizable: false, // Tạm ẩn nút phóng to ở màn login
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const url = process.env.VITE_DEV_SERVER_URL;
  if (url) {
    win.loadURL(url);
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Đăng ký IPC handlers
  registerIpcHandlers(ipcMain, win);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
