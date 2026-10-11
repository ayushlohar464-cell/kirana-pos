/**
 * Application Lifecycle & Background Jobs
 */
const { runMigrations } = require('../database/migrate');
const { closeDb, getDb } = require('../database/connection');
const backupService = require('../services/backup-service');

let autoBackupTimer = null;

async function onAppReady() {
  console.log('KiranaPOS starting up: initializing database and running migrations...');
  try {
    await runMigrations();
    console.log('Database initialized and migrations applied successfully.');
  } catch (err) {
    console.error('Fatal: Failed to run database migrations:', err);
    throw err;
  }

  // Schedule automatic backup check
  scheduleAutoBackup();
}

function scheduleAutoBackup() {
  // Check every hour if a daily backup is needed
  const checkAndRunBackup = async () => {
    try {
      const db = getDb();
      const setting = db.prepare("SELECT value FROM settings WHERE key = 'auto_backup_enabled'").get();
      if (!setting || setting.value !== 'true') return;

      const today = new Date().toISOString().slice(0, 10);
      const existing = db.prepare(`
        SELECT id FROM backup_history
        WHERE backup_type = 'auto_daily' AND created_at >= ? AND status = 'success'
      `).get(`${today}T00:00:00.000Z`);

      if (!existing) {
        console.log('Running scheduled daily automatic database backup...');
        await backupService.createBackup('auto_daily', null);
        console.log('Daily automatic backup completed successfully.');
      }
    } catch (e) {
      console.warn('Scheduled backup warning:', e.message);
    }
  };

  // Run on startup after 30 seconds
  setTimeout(checkAndRunBackup, 30000);

  // Repeat every 2 hours
  autoBackupTimer = setInterval(checkAndRunBackup, 2 * 60 * 60 * 1000);
}

function onAppQuit() {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
    autoBackupTimer = null;
  }
  console.log('Closing database connection cleanly...');
  closeDb();
}

module.exports = {
  onAppReady,
  onAppQuit,
};
