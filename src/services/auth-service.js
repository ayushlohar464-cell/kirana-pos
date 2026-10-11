/**
 * Authentication and User Management Service
 * Password hashing: Argon2id
 */
const argon2 = require('@node-rs/argon2');
const { getDb } = require('../database/connection');
const { ROLES, AUDIT_ACTIONS } = require('../shared/constants');
const { loginSchema, userCreateSchema, userUpdateSchema } = require('../validation/schemas');

class AuthService {
  async hashPassword(password) {
    return argon2.hash(password, {
      algorithm: argon2.Algorithm.Argon2id,
      memoryCost: 16384, // 16 MB
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verifyPassword(hash, password) {
    try {
      return await argon2.verify(hash, password);
    } catch (err) {
      console.error('Argon2 verify error:', err);
      return false;
    }
  }

  async login(username, password) {
    const validated = loginSchema.parse({ username, password });
    const db = getDb();
    
    const user = db.prepare(`
      SELECT id, username, password_hash, full_name, role, is_active
      FROM users
      WHERE username = ? COLLATE NOCASE
    `).get(validated.username);

    if (!user) {
      throw new Error('Invalid username or password');
    }

    if (!user.is_active) {
      throw new Error('This user account has been deactivated. Contact the store owner.');
    }

    const isValid = await this.verifyPassword(user.password_hash, validated.password);
    if (!isValid) {
      throw new Error('Invalid username or password');
    }

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, 'user', ?, ?, ?)
    `).run(
      user.id,
      AUDIT_ACTIONS.LOGIN,
      String(user.id),
      JSON.stringify({ username: user.username, role: user.role }),
      new Date().toISOString()
    );

    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    };
  }

  async createUser(userData, actorUserId) {
    const validated = userCreateSchema.parse(userData);
    const db = getDb();

    const existing = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(validated.username);
    if (existing) {
      throw new Error(`Username "${validated.username}" already exists.`);
    }

    const hash = await this.hashPassword(validated.password);
    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(validated.username, hash, validated.full_name, validated.role, now, now);

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, 'USER_CREATE', 'user', ?, ?, ?)
    `).run(
      actorUserId,
      String(result.lastInsertRowid),
      JSON.stringify({ username: validated.username, role: validated.role }),
      now
    );

    return {
      id: Number(result.lastInsertRowid),
      username: validated.username,
      full_name: validated.full_name,
      role: validated.role,
      is_active: 1,
    };
  }

  async updateUser(userData, actorUserId) {
    const validated = userUpdateSchema.parse(userData);
    const db = getDb();
    const now = new Date().toISOString();

    const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(validated.id);
    if (!user) {
      throw new Error('User not found.');
    }

    let passwordHash = null;
    if (validated.password) {
      passwordHash = await this.hashPassword(validated.password);
    }

    const fields = ['updated_at = ?'];
    const params = [now];

    if (validated.full_name !== undefined) {
      fields.push('full_name = ?');
      params.push(validated.full_name);
    }
    if (validated.role !== undefined) {
      fields.push('role = ?');
      params.push(validated.role);
    }
    if (validated.is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(validated.is_active);
    }
    if (passwordHash) {
      fields.push('password_hash = ?');
      params.push(passwordHash);
    }

    params.push(validated.id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, 'USER_UPDATE', 'user', ?, ?, ?)
    `).run(
      actorUserId,
      String(validated.id),
      JSON.stringify({ updated_fields: Object.keys(userData) }),
      now
    );

    return { success: true };
  }

  listUsers() {
    const db = getDb();
    return db.prepare(`
      SELECT id, username, full_name, role, is_active, created_at, updated_at
      FROM users
      ORDER BY id ASC
    `).all();
  }
}

module.exports = new AuthService();
