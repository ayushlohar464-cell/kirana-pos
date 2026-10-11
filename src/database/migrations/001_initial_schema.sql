-- ============================================================================
-- KiranaPOS Database Schema Migration: 001_initial_schema.sql
-- ============================================================================

-- 1. Schema Migrations Tracker
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  migration_name TEXT UNIQUE NOT NULL,
  applied_at TEXT NOT NULL
);

-- 2. Users (Owner and Cashier)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner', 'cashier')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. Settings (Shop, Printer, Backup, Billing)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  category TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 4. Categories
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- 5. Product Units
CREATE TABLE IF NOT EXISTS product_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  allow_decimal INTEGER NOT NULL DEFAULT 0,
  base_unit_code TEXT,
  conversion_factor REAL DEFAULT 1.0
);

-- 6. Products
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_regional TEXT DEFAULT '',
  sku TEXT UNIQUE,
  barcode TEXT UNIQUE,
  unit_code TEXT NOT NULL DEFAULT 'pcs' REFERENCES product_units(short_code),
  purchase_cost INTEGER NOT NULL DEFAULT 0, -- stored in integer paise
  selling_price INTEGER NOT NULL DEFAULT 0, -- stored in integer paise
  mrp INTEGER NOT NULL DEFAULT 0,           -- stored in integer paise
  tax_rate REAL NOT NULL DEFAULT 0.0,       -- percentage e.g. 5.0
  current_stock REAL NOT NULL DEFAULT 0.0,  -- scaled fractional quantity (e.g. 1.250 kg)
  min_stock_alert REAL NOT NULL DEFAULT 5.0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Index for instant barcode and text lookup
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- 7. Customers
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  address TEXT DEFAULT '',
  credit_limit INTEGER NOT NULL DEFAULT 0,   -- in paise
  current_balance INTEGER NOT NULL DEFAULT 0, -- in paise: positive = customer owes store (Udhar)
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- 8. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  company_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  address TEXT DEFAULT '',
  current_balance INTEGER NOT NULL DEFAULT 0, -- in paise: positive = store owes supplier
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- 9. Sales
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  subtotal INTEGER NOT NULL,            -- in paise
  discount_amount INTEGER NOT NULL DEFAULT 0, -- in paise
  tax_amount INTEGER NOT NULL DEFAULT 0,      -- in paise
  round_off INTEGER NOT NULL DEFAULT 0,       -- in paise
  grand_total INTEGER NOT NULL,         -- in paise
  paid_amount INTEGER NOT NULL DEFAULT 0,     -- in paise
  credit_amount INTEGER NOT NULL DEFAULT 0,   -- in paise
  status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'returned', 'cancelled', 'partial_return')),
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);

-- 10. Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  unit_code TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price INTEGER NOT NULL,          -- in paise
  discount_amount INTEGER NOT NULL DEFAULT 0, -- in paise
  tax_rate REAL NOT NULL DEFAULT 0.0,
  tax_amount INTEGER NOT NULL DEFAULT 0,      -- in paise
  total_price INTEGER NOT NULL,         -- in paise
  returned_quantity REAL NOT NULL DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- 11. Payments (All incoming and outgoing settlement transactions)
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_type TEXT NOT NULL CHECK(reference_type IN ('sale', 'customer_credit', 'purchase', 'supplier_payment')),
  reference_id INTEGER NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  payment_mode TEXT NOT NULL CHECK(payment_mode IN ('cash', 'upi', 'card', 'credit', 'bank_transfer', 'cheque')),
  amount INTEGER NOT NULL,              -- in paise
  transaction_reference TEXT DEFAULT '',
  user_id INTEGER NOT NULL REFERENCES users(id),
  payment_date TEXT NOT NULL,
  notes TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(reference_type, reference_id);

-- 12. Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_invoice_no TEXT NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  subtotal INTEGER NOT NULL,            -- in paise
  discount_amount INTEGER NOT NULL DEFAULT 0, -- in paise
  tax_amount INTEGER NOT NULL DEFAULT 0,      -- in paise
  grand_total INTEGER NOT NULL,         -- in paise
  paid_amount INTEGER NOT NULL DEFAULT 0,     -- in paise
  balance_due INTEGER NOT NULL DEFAULT 0,     -- in paise
  purchase_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'cancelled')),
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);

