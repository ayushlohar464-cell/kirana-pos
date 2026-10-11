/**
 * Preload Script - Secure IPC Bridge
 * Exposes window.api safely with contextIsolation
 */
const { contextBridge, ipcRenderer } = require('electron');
const { IPC_CHANNELS } = require('../shared/constants');

// Generic helper to invoke IPC and handle response envelope
async function invokeApi(channel, ...args) {
  const response = await ipcRenderer.invoke(channel, ...args);
  if (!response || typeof response !== 'object') {
    return response;
  }
  if (response.success === false) {
    throw new Error(response.error || 'Operation failed');
  }
  return response.data;
}

const api = {
  // Auth
  auth: {
    login: (username, password) => invokeApi(IPC_CHANNELS.AUTH_LOGIN, { username, password }),
    logout: () => invokeApi(IPC_CHANNELS.AUTH_LOGOUT),
    getCurrentUser: () => invokeApi(IPC_CHANNELS.AUTH_GET_CURRENT_USER),
    listUsers: () => invokeApi(IPC_CHANNELS.USERS_LIST),
    createUser: (userData) => invokeApi(IPC_CHANNELS.USERS_CREATE, userData),
    updateUser: (userData) => invokeApi(IPC_CHANNELS.USERS_UPDATE, userData),
  },

  // Products, Categories & Units
  master: {
    getCategories: () => invokeApi(IPC_CHANNELS.CATEGORIES_GET_ALL),
    saveCategory: (data) => invokeApi(IPC_CHANNELS.CATEGORIES_SAVE, data),
    getUnits: () => invokeApi(IPC_CHANNELS.UNITS_GET_ALL),
    searchProducts: (query) => invokeApi(IPC_CHANNELS.PRODUCTS_SEARCH, query),
    getProducts: (options) => invokeApi(IPC_CHANNELS.PRODUCTS_GET_ALL, options),
    getProductById: (id) => invokeApi(IPC_CHANNELS.PRODUCTS_GET_BY_ID, id),
    getProductByBarcode: (barcode) => invokeApi(IPC_CHANNELS.PRODUCTS_GET_BY_BARCODE, barcode),
    saveProduct: (data) => invokeApi(IPC_CHANNELS.PRODUCTS_SAVE, data),
    toggleProductActive: (id) => invokeApi(IPC_CHANNELS.PRODUCTS_TOGGLE_ACTIVE, id),
  },

  // Stock
  inventory: {
    adjustStock: (data) => invokeApi(IPC_CHANNELS.STOCK_ADJUST, data),
    getStockMovements: (options) => invokeApi(IPC_CHANNELS.STOCK_GET_MOVEMENTS, options),
    getLowStockAlerts: () => invokeApi(IPC_CHANNELS.STOCK_GET_LOW_ALERTS),
  },

  // Billing / Sales
  sales: {
    createSale: (saleData) => invokeApi(IPC_CHANNELS.SALES_CREATE, saleData),
    getSaleById: (id) => invokeApi(IPC_CHANNELS.SALES_GET_BY_ID, id),
    getSalesList: (options) => invokeApi(IPC_CHANNELS.SALES_GET_LIST, options),
    processReturn: (data) => invokeApi(IPC_CHANNELS.SALES_RETURN, data),
    cancelSale: (saleId, reason) => invokeApi(IPC_CHANNELS.SALES_CANCEL, { saleId, reason }),
  },

  // Purchases
  purchases: {
    createPurchase: (purchaseData) => invokeApi(IPC_CHANNELS.PURCHASES_CREATE, purchaseData),
    getPurchasesList: (options) => invokeApi(IPC_CHANNELS.PURCHASES_GET_LIST, options),
    getPurchaseById: (id) => invokeApi(IPC_CHANNELS.PURCHASES_GET_BY_ID, id),
  },

  // Parties (Customers & Suppliers)
  parties: {
    getCustomers: (options) => invokeApi(IPC_CHANNELS.CUSTOMERS_GET_ALL, options),
    saveCustomer: (data) => invokeApi(IPC_CHANNELS.CUSTOMERS_SAVE, data),
    getCustomerLedger: (id) => invokeApi(IPC_CHANNELS.CUSTOMERS_GET_LEDGER, id),
    recordCustomerPayment: (data) => invokeApi(IPC_CHANNELS.CUSTOMERS_RECORD_PAYMENT, data),

    getSuppliers: (options) => invokeApi(IPC_CHANNELS.SUPPLIERS_GET_ALL, options),
    saveSupplier: (data) => invokeApi(IPC_CHANNELS.SUPPLIERS_SAVE, data),
    getSupplierLedger: (id) => invokeApi(IPC_CHANNELS.SUPPLIERS_GET_LEDGER, id),
    recordSupplierPayment: (data) => invokeApi(IPC_CHANNELS.SUPPLIERS_RECORD_PAYMENT, data),
  },

  // Expenses
  expenses: {
    getExpenses: (options) => invokeApi(IPC_CHANNELS.EXPENSES_GET_LIST, options),
    saveExpense: (data) => invokeApi(IPC_CHANNELS.EXPENSES_SAVE, data),
    deleteExpense: (id) => invokeApi(IPC_CHANNELS.EXPENSES_DELETE, id),
  },

  // Cash Session
  cash: {
    getActiveSession: () => invokeApi(IPC_CHANNELS.CASH_GET_ACTIVE_SESSION),
    openSession: (data) => invokeApi(IPC_CHANNELS.CASH_OPEN_SESSION, data),
    closeSession: (data) => invokeApi(IPC_CHANNELS.CASH_CLOSE_SESSION, data),
  },

  // Reports
  reports: {
    getDashboardStats: () => invokeApi(IPC_CHANNELS.REPORTS_DASHBOARD_STATS),
    getSalesReport: (range) => invokeApi(IPC_CHANNELS.REPORTS_SALES_SUMMARY, range),
    getPaymentCollectionsReport: (range) => invokeApi(IPC_CHANNELS.REPORTS_PAYMENT_COLLECTIONS, range),
    getProfitLossReport: (range) => invokeApi(IPC_CHANNELS.REPORTS_PROFIT_LOSS, range),
    getStockValuationReport: () => invokeApi(IPC_CHANNELS.REPORTS_STOCK_VALUATION),
  },

  // Settings & Audit
  settings: {
    getSettings: () => invokeApi(IPC_CHANNELS.SETTINGS_GET_ALL),
    saveSettings: (settingsMap) => invokeApi(IPC_CHANNELS.SETTINGS_SAVE, settingsMap),
    getAuditLogs: (options) => invokeApi(IPC_CHANNELS.AUDIT_GET_LOGS, options),
  },

  // Backup & Restore
  backup: {
    triggerManualBackup: () => invokeApi(IPC_CHANNELS.BACKUP_TRIGGER_MANUAL),
    getBackupList: () => invokeApi(IPC_CHANNELS.BACKUP_LIST),
    restoreBackup: (filePath) => invokeApi(IPC_CHANNELS.BACKUP_RESTORE, filePath),
    selectBackupDir: () => invokeApi(IPC_CHANNELS.BACKUP_SELECT_DIR),
  },

  // Hardware / Printing
  printer: {
    getPrinters: () => invokeApi(IPC_CHANNELS.PRINT_GET_PRINTERS),
    printReceipt: (options) => invokeApi(IPC_CHANNELS.PRINT_RECEIPT, options),
  },

  // Window Controls
  window: {
    minimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
  },
};

contextBridge.exposeInMainWorld('api', api);
