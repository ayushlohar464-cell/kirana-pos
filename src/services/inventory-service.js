/**
 * Inventory & Product Management Service
 */
const { getDb, runInTransaction } = require('../database/connection');
const { STOCK_MOVEMENT_TYPES, AUDIT_ACTIONS } = require('../shared/constants');
const { productSchema, stockAdjustmentSchema, categorySchema } = require('../validation/schemas');

class InventoryService {
  getCategories() {
    const db = getDb();
    return db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  }

  saveCategory(data) {
    const validated = categorySchema.parse(data);
    const db = getDb();
    const now = new Date().toISOString();

    if (validated.id) {
      db.prepare(`
        UPDATE categories SET name = ?, description = ? WHERE id = ?
      `).run(validated.name, validated.description || '', validated.id);
      return { id: validated.id, name: validated.name };
    } else {
      const result = db.prepare(`
        INSERT INTO categories (name, description, is_active, created_at)
        VALUES (?, ?, 1, ?)
      `).run(validated.name, validated.description || '', now);
      return { id: Number(result.lastInsertRowid), name: validated.name };
    }
  }

  getUnits() {
    const db = getDb();
    return db.prepare('SELECT * FROM product_units ORDER BY name ASC').all();
  }

  getProducts({ query = '', category_id = null, active_only = true, limit = 100, offset = 0 } = {}) {
    const db = getDb();
    const conditions = [];
    const params = [];

    if (active_only) {
      conditions.push('p.is_active = 1');
    }

    if (category_id) {
      conditions.push('p.category_id = ?');
      params.push(category_id);
    }

    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      conditions.push('(p.name LIKE ? OR p.name_regional LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)');
      params.push(q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT p.*, c.name as category_name, u.name as unit_name, u.allow_decimal
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_units u ON p.unit_code = u.short_code
      ${whereClause}
      ORDER BY p.name ASC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    return db.prepare(sql).all(...params);
  }

  getProductById(id) {
    const db = getDb();
    return db.prepare(`
      SELECT p.*, c.name as category_name, u.name as unit_name, u.allow_decimal
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_units u ON p.unit_code = u.short_code
      WHERE p.id = ?
    `).get(id);
  }

  getProductByBarcode(barcode) {
    if (!barcode) return null;
    const db = getDb();
    return db.prepare(`
      SELECT p.*, c.name as category_name, u.name as unit_name, u.allow_decimal
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_units u ON p.unit_code = u.short_code
      WHERE (p.barcode = ? OR p.sku = ?) AND p.is_active = 1
    `).get(barcode.trim(), barcode.trim());
  }

  saveProduct(data, userId) {
    const validated = productSchema.parse(data);
    const db = getDb();
    const now = new Date().toISOString();

    return runInTransaction(() => {
      if (validated.id) {
        // Update product
        const oldProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(validated.id);
        if (!oldProduct) {
          throw new Error('Product not found.');
        }

        db.prepare(`
          UPDATE products
          SET category_id = ?, name = ?, name_regional = ?, sku = ?, barcode = ?,
              unit_code = ?, purchase_cost = ?, selling_price = ?, mrp = ?,
              tax_rate = ?, min_stock_alert = ?, is_active = ?, updated_at = ?
          WHERE id = ?
        `).run(
          validated.category_id || null,
          validated.name,
          validated.name_regional || '',
          validated.sku || null,
          validated.barcode || null,
          validated.unit_code,
          validated.purchase_cost,
          validated.selling_price,
          validated.mrp || 0,
          validated.tax_rate || 0,
          validated.min_stock_alert,
          validated.is_active,
          now,
          validated.id
        );

        // Audit log
        db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
          VALUES (?, ?, 'product', ?, ?, ?)
        `).run(
          userId,
          AUDIT_ACTIONS.PRODUCT_UPDATE,
          String(validated.id),
          JSON.stringify({ name: validated.name, selling_price: validated.selling_price }),
          now
        );

        return this.getProductById(validated.id);
      } else {
        // Create new product
        const result = db.prepare(`
          INSERT INTO products (
            category_id, name, name_regional, sku, barcode, unit_code,
            purchase_cost, selling_price, mrp, tax_rate, current_stock,
            min_stock_alert, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          validated.category_id || null,
          validated.name,
          validated.name_regional || '',
          validated.sku || null,
          validated.barcode || null,
          validated.unit_code,
          validated.purchase_cost,
          validated.selling_price,
          validated.mrp || 0,
          validated.tax_rate || 0,
          validated.current_stock || 0,
          validated.min_stock_alert,
          validated.is_active,
          now,
          now
        );

        const newId = Number(result.lastInsertRowid);

        // If initial stock was provided, record an 'opening' stock movement
        if (validated.current_stock > 0) {
          db.prepare(`
            INSERT INTO stock_movements (
              product_id, movement_type, quantity_change, resulting_stock,
              reference_type, reference_id, reason, user_id, created_at
            ) VALUES (?, ?, ?, ?, 'opening_stock', ?, 'Initial opening stock', ?, ?)
          `).run(
            newId,
            STOCK_MOVEMENT_TYPES.OPENING,
            validated.current_stock,
            validated.current_stock,
            newId,
            userId,
            now
          );
        }

        // Audit log
        db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
          VALUES (?, ?, 'product', ?, ?, ?)
        `).run(
          userId,
          AUDIT_ACTIONS.PRODUCT_CREATE,
          String(newId),
          JSON.stringify({ name: validated.name, initial_stock: validated.current_stock }),
          now
        );

        return this.getProductById(newId);
      }
    });
  }

  toggleProductActive(id, userId) {
    const db = getDb();
    const product = db.prepare('SELECT id, is_active, name FROM products WHERE id = ?').get(id);
    if (!product) throw new Error('Product not found.');

    const newActive = product.is_active ? 0 : 1;
    const now = new Date().toISOString();

    db.prepare('UPDATE products SET is_active = ?, updated_at = ? WHERE id = ?').run(newActive, now, id);

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, 'PRODUCT_TOGGLE_ACTIVE', 'product', ?, ?, ?)
    `).run(userId, String(id), JSON.stringify({ is_active: newActive }), now);

    return { id, is_active: newActive };
  }

  adjustStock(data, userId) {
    const validated = stockAdjustmentSchema.parse(data);
    const db = getDb();
    const now = new Date().toISOString();

    return runInTransaction(() => {
      const product = db.prepare('SELECT id, name, current_stock FROM products WHERE id = ?').get(validated.product_id);
      if (!product) throw new Error('Product not found.');

      let qtyDelta = validated.quantity_change;
      // If adjustment_sub or wastage, ensure quantity change is negative
      if (validated.movement_type === STOCK_MOVEMENT_TYPES.ADJUSTMENT_SUB || validated.movement_type === STOCK_MOVEMENT_TYPES.WASTAGE) {
        qtyDelta = -Math.abs(qtyDelta);
      } else if (validated.movement_type === STOCK_MOVEMENT_TYPES.ADJUSTMENT_ADD) {
        qtyDelta = Math.abs(qtyDelta);
      }

      const newStock = Math.round((product.current_stock + qtyDelta) * 1000) / 1000;
      if (newStock < 0) {
        throw new Error(`Cannot reduce stock below zero. Current stock: ${product.current_stock}`);
      }

      // Update product current stock
      db.prepare('UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?').run(newStock, now, product.id);

      // Record movement
      db.prepare(`
        INSERT INTO stock_movements (
          product_id, movement_type, quantity_change, resulting_stock,
          reference_type, reference_id, reason, user_id, created_at
        ) VALUES (?, ?, ?, ?, 'stock_adjustment', ?, ?, ?, ?)
      `).run(
        product.id,
        validated.movement_type,
        qtyDelta,
        newStock,
        product.id,
        validated.reason,
        userId,
        now
      );

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, 'stock', ?, ?, ?)
      `).run(
        userId,
        AUDIT_ACTIONS.STOCK_ADJUST,
        String(product.id),
        JSON.stringify({
          product_name: product.name,
          delta: qtyDelta,
          oldStock: product.current_stock,
          newStock,
          reason: validated.reason,
        }),
        now
      );

      return {
        product_id: product.id,
        product_name: product.name,
        old_stock: product.current_stock,
        new_stock: newStock,
        quantity_change: qtyDelta,
      };
    });
  }

  getStockMovements({ product_id = null, limit = 50, offset = 0 } = {}) {
    const db = getDb();
    let sql = `
      SELECT sm.*, p.name as product_name, p.unit_code, u.username
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.user_id = u.id
    `;
    const params = [];

    if (product_id) {
      sql += ' WHERE sm.product_id = ?';
      params.push(product_id);
    }

    sql += ' ORDER BY sm.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return db.prepare(sql).all(...params);
  }

  getLowStockAlerts() {
    const db = getDb();
    return db.prepare(`
      SELECT p.*, c.name as category_name, u.name as unit_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_units u ON p.unit_code = u.short_code
      WHERE p.is_active = 1 AND p.current_stock <= p.min_stock_alert
      ORDER BY p.current_stock ASC
    `).all();
  }
}

module.exports = new InventoryService();
