import { config } from 'dotenv';
import { app, BrowserWindow, ipcMain, Menu, screen, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers } from './ipcHandlers.js';
import { clearToken } from './services/authHelper.js';

// Load .env cho Main Process (Vite chỉ handle VITE_* cho renderer)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '../../.env') });

let win;
let miniWidget = null;
let focusActiveForWidget = false; // track if focus is running

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
    win.webContents.openDevTools(); // Tự mở DevTools khi dev
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  registerIpcHandlers(ipcMain, win);

  // ═══ Mini Widget: show when minimized during focus ═══
  win.on('minimize', () => {
    if (focusActiveForWidget) {
      showMiniWidget();
    }
  });

  win.on('restore', () => {
    closeMiniWidget();
  });

  win.on('focus', () => {
    closeMiniWidget();
  });
}

// ═══ Mini Widget Window ═══
const WIDGET_W = 260;
const WIDGET_H = 60;
const WIDGET_MARGIN = 20;
let snapAnimTimer = null;

function showMiniWidget() {
  if (miniWidget && !miniWidget.isDestroyed()) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  miniWidget = new BrowserWindow({
    width: WIDGET_W,
    height: WIDGET_H,
    x: width - WIDGET_W - WIDGET_MARGIN,
    y: height - WIDGET_H - WIDGET_MARGIN,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focusable: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, '../mini-widget/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  miniWidget.removeMenu();
  miniWidget.loadFile(path.join(__dirname, '../mini-widget/widget.html'));

  // ═══ Snap to nearest corner when drag ends ═══
  miniWidget.on('moved', () => {
    if (!miniWidget || miniWidget.isDestroyed()) return;
    // Small delay to avoid snapping during active drag
    clearTimeout(snapAnimTimer);
    snapAnimTimer = setTimeout(() => snapToCorner(), 150);
  });

  miniWidget.on('closed', () => {
    clearTimeout(snapAnimTimer);
    miniWidget = null;
  });
}

function snapToCorner() {
  if (!miniWidget || miniWidget.isDestroyed()) return;

  const bounds = miniWidget.getBounds();
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = primaryDisplay.workAreaSize;

  // 4 corner targets
  const corners = [
    { x: WIDGET_MARGIN, y: WIDGET_MARGIN },                                    // top-left
    { x: sw - WIDGET_W - WIDGET_MARGIN, y: WIDGET_MARGIN },                    // top-right
    { x: WIDGET_MARGIN, y: sh - WIDGET_H - WIDGET_MARGIN },                    // bottom-left
    { x: sw - WIDGET_W - WIDGET_MARGIN, y: sh - WIDGET_H - WIDGET_MARGIN },    // bottom-right
  ];

  // Find nearest corner by center distance
  let nearest = corners[3]; // default bottom-right
  let minDist = Infinity;
  for (const c of corners) {
    const dx = cx - (c.x + WIDGET_W / 2);
    const dy = cy - (c.y + WIDGET_H / 2);
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      nearest = c;
    }
  }

  // Animate smoothly to nearest corner
  animateToPosition(bounds.x, bounds.y, nearest.x, nearest.y);
}

function animateToPosition(fromX, fromY, toX, toY) {
  if (!miniWidget || miniWidget.isDestroyed()) return;

  const DURATION = 200; // ms
  const STEPS = 15;
  const stepTime = DURATION / STEPS;
  let step = 0;

  clearTimeout(snapAnimTimer);
  const interval = setInterval(() => {
    step++;
    if (!miniWidget || miniWidget.isDestroyed()) { clearInterval(interval); return; }

    // Ease-out cubic
    const t = step / STEPS;
    const ease = 1 - Math.pow(1 - t, 3);

    const x = Math.round(fromX + (toX - fromX) * ease);
    const y = Math.round(fromY + (toY - fromY) * ease);
    miniWidget.setPosition(x, y);

    if (step >= STEPS) clearInterval(interval);
  }, stepTime);
}

function closeMiniWidget() {
  if (miniWidget && !miniWidget.isDestroyed()) {
    miniWidget.close();
    miniWidget = null;
  }
}

// Send timer data to mini widget
function sendToWidget(channel, data) {
  if (miniWidget && !miniWidget.isDestroyed()) {
    miniWidget.webContents.send(channel, data);
  }
}

// ═══ Focus state listener from renderer ═══
ipcMain.on('focus:widget-state', (_event, data) => {
  focusActiveForWidget = data.active;

  if (data.active) {
    sendToWidget('widget:timer-update', data);
  } else {
    sendToWidget('widget:session-end');
    closeMiniWidget();
  }
});

ipcMain.on('focus:widget-timer', (_event, data) => {
  sendToWidget('widget:timer-update', data);
});

ipcMain.on('focus:widget-cam', (_event, status) => {
  sendToWidget('widget:cam-status', status);
});

// Widget requests restore
ipcMain.on('widget:restore', () => {
  if (win && !win.isDestroyed()) {
    win.restore();
    win.focus();
  }
  closeMiniWidget();
});

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

  // Đảm bảo thoát chế độ phóng to/toàn màn hình trước khi chỉnh size
  if (win.isMaximized()) win.unmaximize();
  if (win.isFullScreen()) win.setFullScreen(false);

  win.setMinimumSize(450, 600);
  win.setSize(450, 600);
  win.setResizable(false);
  win.center();
  win.removeMenu();

  // Xóa token xác thực khỏi ổ đĩa khi đăng xuất
  clearToken();
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
