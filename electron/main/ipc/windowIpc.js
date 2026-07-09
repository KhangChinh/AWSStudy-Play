export function registerWindowIPC(ipcMain, win) {
  ipcMain.on('login-success', () => {
    if (!win || win.isDestroyed()) return;
    if (win.isFullScreen()) win.setFullScreen(false);
    if (win.isMaximized()) win.unmaximize();

    win.setResizable(true);
    win.setMinimumSize(800, 600);
    win.setMaximumSize(100000, 100000);
    win.setBounds({ width: 1280, height: 720 }, false);
    win.center();
    win.removeMenu();
    win.setMenuBarVisibility(false);
    win.setAutoHideMenuBar(true);
  });

  ipcMain.on('logout', () => {
    if (!win || win.isDestroyed()) return;
    if (win.isFullScreen()) win.setFullScreen(false);
    if (win.isMaximized()) win.unmaximize();

    win.setMinimumSize(450, 600);
    win.setMaximumSize(450, 600);
    win.setResizable(false);
    win.setBounds({ width: 450, height: 600 }, false);
    win.center();
    win.removeMenu();
    win.setMenuBarVisibility(false);
    win.setAutoHideMenuBar(true);
  });
}