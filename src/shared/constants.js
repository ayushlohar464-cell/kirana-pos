/**
 * KiranaPOS Application Constants
 */

const ROLES = {
  OWNER: 'owner',
  CASHIER: 'cashier',
};

const PAYMENT_MODES = {
  CASH: 'cash',
  UPI: 'upi',
  CARD: 'card',
  CREDIT: 'credit',
  BANK_TRANSFER: 'bank_transfer',
  CHEQUE: 'cheque',
};

const SALE_STATUS = {
  COMPLETED: 'completed',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
  PARTIAL_RETURN: 'partial_return',
};

const STOCK_MOVEMENT_TYPES = {
  OPENING: 'opening',
  SALE: 'sale',
  SALE_RETURN: 'sale_return',
  PURCHASE: 'purchase',
  PURCHASE_RETURN: 'purchase_return',
  ADJUSTMENT_ADD: 'adjustment_add',
  ADJUSTMENT_SUB: 'adjustment_sub',
  WASTAGE: 'wastage',
};

const AUDIT_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  SALE_CREATE: 'SALE_CREATE',
  SALE_RETURN: 'SALE_RETURN',
  BILL_CANCEL: 'BILL_CANCEL',
  PRODUCT_CREATE: 'PRODUCT_CREATE',
  PRODUCT_UPDATE: 'PRODUCT_UPDATE',
  PRODUCT_DELETE: 'PRODUCT_DELETE',
  STOCK_ADJUST: 'STOCK_ADJUST',
  PURCHASE_CREATE: 'PURCHASE_CREATE',
  CUSTOMER_CREATE: 'CUSTOMER_CREATE',
  CUSTOMER_UPDATE: 'CUSTOMER_UPDATE',
  CUSTOMER_PAYMENT: 'CUSTOMER_PAYMENT',
  SUPPLIER_CREATE: 'SUPPLIER_CREATE',
  SUPPLIER_UPDATE: 'SUPPLIER_UPDATE',
  SUPPLIER_PAYMENT: 'SUPPLIER_PAYMENT',
  EXPENSE_CREATE: 'EXPENSE_CREATE',
  CASH_SESSION_OPEN: 'CASH_SESSION_OPEN',
  CASH_SESSION_CLOSE: 'CASH_SESSION_CLOSE',
  BACKUP_CREATE: 'BACKUP_CREATE',
  BACKUP_RESTORE: 'BACKUP_RESTORE',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
};

const PRINTER_WIDTHS = {
  MM58: '58mm',
  MM80: '80mm',
};

const DEFAULT_SETTINGS = {
  shop_name: 'Shree Ganesh Kirana & General Store',
  shop_tagline: 'Fresh Groceries & Daily Needs',
  shop_address: 'Main Market Road, Near Town Clock Tower',
  shop_phone: '+91 98765 43210',
  shop_gstin: '',
  shop_fssai: '',
  receipt_footer_msg: 'Thank you for shopping with us! Visit again.',
  printer_width: '80mm',
  printer_silent: 'true',
  printer_name: '',
  auto_backup_enabled: 'true',
  backup_retention_days: '30',
  backup_directory: '',
  cloud_backup_enabled: 'false',
  currency_symbol: '₹',
};

const IPC_CHANNELS = {
  // Auth
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_GET_CURRENT_USER: 'auth:get-current-user',
  AUTH_CHANGE_PASSWORD: 'auth:change-password',
  USERS_LIST: 'users:list',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',

  // Master Data
  CATEGORIES_GET_ALL: 'categories:get-all',
  CATEGORIES_SAVE: 'categories:save',
  UNITS_GET_ALL: 'units:get-all',
  PRODUCTS_SEARCH: 'products:search',
  PRODUCTS_GET_ALL: 'products:get-all',
  PRODUCTS_GET_BY_ID: 'products:get-by-id',
  PRODUCTS_GET_BY_BARCODE: 'products:get-by-barcode',
  PRODUCTS_SAVE: 'products:save',
  PRODUCTS_TOGGLE_ACTIVE: 'products:toggle-active',
  
  // Inventory
  STOCK_GET_SUMMARY: 'stock:get-summary',
  STOCK_ADJUST: 'stock:adjust',
  STOCK_GET_MOVEMENTS: 'stock:get-movements',
  STOCK_GET_LOW_ALERTS: 'stock:get-low-alerts',

  // Billing / Sales
  SALES_CREATE: 'sales:create',
  SALES_GET_BY_ID: 'sales:get-by-id',
  SALES_GET_LIST: 'sales:get-list',
  SALES_RETURN: 'sales:return',
  SALES_CANCEL: 'sales:cancel',

  // Purchases
  PURCHASES_CREATE: 'purchases:create',
  PURCHASES_GET_LIST: 'purchases:get-list',
  PURCHASES_GET_BY_ID: 'purchases:get-by-id',

  // Parties
  CUSTOMERS_GET_ALL: 'customers:get-all',
  CUSTOMERS_SAVE: 'customers:save',
  CUSTOMERS_GET_LEDGER: 'customers:get-ledger',
  CUSTOMERS_RECORD_PAYMENT: 'customers:record-payment',

  SUPPLIERS_GET_ALL: 'suppliers:get-all',
  SUPPLIERS_SAVE: 'suppliers:save',
  SUPPLIERS_GET_LEDGER: 'suppliers:get-ledger',
  SUPPLIERS_RECORD_PAYMENT: 'suppliers:record-payment',

  // Expenses
  EXPENSES_GET_LIST: 'expenses:get-list',
  EXPENSES_SAVE: 'expenses:save',
  EXPENSES_DELETE: 'expenses:delete',

  // Cash Session
  CASH_GET_ACTIVE_SESSION: 'cash:get-active-session',
  CASH_OPEN_SESSION: 'cash:open-session',
  CASH_CLOSE_SESSION: 'cash:close-session',

  // Reports
  REPORTS_DASHBOARD_STATS: 'reports:dashboard-stats',
  REPORTS_SALES_SUMMARY: 'reports:sales-summary',
  REPORTS_PAYMENT_COLLECTIONS: 'reports:payment-collections',
  REPORTS_PROFIT_LOSS: 'reports:profit-loss',
  REPORTS_STOCK_VALUATION: 'reports:stock-valuation',
  REPORTS_EXPENSES: 'reports:expenses',

  // Printing & Hardware
  PRINT_RECEIPT: 'print:receipt',
  PRINT_GET_PRINTERS: 'print:get-printers',

  // Settings & Backups
  SETTINGS_GET_ALL: 'settings:get-all',
  SETTINGS_SAVE: 'settings:save',
  BACKUP_TRIGGER_MANUAL: 'backup:trigger-manual',
  BACKUP_LIST: 'backup:list',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_SELECT_DIR: 'backup:select-dir',
  AUDIT_GET_LOGS: 'audit:get-logs',

  // App & Window
  APP_GET_INFO: 'app:get-info',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
};

module.exports = {
  ROLES,
  PAYMENT_MODES,
  SALE_STATUS,
  STOCK_MOVEMENT_TYPES,
  AUDIT_ACTIONS,
  PRINTER_WIDTHS,
  DEFAULT_SETTINGS,
  IPC_CHANNELS,
};
