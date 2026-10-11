/**
 * Accounts, Ledger, Payments, Expenses & Cash Sessions Service
 */
const { getDb, runInTransaction } = require('../database/connection');
const { AUDIT_ACTIONS, PAYMENT_MODES } = require('../shared/constants');
const {
  customerSchema,
  supplierSchema,
  partyPaymentSchema,
  expenseSchema,
  cashSessionOpenSchema,
  cashSessionCloseSchema,
} = require('../validation/schemas');

class PaymentService {
  // ==================== CUSTOMERS & UDHAR ====================

  getCustomers({ query = '', active_only = true } = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM customers';
    const conditions = [];
    const params = [];

    if (active_only) {
      conditions.push('is_active = 1');
    }
    if (query && query.trim()) {
      conditions.push('(name LIKE ? OR phone LIKE ?)');
      params.push(`%${query.trim()}%`, `%${query.trim()}%`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY name ASC';

    return db.prepare(sql).all(...params);
  }

  saveCustomer(data, userId) {
    const validated = customerSchema.parse(data);
    const db = getDb();
    const now = new Date().toISOString();

    if (validated.id) {
      db.prepare(`
        UPDATE customers
        SET name = ?, phone = ?, address = ?, credit_limit = ?, updated_at = ?
        WHERE id = ?
      `).run(
        validated.name,
        validated.phone || null,
        validated.address || '',
        validated.credit_limit || 0,
        now,
        validated.id
      );

      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, 'customer', ?, ?, ?)
      `).run(userId, AUDIT_ACTIONS.CUSTOMER_UPDATE, String(validated.id), JSON.stringify({ name: validated.name }), now);

      return db.prepare('SELECT * FROM customers WHERE id = ?').get(validated.id);
    } else {
      const result = db.prepare(`
        INSERT INTO customers (name, phone, address, credit_limit, current_balance, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, 1, ?, ?)
      `).run(
        validated.name,
        validated.phone || null,
        validated.address || '',
        validated.credit_limit || 0,
        now,
        now
      );

      const newId = Number(result.lastInsertRowid);
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, 'customer', ?, ?, ?)
      `).run(userId, AUDIT_ACTIONS.CUSTOMER_CREATE, String(newId), JSON.stringify({ name: validated.name }), now);

      return db.prepare('SELECT * FROM customers WHERE id = ?').get(newId);
    }
  }

  getCustomerLedger(customerId) {
    const db = getDb();
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    if (!customer) throw new Error('Customer not found.');

    const entries = db.prepare(`
      SELECT cl.*, u.username as recorded_by
      FROM customer_ledger cl
      LEFT JOIN users u ON cl.user_id = u.id
      WHERE cl.customer_id = ?
      ORDER BY cl.id DESC
    `).all(customerId);

    return {
      customer,
      entries,
    };
  }

