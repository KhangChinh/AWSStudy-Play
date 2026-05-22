import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerIpcHandlers } from './ipcHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 450,
    height: 600,
    resizable: false,
    frame: true, // Giữ frame để có nút đóng/thu nhỏ nếu muốn, hoặc set false nếu muốn custom hoàn toàn
    title: '', // Ẩn title ở thanh tiêu đề
    autoHideMenuBar: true, // Thử lại với true kết hợp removeMenu
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // PHƯƠNG PHÁP QUYẾT LIỆT HƠN ĐỂ TẮT MENU
  win.removeMenu();
  win.setMenuBarVisibility(false);
  win.setAutoHideMenuBar(true);

  // Ngăn chặn web page thay đổi title của window
  win.on('page-title-updated', (e) => e.preventDefault());

  const url = process.env.VITE_DEV_SERVER_URL;
  if (url) {
    win.loadURL(url);
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  registerIpcHandlers(ipcMain, win);
}

// LẮNG NGHE TRỰC TIẾP TẠI INDEX (Giống logic mainold.js)
ipcMain.on('login-success', () => {
  if (!win || win.isDestroyed()) return;

  win.setMinimumSize(800, 600);
  win.setResizable(true);
  win.setSize(1280, 720);
  win.center();
  // Đảm bảo sau khi đổi size vẫn không có menu
  win.removeMenu();
});

ipcMain.on('logout', () => {
  if (!win || win.isDestroyed()) return;
  win.setMinimumSize(450, 600);
  win.setSize(450, 600);
  win.setResizable(false);
  win.center();
  win.removeMenu();
});

app.whenReady().then(() => {
  // Tắt menu toàn cục ngay khi app sẵn sàng
  Menu.setApplicationMenu(null);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
