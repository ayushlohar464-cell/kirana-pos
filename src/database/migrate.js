/**
 * Database Migration & Seeding Runner
 */
const fs = require('fs');
const path = require('path');
const argon2 = require('@node-rs/argon2');
const { getDb } = require('./connection');
const { DEFAULT_SETTINGS, ROLES } = require('../shared/constants');

async function runMigrations() {
  const db = getDb();

  // Ensure schema_migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const getMigrationStmt = db.prepare('SELECT id FROM schema_migrations WHERE migration_name = ?');
  const insertMigrationStmt = db.prepare('INSERT INTO schema_migrations (migration_name, applied_at) VALUES (?, ?)');

  for (const file of files) {
    const existing = getMigrationStmt.get(file);
    if (!existing) {
      console.log(`Applying migration: ${file}...`);
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      
      const applyTx = db.transaction(() => {
        db.exec(sqlContent);
        insertMigrationStmt.run(file, new Date().toISOString());
      });
      applyTx();
      console.log(`Migration applied successfully: ${file}`);
    }
  }

  // Seed default data
  await seedDefaults(db);
}

async function seedDefaults(db) {
  // 1. Seed Units
  const checkUnits = db.prepare('SELECT COUNT(*) as count FROM product_units').get();
  if (checkUnits.count === 0) {
    const insertUnit = db.prepare(`
      INSERT INTO product_units (name, short_code, allow_decimal, base_unit_code, conversion_factor)
      VALUES (?, ?, ?, ?, ?)
    `);

    const defaultUnits = [
      ['Piece', 'pcs', 0, null, 1.0],
      ['Packet', 'pkt', 0, null, 1.0],
      ['Kilogram', 'kg', 1, 'g', 1000.0],
      ['Gram', 'g', 1, null, 1.0],
      ['Litre', 'l', 1, 'ml', 1000.0],
      ['Millilitre', 'ml', 1, null, 1.0],
      ['Box', 'box', 0, null, 1.0],
      ['Dozen', 'dozen', 0, 'pcs', 12.0],
    ];

    const seedUnitsTx = db.transaction(() => {
      for (const u of defaultUnits) {
        insertUnit.run(...u);
      }
    });
    seedUnitsTx();
  }

  // 2. Seed Categories
  const checkCats = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (checkCats.count === 0) {
    const insertCat = db.prepare(`
      INSERT INTO categories (name, description, is_active, created_at)
      VALUES (?, ?, 1, ?)
    `);

    const defaultCategories = [
      ['Grains & Flours', 'Atta, Rice, Besan, Maida, Suji, etc.'],
      ['Pulses & Dals', 'Toor, Moong, Chana, Urad, Masoor, etc.'],
      ['Edible Oils & Ghee', 'Mustard oil, Sunflower oil, Desi Ghee, etc.'],
      ['Spices & Masalas', 'Turmeric, Chilli, Coriander, Garam Masala, Whole Spices'],
      ['Sugar, Salt & Jaggery', 'Sugar, Sea Salt, Rock Salt, Gur, etc.'],
      ['Snacks & Biscuits', 'Biscuits, Namkeen, Chips, Chocolates'],
      ['Beverages & Tea/Coffee', 'Tea leaves, Coffee, Cold drinks, Juices'],
      ['Dairy & Bakery', 'Milk, Butter, Paneer, Bread, Toast, Khari'],
      ['Cleaning & Household', 'Detergent, Dishwash, Soaps, Broom, Floor Cleaner'],
      ['Personal Care', 'Shampoo, Toothpaste, Bath Soaps, Hair Oil'],
    ];

    const now = new Date().toISOString();
    const seedCatsTx = db.transaction(() => {
      for (const [name, desc] of defaultCategories) {
        insertCat.run(name, desc, now);
      }
    });
    seedCatsTx();
  }

  // 3. Seed Settings
  const checkSetting = db.prepare('SELECT key FROM settings WHERE key = ?');
  const insertSetting = db.prepare(`
    INSERT INTO settings (key, value, category, updated_at)
    VALUES (?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  const seedSettingsTx = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (!checkSetting.get(key)) {
        let category = 'shop';
        if (key.startsWith('printer_')) category = 'printer';
        else if (key.startsWith('backup_') || key.startsWith('auto_backup_') || key.startsWith('cloud_')) category = 'backup';
        insertSetting.run(key, value, category, now);
      }
    }
  });
  seedSettingsTx();

  // 4. Seed Default Users if none exist
  const checkUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (checkUsers.count === 0) {
    const adminHash = await argon2.hash('admin123', {
      algorithm: argon2.Algorithm.Argon2id,
    });
    const cashierHash = await argon2.hash('cashier123', {
      algorithm: argon2.Algorithm.Argon2id,
    });

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `);

    const seedUsersTx = db.transaction(() => {
      insertUser.run('admin', adminHash, 'दुकान मालक (पप्पा)', ROLES.OWNER, now, now);
      insertUser.run('cashier', cashierHash, 'कॅशियर (मदतनीस)', ROLES.CASHIER, now, now);
    });
    seedUsersTx();
    console.log('Seeded default accounts: admin (password: admin123) and cashier (password: cashier123)');
  }
}

module.exports = {
  runMigrations,
};
