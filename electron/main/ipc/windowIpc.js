let windowResizeTimeout = null;

export function registerWindowIPC(ipcMain, win) {
  ipcMain.on('login-success', () => {
    if (!win || win.isDestroyed()) return;
    clearTimeout(windowResizeTimeout);
    windowResizeTimeout = setTimeout(() => {
      if (!win || win.isDestroyed()) return;
      if (win.isFullScreen()) win.setFullScreen(false);
      if (win.isMaximized()) win.unmaximize();

      win.setResizable(true);
      win.setMinimumSize(800, 600);
      win.setMaximumSize(100000, 100000);
      
      const bounds = win.getBounds();
      if (bounds.width !== 1280 || bounds.height !== 720) {
        win.setBounds({ width: 1280, height: 720 }, false);
        win.center();
      }
      win.removeMenu();
      win.setMenuBarVisibility(false);
      win.setAutoHideMenuBar(true);
    }, 50);
  });

  ipcMain.on('logout', () => {
    if (!win || win.isDestroyed()) return;
    clearTimeout(windowResizeTimeout);
    windowResizeTimeout = setTimeout(() => {
      if (!win || win.isDestroyed()) return;
      if (win.isFullScreen()) win.setFullScreen(false);
      if (win.isMaximized()) win.unmaximize();

      win.setMinimumSize(450, 600);
      win.setMaximumSize(450, 600);
      win.setResizable(false);
      
      const bounds = win.getBounds();
      if (bounds.width !== 450 || bounds.height !== 600) {
        win.setBounds({ width: 450, height: 600 }, false);
        win.center();
      }
      win.removeMenu();
      win.setMenuBarVisibility(false);
      win.setAutoHideMenuBar(true);
    }, 50);
  });
}