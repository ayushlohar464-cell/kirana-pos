/**
 * Purchase Management Service
 */
const { getDb, runInTransaction } = require('../database/connection');
const { STOCK_MOVEMENT_TYPES, AUDIT_ACTIONS } = require('../shared/constants');
const { purchaseCreateSchema } = require('../validation/schemas');

class PurchaseService {
  createPurchase(purchaseData, userId) {
    const validated = purchaseCreateSchema.parse(purchaseData);
    const db = getDb();
    const now = new Date().toISOString();

    return runInTransaction(() => {
      const supplier = db.prepare('SELECT id, name, current_balance FROM suppliers WHERE id = ?').get(validated.supplier_id);
      if (!supplier) throw new Error('Supplier not found.');

      // 1. Insert into purchases
      const result = db.prepare(`
        INSERT INTO purchases (
          purchase_invoice_no, supplier_id, user_id, subtotal, discount_amount,
          tax_amount, grand_total, paid_amount, balance_due, purchase_date,
          status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)
      `).run(
        validated.purchase_invoice_no,
        validated.supplier_id,
        userId,
        validated.subtotal,
        validated.discount_amount,
        validated.tax_amount,
        validated.grand_total,
        validated.paid_amount,
        validated.balance_due,
        validated.purchase_date,
        validated.notes || '',
        now
      );

      const purchaseId = Number(result.lastInsertRowid);

      // 2. Insert items and increase stock
      const insertItemStmt = db.prepare(`
        INSERT INTO purchase_items (
          purchase_id, product_id, quantity, unit_cost, tax_rate, tax_amount, total_cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const getProd = db.prepare('SELECT id, current_stock, purchase_cost FROM products WHERE id = ?');
      const updateProd = db.prepare('UPDATE products SET current_stock = ?, purchase_cost = ?, updated_at = ? WHERE id = ?');
      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (
          product_id, movement_type, quantity_change, resulting_stock,
          reference_type, reference_id, reason, user_id, created_at
        ) VALUES (?, ?, ?, ?, 'purchase', ?, ?, ?, ?)
      `);

      for (const item of validated.items) {
        insertItemStmt.run(
          purchaseId,
          item.product_id,
          item.quantity,
          item.unit_cost,
          item.tax_rate,
          item.tax_amount,
          item.total_cost
        );

        const prod = getProd.get(item.product_id);
        if (prod) {
          const newStock = Math.round((prod.current_stock + item.quantity) * 1000) / 1000;
          // Update current stock and latest purchase cost
          updateProd.run(newStock, item.unit_cost, now, prod.id);

          insertMovement.run(
            prod.id,
            STOCK_MOVEMENT_TYPES.PURCHASE,
            item.quantity,
            newStock,
            purchaseId,
            `Purchase Invoice ${validated.purchase_invoice_no}`,
            userId,
            now
          );
        }
      }

      // 3. Payment record if paid_amount > 0
      if (validated.paid_amount > 0) {
        db.prepare(`
          INSERT INTO payments (
            reference_type, reference_id, customer_id, supplier_id,
            payment_mode, amount, transaction_reference, user_id, payment_date, notes
          ) VALUES ('purchase', ?, NULL, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          purchaseId,
          validated.supplier_id,
          validated.payment_mode,
          validated.paid_amount,
          validated.payment_reference || '',
          userId,
          validated.purchase_date,
          `Payment for purchase ${validated.purchase_invoice_no}`
        );
      }

      // 4. Update supplier balance & ledger if balance_due > 0
      if (validated.balance_due > 0) {
        const newBalance = supplier.current_balance + validated.balance_due;
        db.prepare('UPDATE suppliers SET current_balance = ?, updated_at = ? WHERE id = ?').run(
          newBalance,
          now,
          supplier.id
        );

        db.prepare(`
          INSERT INTO supplier_ledger (
            supplier_id, entry_type, amount, running_balance,
            reference_type, reference_id, description, user_id, created_at
          ) VALUES (?, 'credit', ?, ?, 'purchase', ?, ?, ?, ?)
        `).run(
          supplier.id,
          validated.balance_due,
          newBalance,
          purchaseId,
          `Credit purchase invoice ${validated.purchase_invoice_no}`,
          userId,
          now
        );
      }

      // 5. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, 'purchase', ?, ?, ?)
      `).run(
        userId,
        AUDIT_ACTIONS.PURCHASE_CREATE,
        String(purchaseId),
        JSON.stringify({
          invoice: validated.purchase_invoice_no,
          supplier: supplier.name,
          grand_total: validated.grand_total,
          balance_due: validated.balance_due,
        }),
        now
      );

      return this.getPurchaseById(purchaseId);
    });
  }

  getPurchasesList({ from_date = null, to_date = null, supplier_id = null, limit = 50, offset = 0 } = {}) {
    const db = getDb();
    const conditions = [];
    const params = [];

    if (from_date) {
      conditions.push('p.purchase_date >= ?');
      params.push(from_date);
    }
    if (to_date) {
      conditions.push('p.purchase_date <= ?');
      params.push(to_date);
    }
    if (supplier_id) {
      conditions.push('p.supplier_id = ?');
      params.push(supplier_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT p.*, s.name as supplier_name, s.company_name, u.username as recorded_by,
             (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) as item_count
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      JOIN users u ON p.user_id = u.id
      ${whereClause}
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    return db.prepare(sql).all(...params);
  }

  getPurchaseById(id) {
    const db = getDb();
    const purchase = db.prepare(`
      SELECT p.*, s.name as supplier_name, s.company_name, s.phone as supplier_phone,
             s.gstin as supplier_gstin, u.username as recorded_by
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(id);

    if (!purchase) return null;

    const items = db.prepare(`
      SELECT pi.*, pr.name as product_name, pr.unit_code, pr.barcode
      FROM purchase_items pi
      JOIN products pr ON pi.product_id = pr.id
      WHERE pi.purchase_id = ?
    `).all(id);

    return {
      ...purchase,
      items,
    };
  }
}

module.exports = new PurchaseService();
