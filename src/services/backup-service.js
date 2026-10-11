/**
 * SQLite Native Database Backup & Recovery Service
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const { getDb, getDbPath, closeDb, initDb } = require('../database/connection');
const { AUDIT_ACTIONS } = require('../shared/constants');

class BackupService {
  getDefaultBackupDir() {
    const dbPath = getDbPath();
    const backupDir = path.join(path.dirname(dbPath), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
  }

  getBackupDirectory() {
    const db = getDb();
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('backup_directory');
    if (setting && setting.value && fs.existsSync(setting.value)) {
      return setting.value;
    }
    return this.getDefaultBackupDir();
  }

  getRetentionDays() {
    const db = getDb();
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('backup_retention_days');
    const days = setting ? parseInt(setting.value, 10) : 30;
    return isNaN(days) ? 30 : days;
  }

  calculateChecksum(filePath) {
    const hash = crypto.createHash('sha256');
    const fileBuffer = fs.readFileSync(filePath);
    hash.update(fileBuffer);
    return hash.digest('hex');
  }

  verifyFileIntegrity(filePath) {
    try {
      const tempDb = new Database(filePath, { readonly: true });
      const row = tempDb.pragma('integrity_check');
      tempDb.close();
      const isOk = Array.isArray(row) ? row[0].integrity_check === 'ok' : row.integrity_check === 'ok';
      return isOk;
    } catch (e) {
      console.error('Integrity check failed:', e);
      return false;
    }
  }

  async createBackup(backupType = 'manual', userId = null) {
    const db = getDb();
    const backupDir = this.getBackupDirectory();
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const fileName = `kirana_pos_backup_${backupType}_${timestamp}.sqlite`;
    const targetPath = path.join(backupDir, fileName);

    const nowIso = now.toISOString();

    try {
      // Use better-sqlite3's native online backup API
      await db.backup(targetPath);

      // Verify backup integrity
      const isIntegrityOk = this.verifyFileIntegrity(targetPath);
      if (!isIntegrityOk) {
        throw new Error('Backup integrity verification failed on destination file!');
      }

      const stats = fs.statSync(targetPath);
      const checksum = this.calculateChecksum(targetPath);

      // Insert into backup_history
      db.prepare(`
        INSERT INTO backup_history (
          backup_file_name, backup_file_path, backup_size_bytes,
          backup_type, status, checksum_sha256, details, created_at
        ) VALUES (?, ?, ?, ?, 'success', ?, 'Integrity check passed (OK)', ?)
      `).run(
        fileName,
        targetPath,
        stats.size,
        backupType,
        checksum,
        nowIso
      );

      // Audit Log
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, 'backup', ?, ?, ?)
      `).run(
        userId,
        AUDIT_ACTIONS.BACKUP_CREATE,
        fileName,
        JSON.stringify({ type: backupType, size: stats.size, checksum }),
        nowIso
      );

      // Clean old backups according to retention policy
      this.cleanupOldBackups();

      return {
        success: true,
        file_name: fileName,
        file_path: targetPath,
        size_bytes: stats.size,
        checksum,
      };
    } catch (err) {
      console.error('Backup creation error:', err);

      try {
        db.prepare(`
          INSERT INTO backup_history (
            backup_file_name, backup_file_path, backup_size_bytes,
            backup_type, status, details, created_at
          ) VALUES (?, ?, 0, ?, 'failed', ?, ?)
        `).run(
          fileName,
          targetPath,
          backupType,
          err.message,
          nowIso
        );
      } catch (logErr) {
        // Ignored
      }

      throw err;
    }
  }

  cleanupOldBackups() {
    try {
      const backupDir = this.getBackupDirectory();
      const retentionDays = this.getRetentionDays();
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

      const files = fs.readdirSync(backupDir);
      for (const file of files) {
        if (file.startsWith('kirana_pos_backup_') && file.endsWith('.sqlite')) {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          if (stats.mtimeMs < cutoffTime) {
            fs.unlinkSync(filePath);
            console.log(`Pruned old backup file beyond ${retentionDays} days: ${file}`);
          }
        }
      }
    } catch (e) {
      console.warn('Backup cleanup error:', e.message);
    }
  }

  getBackupHistory(limit = 20) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM backup_history
      ORDER BY id DESC LIMIT ?
    `).all(limit);
  }

  async restoreDatabase(sourceBackupPath, userId = null) {
    if (!fs.existsSync(sourceBackupPath)) {
      throw new Error(`Backup file not found: ${sourceBackupPath}`);
    }

    // 1. Verify source backup file integrity before touching anything
    const isIntegrityOk = this.verifyFileIntegrity(sourceBackupPath);
    if (!isIntegrityOk) {
      throw new Error('Integrity check failed on backup file! Restoration aborted to prevent data corruption.');
    }

    // 2. Create automatic pre-restore backup of the current state
    try {
      await this.createBackup('pre_restore', userId);
    } catch (e) {
      console.warn('Could not create pre-restore backup:', e.message);
    }

    const currentDbPath = getDbPath();

    // 3. Close database connection
    closeDb();

    // 4. Overwrite main database file safely
    fs.copyFileSync(sourceBackupPath, currentDbPath);

    // Remove obsolete WAL and SHM files to force clean startup from new DB
    const wal = currentDbPath + '-wal';
    const shm = currentDbPath + '-shm';
    if (fs.existsSync(wal)) fs.unlinkSync(wal);
    if (fs.existsSync(shm)) fs.unlinkSync(shm);

    // 5. Reinitialize DB connection
    const newDb = initDb(currentDbPath);

    // 6. Record audit log on new restored DB
    const nowIso = new Date().toISOString();
    newDb.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, 'database', 'restored', ?, ?)
    `).run(
      userId,
      AUDIT_ACTIONS.BACKUP_RESTORE,
      JSON.stringify({ restored_from: sourceBackupPath }),
      nowIso
    );

    return {
      success: true,
      message: 'Database restored and verified successfully!',
    };
  }
}

module.exports = new BackupService();
