/**
 * Database Connection Manager (better-sqlite3)
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dbInstance = null;
let customDbPath = null;

function setCustomDbPath(p) {
  customDbPath = p;
}

function resolveDbDirectory() {
  if (customDbPath) {
    return path.dirname(customDbPath);
  }
  
  // Check if electron is available
  try {
    const { app } = require('electron');
    if (app && app.getPath) {
      return path.join(app.getPath('userData'), 'database');
    }
  } catch (e) {
    // Electron not loaded (e.g. running unit tests)
  }

  // Fallback to local data directory
  const localDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  return localDir;
}

function getDbPath() {
  if (customDbPath) {
    return customDbPath;
  }
  const dir = resolveDbDirectory();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'kirana_pos.db');
}

function initDb(overridePath = null) {
  if (overridePath) {
    customDbPath = overridePath;
  }
  if (dbInstance) {
    return dbInstance;
  }

  const dbFilePath = getDbPath();
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new Database(dbFilePath, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : null,
  });

  // Enable WAL (Write-Ahead Logging) for superior concurrent read/write and crash recovery
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('busy_timeout = 5000');
  dbInstance.pragma('synchronous = NORMAL');

  return dbInstance;
}

function getDb() {
  if (!dbInstance) {
    return initDb();
  }
  return dbInstance;
}

function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
      console.error('Error closing database:', e);
    }
    dbInstance = null;
  }
}

/**
 * Execute a callback within an immediate transaction
 */
function runInTransaction(fn) {
  const db = getDb();
  return db.transaction(fn)();
}

module.exports = {
  getDb,
  initDb,
  closeDb,
  getDbPath,
  setCustomDbPath,
  runInTransaction,
};