  recordCustomerPayment(data, userId) {
    const validated = partyPaymentSchema.parse({ ...data, party_type: 'customer' });
    const db = getDb();
    const now = new Date().toISOString();
    const pDate = validated.payment_date || now.slice(0, 10);

    return runInTransaction(() => {
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(validated.party_id);
      if (!customer) throw new Error('Customer not found.');

      const newBalance = customer.current_balance - validated.amount;

      // 1. Update customer balance
      db.prepare('UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?').run(
        newBalance,
        now,
        customer.id
      );

      // 2. Insert payment record
      const payResult = db.prepare(`
        INSERT INTO payments (
          reference_type, reference_id, customer_id, supplier_id,
          payment_mode, amount, transaction_reference, user_id, payment_date, notes
        ) VALUES ('customer_credit', ?, ?, NULL, ?, ?, ?, ?, ?, ?)
      `).run(
        customer.id,
        customer.id,
        validated.payment_mode,
        validated.amount,
        validated.transaction_reference || '',
        userId,
        pDate,
        validated.notes || `Udhar repayment from ${customer.name}`
      );

      const paymentId = Number(payResult.lastInsertRowid);

      // 3. Insert customer ledger credit entry
      db.prepare(`
        INSERT INTO customer_ledger (
          customer_id, entry_type, amount, running_balance,
          reference_type, reference_id, description, user_id, created_at
        ) VALUES (?, 'credit', ?, ?, 'payment', ?, ?, ?, ?)
      `).run(
        customer.id,
        validated.amount,
        newBalance,
        paymentId,
        validated.notes || `Received Udhar payment via ${validated.payment_mode.toUpperCase()}`,
        userId,
        now
      );

      // 4. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, 'customer_payment', ?, ?, ?)
      `).run(
        userId,
        AUDIT_ACTIONS.CUSTOMER_PAYMENT,
        String(paymentId),
        JSON.stringify({
          customer_name: customer.name,
          amount: validated.amount,
          newBalance,
          payment_mode: validated.payment_mode,
        }),
        now
      );

      return {
        success: true,
        customer_id: customer.id,
        amount_paid: validated.amount,
        new_balance: newBalance,
      };
    });
  }

  // ==================== SUPPLIERS ====================

  getSuppliers({ query = '', active_only = true } = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM suppliers';
    const conditions = [];
    const params = [];

    if (active_only) {
      conditions.push('is_active = 1');
    }
    if (query && query.trim()) {
      conditions.push('(name LIKE ? OR company_name LIKE ? OR phone LIKE ?)');
      params.push(`%${query.trim()}%`, `%${query.trim()}%`, `%${query.trim()}%`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY name ASC';

    return db.prepare(sql).all(...params);
  }

  saveSupplier(data, userId) {
    const validated = supplierSchema.parse(data);
    const db = getDb();
    const now = new Date().toISOString();

    if (validated.id) {
      db.prepare(`
        UPDATE suppliers
        SET name = ?, company_name = ?, phone = ?, gstin = ?, address = ?, updated_at = ?
        WHERE id = ?
      `).run(
        validated.name,
        validated.company_name || '',
        validated.phone || '',
        validated.gstin || '',
        validated.address || '',
        now,
        validated.id
      );

      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, 'supplier', ?, ?, ?)
      `).run(userId, AUDIT_ACTIONS.SUPPLIER_UPDATE, String(validated.id), JSON.stringify({ name: validated.name }), now);

      return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(validated.id);
    } else {
      const result = db.prepare(`
        INSERT INTO suppliers (name, company_name, phone, gstin, address, current_balance, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)
      `).run(
        validated.name,
        validated.company_name || '',
        validated.phone || '',
        validated.gstin || '',
        validated.address || '',
        now,
        now
      );

      const newId = Number(result.lastInsertRowid);
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, 'supplier', ?, ?, ?)
      `).run(userId, AUDIT_ACTIONS.SUPPLIER_CREATE, String(newId), JSON.stringify({ name: validated.name }), now);

      return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(newId);
    }
  }

  getSupplierLedger(supplierId) {
    const db = getDb();
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId);
    if (!supplier) throw new Error('Supplier not found.');

    const entries = db.prepare(`
      SELECT sl.*, u.username as recorded_by
      FROM supplier_ledger sl
      LEFT JOIN users u ON sl.user_id = u.id
      WHERE sl.supplier_id = ?
      ORDER BY sl.id DESC
    `).all(supplierId);

    return {
      supplier,
      entries,
    };
  }

  recordSupplierPayment(data, userId) {
    const validated = partyPaymentSchema.parse({ ...data, party_type: 'supplier' });
    const db = getDb();
    const now = new Date().toISOString();
    const pDate = validated.payment_date || now.slice(0, 10);

    return runInTransaction(() => {
      const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(validated.party_id);
      if (!supplier) throw new Error('Supplier not found.');

      const newBalance = supplier.current_balance - validated.amount;

      // 1. Update supplier balance
      db.prepare('UPDATE suppliers SET current_balance = ?, updated_at = ? WHERE id = ?').run(
        newBalance,
        now,
        supplier.id
      );

      // 2. Insert payment record
      const payResult = db.prepare(`
        INSERT INTO payments (
          reference_type, reference_id, customer_id, supplier_id,
          payment_mode, amount, transaction_reference, user_id, payment_date, notes
        ) VALUES ('supplier_payment', ?, NULL, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        supplier.id,
        supplier.id,
        validated.payment_mode,
        validated.amount,
        validated.transaction_reference || '',
        userId,
        pDate,
        validated.notes || `Payment made to supplier ${supplier.name}`
      );

      const paymentId = Number(payResult.lastInsertRowid);

      // 3. Insert supplier ledger debit entry
      db.prepare(`
        INSERT INTO supplier_ledger (
          supplier_id, entry_type, amount, running_balance,
          reference_type, reference_id, description, user_id, created_at
        ) VALUES (?, 'debit', ?, ?, 'payment', ?, ?, ?, ?)
      `).run(
        supplier.id,
        validated.amount,
        newBalance,
        paymentId,
        validated.notes || `Paid supplier via ${validated.payment_mode.toUpperCase()}`,
        userId,
        now
      );

      // 4. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, 'supplier_payment', ?, ?, ?)
      `).run(
        userId,
        AUDIT_ACTIONS.SUPPLIER_PAYMENT,
        String(paymentId),
        JSON.stringify({
          supplier_name: supplier.name,
          amount: validated.amount,
          newBalance,
          payment_mode: validated.payment_mode,
        }),
        now
      );

      return {
        success: true,
        supplier_id: supplier.id,
        amount_paid: validated.amount,
        new_balance: newBalance,
      };
    });
  }

  // ==================== EXPENSES ====================

  getExpenses({ from_date = null, to_date = null, category = null, limit = 100, offset = 0 } = {}) {
    const db = getDb();
    let sql = `
      SELECT e.*, u.username as recorded_by
      FROM expenses e
      JOIN users u ON e.user_id = u.id
    `;
    const conditions = [];
    const params = [];

    if (from_date) {
      conditions.push('e.expense_date >= ?');
      params.push(from_date);
    }
    if (to_date) {
      conditions.push('e.expense_date <= ?');
      params.push(to_date);
    }
    if (category) {
      conditions.push('e.category = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY e.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return db.prepare(sql).all(...params);
  }

  saveExpense(data, userId) {
    const validated = expenseSchema.parse(data);
    const db = getDb();
    const now = new Date().toISOString();

    if (validated.id) {
      db.prepare(`
        UPDATE expenses
        SET category = ?, amount = ?, payment_mode = ?, description = ?, expense_date = ?
        WHERE id = ?
      `).run(
        validated.category,
        validated.amount,
        validated.payment_mode,
        validated.description,
        validated.expense_date,
        validated.id
      );
      return db.prepare('SELECT * FROM expenses WHERE id = ?').get(validated.id);
    } else {
      const result = db.prepare(`
        INSERT INTO expenses (category, amount, payment_mode, description, expense_date, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        validated.category,
        validated.amount,
        validated.payment_mode,
        validated.description,
        validated.expense_date,
        userId,
        now
      );

      const newId = Number(result.lastInsertRowid);
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, 'expense', ?, ?, ?)
      `).run(
        userId,
        AUDIT_ACTIONS.EXPENSE_CREATE,
        String(newId),
        JSON.stringify({ category: validated.category, amount: validated.amount }),
        now
      );

      return db.prepare('SELECT * FROM expenses WHERE id = ?').get(newId);
    }
  }

  deleteExpense(id, userId) {
    const db = getDb();
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    if (!expense) throw new Error('Expense not found.');

    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, 'EXPENSE_DELETE', 'expense', ?, ?, ?)
    `).run(
      userId,
      String(id),
      JSON.stringify({ category: expense.category, amount: expense.amount }),
      new Date().toISOString()
    );

    return { success: true };
  }

  // ==================== CASH SESSIONS (DAY OPENING / CLOSING) ====================

  getActiveCashSession() {
    const db = getDb();
    return db.prepare(`
      SELECT cs.*, u.username, u.full_name
      FROM cash_sessions cs
      JOIN users u ON cs.user_id = u.id
      WHERE cs.status = 'open'
      ORDER BY cs.id DESC LIMIT 1
    `).get();
  }

  openCashSession(data, userId) {
    const validated = cashSessionOpenSchema.parse(data);
    const db = getDb();
    const now = new Date().toISOString();

    const active = this.getActiveCashSession();
    if (active) {
      throw new Error(`A cash session (${active.session_code}) is already open! Close it before opening a new one.`);
    }

    const sessionCode = `CS-${now.slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const result = db.prepare(`
      INSERT INTO cash_sessions (
        session_code, user_id, opening_time, opening_cash, status, notes
      ) VALUES (?, ?, ?, ?, 'open', ?)
    `).run(
      sessionCode,
      userId,
      now,
      validated.opening_cash,
      validated.notes || ''
    );

    const sessionId = Number(result.lastInsertRowid);

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, 'cash_session', ?, ?, ?)
    `).run(
      userId,
      AUDIT_ACTIONS.CASH_SESSION_OPEN,
      String(sessionId),
      JSON.stringify({ session_code: sessionCode, opening_cash: validated.opening_cash }),
      now
    );

    return db.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(sessionId);
  }

  closeCashSession(data, userId) {
    const validated = cashSessionCloseSchema.parse(data);
    const db = getDb();
    const now = new Date().toISOString();

    return runInTransaction(() => {
      const session = db.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(validated.session_id);
      if (!session) throw new Error('Cash session not found.');
      if (session.status !== 'open') throw new Error('This cash session is already closed.');

      // Calculate Cash Inflows since opening_time
      const cashInflowRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_cash_in
        FROM payments
        WHERE payment_mode = 'cash'
          AND reference_type IN ('sale', 'customer_credit')
          AND payment_date >= ?
      `).get(session.opening_time.slice(0, 10));

      // Calculate Cash Outflows since opening_time (cash expenses & cash supplier payments)
      const cashExpensesRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_cash_out
        FROM expenses
        WHERE payment_mode = 'cash'
          AND expense_date >= ?
      `).get(session.opening_time.slice(0, 10));

      const cashSupplierPayRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_supplier_cash
        FROM payments
        WHERE payment_mode = 'cash'
          AND reference_type IN ('purchase', 'supplier_payment')
          AND payment_date >= ?
      `).get(session.opening_time.slice(0, 10));

      const totalCashIn = Number(cashInflowRow.total_cash_in);
      const totalCashOut = Number(cashExpensesRow.total_cash_out) + Number(cashSupplierPayRow.total_supplier_cash);

      const expectedCash = session.opening_cash + totalCashIn - totalCashOut;
      const cashDifference = validated.actual_cash - expectedCash;

      db.prepare(`
        UPDATE cash_sessions
        SET closing_time = ?, expected_cash = ?, actual_cash = ?,
            cash_difference = ?, notes = notes || ?, status = 'closed'
        WHERE id = ?
      `).run(
        now,
        expectedCash,
        validated.actual_cash,
        cashDifference,
        validated.notes ? ` [Closing note: ${validated.notes}]` : '',
        session.id
      );

      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, 'cash_session', ?, ?, ?)
      `).run(
        userId,
        AUDIT_ACTIONS.CASH_SESSION_CLOSE,
        String(session.id),
        JSON.stringify({
          session_code: session.session_code,
          expected_cash: expectedCash,
          actual_cash: validated.actual_cash,
          difference: cashDifference,
        }),
        now
      );

      return db.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(session.id);
    });
  }
}

module.exports = new PaymentService();
