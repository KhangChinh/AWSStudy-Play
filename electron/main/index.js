import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerIpcHandlers } from './ipcHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 450,
    height: 600,
    resizable: false, // Khóa ngay từ đầu giống bản cũ
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // LẮNG NGHE TRỰC TIẾP TẠI INDEX (Giống logic mainold.js)
  ipcMain.on('login-success', () => {
    if (!win || win.isDestroyed()) return;

    win.setMinimumSize(800, 600); // Đặt giới hạn trước
    win.setResizable(true);       // Mở khóa
    win.setSize(1280, 720);       // Phóng to
    win.center();
  });

  ipcMain.on('logout', () => {
    if (!win || win.isDestroyed()) return;
    win.setMinimumSize(450, 600);
    win.setSize(450, 600);
    win.setResizable(false);
    win.center();
  });

  const url = process.env.VITE_DEV_SERVER_URL;
  if (url) {
    win.loadURL(url);
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Đăng ký các IPC handlers khác
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
