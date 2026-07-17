import { config } from 'dotenv';
import { app, BrowserWindow, ipcMain, Menu, screen, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers } from './ipcHandlers.js';
import { registerStoreIPC } from './ipc/storeIpc.js';
import { registerWindowIPC } from './ipc/windowIpc.js';

// Load .env cho Main Process (Vite chỉ handle VITE_* cho renderer)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '../../.env') });

const appIconPath = app.isPackaged
  ? path.join(process.resourcesPath, 'icon.png')
  : path.join(__dirname, '../../build/icon.png');

// Ignore EPIPE errors on stdout/stderr to prevent crashes when piped logs break (e.g., Windows with concurrently)
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') return;
  throw err;
});
process.stderr.on('error', (err) => {
  if (err.code === 'EPIPE') return;
  throw err;
});

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
    icon: appIconPath,
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

  // Log renderer process console output to terminal (helps debugging production builds)
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] [Level ${level}] ${message} (from ${sourceId}:${line})`);
  });

  const url = process.env.VITE_DEV_SERVER_URL;
  if (url) {
    win.loadURL(url);
    // win.webContents.openDevTools(); // Tự mở DevTools khi dev - Removed by user request
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Ctrl+Shift+I to toggle DevTools
  win.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  registerStoreIPC(ipcMain);
  registerWindowIPC(ipcMain, win);
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
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, '../mini-widget/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  miniWidget.removeMenu();
  miniWidget.loadFile(path.join(__dirname, '../mini-widget/widget.html'));

  let isAnimating = false;

  // ═══ Snap to nearest corner when drag ends ═══
  miniWidget.on('moved', () => {
    if (!miniWidget || miniWidget.isDestroyed() || isAnimating) return;
    // Small delay to avoid snapping during active drag
    clearTimeout(snapAnimTimer);
    snapAnimTimer = setTimeout(() => snapToCorner(), 150);
  });

  function snapToCorner() {
    if (!miniWidget || miniWidget.isDestroyed()) return;

    const bounds = miniWidget.getBounds();
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    const corners = [
      { x: WIDGET_MARGIN, y: WIDGET_MARGIN }, // Top-Left
      { x: width - bounds.width - WIDGET_MARGIN, y: WIDGET_MARGIN }, // Top-Right
      { x: WIDGET_MARGIN, y: height - bounds.height - WIDGET_MARGIN }, // Bottom-Left
      { x: width - bounds.width - WIDGET_MARGIN, y: height - bounds.height - WIDGET_MARGIN } // Bottom-Right
    ];

    let nearest = corners[0];
    let minDiff = Infinity;
    corners.forEach(c => {
      const d = Math.abs(bounds.x - c.x) + Math.abs(bounds.y - c.y);
      if (d < minDiff) { minDiff = d; nearest = c; }
    });

    if (bounds.x !== nearest.x || bounds.y !== nearest.y) {
      animateToPosition(bounds.x, bounds.y, nearest.x, nearest.y);
    }
  }

  function animateToPosition(fromX, fromY, toX, toY) {
    if (!miniWidget || miniWidget.isDestroyed()) return;
    isAnimating = true;

    const DURATION = 200; // ms
    const STEPS = 15;
    const stepTime = DURATION / STEPS;
    let step = 0;

    clearTimeout(snapAnimTimer);
    const interval = setInterval(() => {
      step++;
      if (!miniWidget || miniWidget.isDestroyed()) { 
        clearInterval(interval); 
        isAnimating = false;
        return; 
      }

      // Ease-out cubic
      const t = step / STEPS;
      const ease = 1 - Math.pow(1 - t, 3);

      const x = Math.round(fromX + (toX - fromX) * ease);
      const y = Math.round(fromY + (toY - fromY) * ease);
      miniWidget.setPosition(x, y);

      if (step >= STEPS) {
        clearInterval(interval);
        isAnimating = false;
      }
    }, stepTime);
  }

  miniWidget.on('closed', () => {
    clearTimeout(snapAnimTimer);
    miniWidget = null;
  });
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
