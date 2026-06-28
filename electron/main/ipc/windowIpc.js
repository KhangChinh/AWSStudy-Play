export function registerWindowIPC(ipcMain, win) {
  ipcMain.on('login-success', () => {
    if (!win || win.isDestroyed()) return;
    win.setMinimumSize(800, 600);
    win.setResizable(true);
    win.setSize(1280, 720);
    win.center();
    win.removeMenu();
  });

  ipcMain.on('logout', () => {
    if (!win || win.isDestroyed()) return;
    if (win.isMaximized()) win.unmaximize();
    if (win.isFullScreen()) win.setFullScreen(false);
    win.setMinimumSize(450, 600);
    win.setSize(450, 600);
    win.setResizable(false);
    win.center();
    win.removeMenu();
  });
}