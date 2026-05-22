import { app, BrowserWindow, ipcMain, Menu, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerIpcHandlers } from './ipcHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win;
let widgetWin;

export function createTimerWidget() {
  if (widgetWin) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const widgetWidth = 300;
  const widgetHeight = 120;

  widgetWin = new BrowserWindow({
    width: widgetWidth,
    height: widgetHeight,
    x: width - widgetWidth - 20,
    y: height - widgetHeight - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    backgroundColor: '#00000000', // Đảm bảo không có nháy trắng
    show: false, // Ẩn lúc đầu để load xong mới hiện
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const url = process.env.VITE_DEV_SERVER_URL;
  if (url) {
    widgetWin.loadURL(`${url}#/timer-widget`);
  } else {
    // Với production, link đến file html kèm route
    widgetWin.loadFile(path.join(__dirname, '../../dist/index.html'), { hash: '/timer-widget' });
  }

  // Chỉ hiện khi nội dung đã sẵn sàng để tránh nháy trắng
  widgetWin.once('ready-to-show', () => {
    if (widgetWin) widgetWin.show();
  });

  widgetWin.on('move', () => {
    if (!widgetWin) return;
    const { x, y, width, height } = widgetWin.getBounds();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;

    let newX = x;
    let newY = y;

    if (x < 0) newX = 0;
    if (y < 0) newY = 0;
    if (x + width > screenW) newX = screenW - width;
    if (y + height > screenH) newY = screenH - height;

    if (newX !== x || newY !== y) {
      widgetWin.setPosition(newX, newY);
    }
  });

  widgetWin.on('closed', () => {
    widgetWin = null;
  });
}

export function closeTimerWidget() {
  if (widgetWin) {
    widgetWin.close();
    widgetWin = null;
  }
}
function createWindow() {
  win = new BrowserWindow({
    width: 450,
    height: 600,
    resizable: false,
    frame: true, // Giữ frame để có nút đóng/thu nhỏ nếu muốn, hoặc set false nếu muốn custom hoàn toàn
    title: 'SStudyPlays', // Đặt tên title ở thanh tiêu đề
    show: false, // Ẩn cửa sổ lúc khởi tạo
    backgroundColor: '#0c0218', // Màu nền tím tối của Dashboard để không bị nháy trắng
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

  // CHỈ HIỆN KHI SẴN SÀNG
  win.once('ready-to-show', () => {
    if (win) {
      win.show();
      win.focus();
    }
  });

  const url = process.env.VITE_DEV_SERVER_URL;
  if (url) {
    win.loadURL(url);
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  registerIpcHandlers(ipcMain, win, createTimerWidget, closeTimerWidget);
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
