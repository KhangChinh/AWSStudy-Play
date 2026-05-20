import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 450, // Nhỏ nhắn vừa đủ popup form login
    height: 600,
    resizable: false, // Không cho kéo giãn popup
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const url = process.env.VITE_DEV_SERVER_URL;
  if (url) {
    win.loadURL(url);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Lắng nghe sự kiện login thành công từ frontend
  ipcMain.on('login-success', () => {
    win.setMinimumSize(800, 600); // Đặt giới hạn thu nhỏ cho DesktopHub
    win.setResizable(true);
    win.setSize(1280, 720); // Phóng to như Desktop
    win.center(); // Đưa ra giữa màn hình
  });

  // Lắng nghe sự kiện logout để thu nhỏ lại
  ipcMain.on('logout', () => {
    win.setMinimumSize(450, 600); // Phục hồi giới hạn cho form popup
    win.setSize(450, 600); // Thu nhỏ lại
    win.setResizable(false);
    win.center(); 
  });
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
