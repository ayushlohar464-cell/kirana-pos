/**
 * Electron Main Process Entry Point
 */
const { app, session } = require('electron');
const { createMainWindow, getMainWindow } = require('./window');
const { registerIpcHandlers } = require('./ipc-handlers');
const { applySecurityHeaders } = require('./security');
const { onAppReady, onAppQuit } = require('./lifecycle');

// Ensure single instance lock for offline POS
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    // Apply Content Security Policy headers
    applySecurityHeaders(session.defaultSession);

    // Register all IPC handlers
    registerIpcHandlers();

    // Run database migrations and background jobs
    await onAppReady();

    // Create the main GUI window
    createMainWindow();

    app.on('activate', () => {
      if (!getMainWindow()) {
        createMainWindow();
      }
    });
  }).catch((err) => {
    console.error('Failed to start KiranaPOS application:', err);
    app.quit();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    onAppQuit();
  });
}
