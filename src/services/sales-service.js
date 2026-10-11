/**
 * Sales, Billing, and Returns Service
 * Implements atomic transactions, integer paise calculations, and stock ledgers.
 */
const { getDb, runInTransaction } = require('../database/connection');
const { SALE_STATUS, STOCK_MOVEMENT_TYPES, AUDIT_ACTIONS, PAYMENT_MODES } = require('../shared/constants');
const { saleCreateSchema, saleReturnSchema } = require('../validation/schemas');

class SalesService {
  generateInvoiceNumber() {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const prefix = `INV-${today}-`;

    const lastSale = db.prepare(`
      SELECT invoice_number FROM sales
      WHERE invoice_number LIKE ?
      ORDER BY id DESC LIMIT 1
    `).get(`${prefix}%`);

    let nextSeq = 1;
    if (lastSale && lastSale.invoice_number) {
      const parts = lastSale.invoice_number.split('-');
      if (parts.length === 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq)) nextSeq = seq + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  generateReturnNumber() {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `RET-${today}-`;

    const lastReturn = db.prepare(`
      SELECT return_number FROM returns
      WHERE return_number LIKE ?
      ORDER BY id DESC LIMIT 1
    `).get(`${prefix}%`);

    let nextSeq = 1;
    if (lastReturn && lastReturn.return_number) {
      const parts = lastReturn.return_number.split('-');
      if (parts.length === 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq)) nextSeq = seq + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  createSale(saleData, userId) {
    const validated = saleCreateSchema.parse(saleData);
    const db = getDb();
    const now = new Date().toISOString();
    const invoiceNumber = this.generateInvoiceNumber();

    return runInTransaction(() => {
      // Validate customer if credit amount > 0
      let customer = null;
      if (validated.credit_amount > 0) {
        if (!validated.customer_id) {
          throw new Error('Credit (Udhar) sale requires a selected customer.');
        }
        customer = db.prepare('SELECT id, name, credit_limit, current_balance FROM customers WHERE id = ?').get(validated.customer_id);
        if (!customer) {
          throw new Error('Selected customer not found.');
        }
        if (customer.credit_limit > 0 && (customer.current_balance + validated.credit_amount) > customer.credit_limit) {
          throw new Error(`Credit limit exceeded! Customer limit: ₹${(customer.credit_limit / 100).toFixed(2)}, Current Udhar: ₹${(customer.current_balance / 100).toFixed(2)}`);
        }
      }

      // 1. Insert into sales
      const saleResult = db.prepare(`
        INSERT INTO sales (
          invoice_number, customer_id, user_id, subtotal, discount_amount,
          tax_amount, round_off, grand_total, paid_amount, credit_amount,
          status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoiceNumber,
        validated.customer_id || null,
        userId,
        validated.subtotal,
        validated.discount_amount,
        validated.tax_amount,
        validated.round_off,
        validated.grand_total,
        validated.paid_amount,
        validated.credit_amount,
        SALE_STATUS.COMPLETED,
        validated.notes || '',
        now,
        now
      );

      const saleId = Number(saleResult.lastInsertRowid);

      // 2. Insert items and update product stock
      const insertItemStmt = db.prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, product_name, unit_code, quantity,
          unit_price, discount_amount, tax_rate, tax_amount, total_price, returned_quantity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0)
      `);

      const getProductStmt = db.prepare('SELECT id, name, current_stock FROM products WHERE id = ?');
      const updateStockStmt = db.prepare('UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?');
      const insertMovementStmt = db.prepare(`
        INSERT INTO stock_movements (
          product_id, movement_type, quantity_change, resulting_stock,
          reference_type, reference_id, reason, user_id, created_at
        ) VALUES (?, ?, ?, ?, 'sale', ?, ?, ?, ?)
      `);

      for (const item of validated.items) {
        insertItemStmt.run(
          saleId,
          item.product_id,
          item.product_name,
          item.unit_code,
          item.quantity,
          item.unit_price,
          item.discount_amount,
          item.tax_rate,
          item.tax_amount,
          item.total_price
        );

        const prod = getProductStmt.get(item.product_id);
        if (prod) {
          const newStock = Math.round((prod.current_stock - item.quantity) * 1000) / 1000;
          updateStockStmt.run(newStock, now, prod.id);

          insertMovementStmt.run(
            prod.id,
            STOCK_MOVEMENT_TYPES.SALE,
            -item.quantity,
            newStock,
            saleId,
            `Sale Invoice ${invoiceNumber}`,
            userId,
            now
          );
        }
      }

      // 3. Record payment if paid_amount > 0
      if (validated.paid_amount > 0) {
        db.prepare(`
          INSERT INTO payments (
            reference_type, reference_id, customer_id, supplier_id,
            payment_mode, amount, transaction_reference, user_id, payment_date, notes
          ) VALUES ('sale', ?, ?, NULL, ?, ?, ?, ?, ?, ?)
        `).run(
          saleId,
          validated.customer_id || null,
          validated.payment_mode,
          validated.paid_amount,
          validated.payment_reference || '',
          userId,
          now.slice(0, 10),
          `Payment for ${invoiceNumber}`
        );
      }

      // 4. Update customer Udhar ledger if credit_amount > 0
      if (validated.credit_amount > 0 && customer) {
        const newBalance = customer.current_balance + validated.credit_amount;
        db.prepare('UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?').run(
          newBalance,
          now,
          customer.id
        );

        db.prepare(`
          INSERT INTO customer_ledger (
            customer_id, entry_type, amount, running_balance,
            reference_type, reference_id, description, user_id, created_at
          ) VALUES (?, 'debit', ?, ?, 'sale', ?, ?, ?, ?)
        `).run(
          customer.id,
          validated.credit_amount,
          newBalance,
          saleId,
          `Udhar sale on invoice ${invoiceNumber}`,
          userId,
          now
        );
      }

      // 5. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, 'sale', ?, ?, ?)
      `).run(
        userId,
        AUDIT_ACTIONS.SALE_CREATE,
        String(saleId),
        JSON.stringify({
          invoice_number: invoiceNumber,
          grand_total: validated.grand_total,
          item_count: validated.items.length,
          payment_mode: validated.payment_mode,
          credit_amount: validated.credit_amount,
        }),
        now
      );

      return this.getSaleById(saleId);
    });
  }

  getSaleById(id) {
    const db = getDb();
    const sale = db.prepare(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone, u.username, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(id);

    if (!sale) return null;

    const items = db.prepare(`
      SELECT si.*, p.barcode, p.sku
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
      ORDER BY si.id ASC
    `).all(id);

    const payments = db.prepare(`
      SELECT * FROM payments
      WHERE reference_type = 'sale' AND reference_id = ?
      ORDER BY id ASC
    `).all(id);

    return {
      ...sale,
      items,
      payments,
    };
  }

  getSaleByInvoice(invoiceNumber) {
    const db = getDb();
    const sale = db.prepare('SELECT id FROM sales WHERE invoice_number = ?').get(invoiceNumber);
    if (!sale) return null;
    return this.getSaleById(sale.id);
  }

  getSalesList({ from_date = null, to_date = null, customer_id = null, status = null, limit = 50, offset = 0 } = {}) {
    const db = getDb();
    const conditions = [];
    const params = [];

    if (from_date) {
      conditions.push('s.created_at >= ?');
      params.push(`${from_date}T00:00:00.000Z`);
    }
    if (to_date) {
      conditions.push('s.created_at <= ?');
      params.push(`${to_date}T23:59:59.999Z`);
    }
    if (customer_id) {
      conditions.push('s.customer_id = ?');
      params.push(customer_id);
    }
    if (status) {
      conditions.push('s.status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT s.*, c.name as customer_name, u.username as cashier_username,
             (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      ${whereClause}
      ORDER BY s.id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    return db.prepare(sql).all(...params);
  }

  processSaleReturn(returnData, userId) {
    const validated = saleReturnSchema.parse(returnData);
    const db = getDb();
    const now = new Date().toISOString();
    const returnNumber = this.generateReturnNumber();

    return runInTransaction(() => {
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(validated.sale_id);
      if (!sale) throw new Error('Sale not found.');
      if (sale.status === SALE_STATUS.CANCELLED) {
        throw new Error('Cannot process return on a cancelled sale.');
      }

      // 1. Insert into returns table
      const retResult = db.prepare(`
        INSERT INTO returns (
          return_number, sale_id, customer_id, total_refund_amount,
          refund_mode, reason, user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        returnNumber,
        sale.id,
        validated.customer_id || sale.customer_id || null,
        validated.total_refund_amount,
        validated.refund_mode,
        validated.reason,
        userId,
        now
      );

      const returnId = Number(retResult.lastInsertRowid);

      // 2. Insert items and restock if condition is 'restockable'
      const insertReturnItem = db.prepare(`
        INSERT INTO return_items (
          return_id, sale_item_id, product_id, quantity, refund_rate, subtotal, condition
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const updateSaleItemReturned = db.prepare(`
        UPDATE sale_items SET returned_quantity = returned_quantity + ? WHERE id = ?
      `);

      const getProd = db.prepare('SELECT id, current_stock FROM products WHERE id = ?');
      const updateProdStock = db.prepare('UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?');
      const insertStockMovement = db.prepare(`
        INSERT INTO stock_movements (
          product_id, movement_type, quantity_change, resulting_stock,
          reference_type, reference_id, reason, user_id, created_at
        ) VALUES (?, ?, ?, ?, 'sale_return', ?, ?, ?, ?)
      `);

      for (const item of validated.items) {
        const subtotal = Math.round(item.quantity * item.refund_rate);
        insertReturnItem.run(
          returnId,
          item.sale_item_id,
          item.product_id,
          item.quantity,
          item.refund_rate,
          subtotal,
          item.condition
        );

        updateSaleItemReturned.run(item.quantity, item.sale_item_id);

        const prod = getProd.get(item.product_id);
        if (prod) {
          if (item.condition === 'restockable') {
            const newStock = Math.round((prod.current_stock + item.quantity) * 1000) / 1000;
            updateProdStock.run(newStock, now, prod.id);

            insertStockMovement.run(
              prod.id,
              STOCK_MOVEMENT_TYPES.SALE_RETURN,
              item.quantity,
              newStock,
              returnId,
              `Return ${returnNumber} from sale ${sale.invoice_number}`,
              userId,
              now
            );
          } else {
            // Damaged/wasted
            insertStockMovement.run(
              prod.id,
              STOCK_MOVEMENT_TYPES.WASTAGE,
              0, // No stock added back
              prod.current_stock,
              returnId,
              `Damaged return ${returnNumber} (wasted)`,
              userId,
              now
            );
          }
        }
      }

      // 3. Handle refund finance
      const customerId = validated.customer_id || sale.customer_id;
      if (validated.refund_mode === PAYMENT_MODES.CREDIT && customerId) {
        // Reduce customer Udhar balance
        const customer = db.prepare('SELECT current_balance FROM customers WHERE id = ?').get(customerId);
        if (customer) {
          const newBal = customer.current_balance - validated.total_refund_amount;
          db.prepare('UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?').run(newBal, now, customerId);

          db.prepare(`
            INSERT INTO customer_ledger (
              customer_id, entry_type, amount, running_balance,
              reference_type, reference_id, description, user_id, created_at
            ) VALUES (?, 'credit', ?, ?, 'return', ?, ?, ?, ?)
          `).run(
            customerId,
            validated.total_refund_amount,
            newBal,
            returnId,
            `Udhar credit adjusted for return ${returnNumber}`,
            userId,
            now
          );
        }
      }

      // Update sale status
      db.prepare('UPDATE sales SET status = ?, updated_at = ? WHERE id = ?').run(
        SALE_STATUS.PARTIAL_RETURN,
        now,
        sale.id
      );

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, 'return', ?, ?, ?)
      `).run(
        userId,
        AUDIT_ACTIONS.SALE_RETURN,
        String(returnId),
        JSON.stringify({
          return_number: returnNumber,
          sale_invoice: sale.invoice_number,
          total_refund_amount: validated.total_refund_amount,
          refund_mode: validated.refund_mode,
        }),
        now
      );

      return {
        return_id: returnId,
        return_number: returnNumber,
        refund_amount: validated.total_refund_amount,
      };
    });
  }

  cancelSale(saleId, reason, userId) {
    const db = getDb();
    const now = new Date().toISOString();

    return runInTransaction(() => {
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
      if (!sale) throw new Error('Sale not found.');
      if (sale.status === SALE_STATUS.CANCELLED) throw new Error('Sale is already cancelled.');

      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);

      // 1. Revert stock
      for (const item of items) {
        const prod = db.prepare('SELECT id, current_stock FROM products WHERE id = ?').get(item.product_id);
        if (prod) {
          const revertQty = item.quantity - item.returned_quantity;
          if (revertQty > 0) {
            const newStock = Math.round((prod.current_stock + revertQty) * 1000) / 1000;
            db.prepare('UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?').run(newStock, now, prod.id);

            db.prepare(`
              INSERT INTO stock_movements (
                product_id, movement_type, quantity_change, resulting_stock,
                reference_type, reference_id, reason, user_id, created_at
              ) VALUES (?, 'adjustment_add', ?, ?, 'sale_cancel', ?, ?, ?, ?)
            `).run(
              prod.id,
              revertQty,
              newStock,
              sale.id,
              `Cancelled bill ${sale.invoice_number}: ${reason}`,
              userId,
              now
            );
          }
        }
      }

      // 2. Revert customer Udhar if applicable
      if (sale.credit_amount > 0 && sale.customer_id) {
        const customer = db.prepare('SELECT current_balance FROM customers WHERE id = ?').get(sale.customer_id);
        if (customer) {
          const newBal = customer.current_balance - sale.credit_amount;
          db.prepare('UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?').run(newBal, now, sale.customer_id);

          db.prepare(`
            INSERT INTO customer_ledger (
              customer_id, entry_type, amount, running_balance,
              reference_type, reference_id, description, user_id, created_at
            ) VALUES (?, 'credit', ?, ?, 'return', ?, ?, ?, ?)
          `).run(
            sale.customer_id,
            sale.credit_amount,
            newBal,
            sale.id,
            `Reverted Udhar for cancelled bill ${sale.invoice_number}`,
            userId,
            now
          );
        }
      }

      // 3. Update sale status
      db.prepare('UPDATE sales SET status = ?, notes = notes || ?, updated_at = ? WHERE id = ?').run(
        SALE_STATUS.CANCELLED,
        ` [CANCELLED: ${reason}]`,
        now,
        sale.id
      );

      // 4. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, 'sale', ?, ?, ?)
      `).run(
        userId,
        AUDIT_ACTIONS.BILL_CANCEL,
        String(sale.id),
        JSON.stringify({
          invoice_number: sale.invoice_number,
          reason,
          reverted_total: sale.grand_total,
        }),
        now
      );

      return { success: true, message: `Bill ${sale.invoice_number} cancelled and stock reverted successfully.` };
    });
  }
}

module.exports = new SalesService();