-- 13. Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity REAL NOT NULL,
  unit_cost INTEGER NOT NULL,           -- in paise
  tax_rate REAL NOT NULL DEFAULT 0.0,
  tax_amount INTEGER NOT NULL DEFAULT 0,      -- in paise
  total_cost INTEGER NOT NULL           -- in paise
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);

-- 14. Stock Movements (Complete immutable ledger of all stock changes)
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL CHECK(movement_type IN ('opening', 'sale', 'sale_return', 'purchase', 'purchase_return', 'adjustment_add', 'adjustment_sub', 'wastage')),
  quantity_change REAL NOT NULL,        -- positive for addition, negative for reduction
  resulting_stock REAL NOT NULL,
  reference_type TEXT DEFAULT '',
  reference_id INTEGER,
  reason TEXT DEFAULT '',
  user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);

-- 15. Customer Ledger (Double-entry / transaction balance tracking)
CREATE TABLE IF NOT EXISTS customer_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  entry_type TEXT NOT NULL CHECK(entry_type IN ('debit', 'credit')), -- debit = Udhar added; credit = payment made
  amount INTEGER NOT NULL,              -- in paise
  running_balance INTEGER NOT NULL,     -- in paise
  reference_type TEXT NOT NULL CHECK(reference_type IN ('sale', 'payment', 'return', 'opening_balance')),
  reference_id INTEGER,
  description TEXT DEFAULT '',
  user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_ledger_cust ON customer_ledger(customer_id);

-- 16. Supplier Ledger
CREATE TABLE IF NOT EXISTS supplier_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  entry_type TEXT NOT NULL CHECK(entry_type IN ('credit', 'debit')), -- credit = purchase credit owed; debit = payment to supplier
  amount INTEGER NOT NULL,              -- in paise
  running_balance INTEGER NOT NULL,     -- in paise
  reference_type TEXT NOT NULL CHECK(reference_type IN ('purchase', 'payment', 'return', 'opening_balance')),
  reference_id INTEGER,
  description TEXT DEFAULT '',
  user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_supplier_ledger_supp ON supplier_ledger(supplier_id);

-- 17. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,              -- in paise
  payment_mode TEXT NOT NULL CHECK(payment_mode IN ('cash', 'upi', 'bank_transfer', 'cheque')),
  description TEXT NOT NULL,
  expense_date TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- 18. Returns (Sales Returns / Refunds)
CREATE TABLE IF NOT EXISTS returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_number TEXT UNIQUE NOT NULL,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  total_refund_amount INTEGER NOT NULL, -- in paise
  refund_mode TEXT NOT NULL CHECK(refund_mode IN ('cash', 'upi', 'credit_adjustment')),
  reason TEXT DEFAULT '',
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

-- 19. Return Items
CREATE TABLE IF NOT EXISTS return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_id INTEGER NOT NULL REFERENCES returns(id) ON DELETE RESTRICT,
  sale_item_id INTEGER NOT NULL REFERENCES sale_items(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity REAL NOT NULL,
  refund_rate INTEGER NOT NULL,         -- in paise
  subtotal INTEGER NOT NULL,            -- in paise
  condition TEXT NOT NULL DEFAULT 'restockable' CHECK(condition IN ('restockable', 'damaged_wasted'))
);

-- 20. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT DEFAULT '',
  entity_id TEXT DEFAULT '',
  details TEXT DEFAULT '{}',
  ip_address TEXT DEFAULT '127.0.0.1',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 21. Cash Sessions (Day Opening and Closing Cash Registry)
CREATE TABLE IF NOT EXISTS cash_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_code TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  opening_time TEXT NOT NULL,
  closing_time TEXT,
  opening_cash INTEGER NOT NULL,        -- in paise
  expected_cash INTEGER,                -- in paise
  actual_cash INTEGER,                  -- in paise
  cash_difference INTEGER,              -- in paise
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions(status);

-- 22. Backup History
CREATE TABLE IF NOT EXISTS backup_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backup_file_name TEXT NOT NULL,
  backup_file_path TEXT NOT NULL,
  backup_size_bytes INTEGER NOT NULL,
  backup_type TEXT NOT NULL CHECK(backup_type IN ('auto_daily', 'manual', 'pre_restore')),
  status TEXT NOT NULL CHECK(status IN ('success', 'failed')),
  checksum_sha256 TEXT DEFAULT '',
  details TEXT DEFAULT '',
  created_at TEXT NOT NULL
);
