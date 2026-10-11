/**
 * IPC Communication Handlers
 */
const { ipcMain, dialog, BrowserWindow } = require('electron');
const { IPC_CHANNELS } = require('../shared/constants');
const { assertPermission } = require('./security');
const { getDb } = require('../database/connection');
const authService = require('../services/auth-service');
const inventoryService = require('../services/inventory-service');
const salesService = require('../services/sales-service');
const purchaseService = require('../services/purchase-service');
const paymentService = require('../services/payment-service');
const reportService = require('../services/report-service');
const backupService = require('../services/backup-service');

let currentUser = null;

function getCurrentUser() {
  return currentUser;
}

function registerIpcHandlers() {
  // Helper to safely wrap handlers with error formatting
  const handleSafe = (channel, handler) => {
    ipcMain.handle(channel, async (event, ...args) => {
      try {
        const result = await handler(event, ...args);
        return { success: true, data: result };
      } catch (err) {
        console.error(`IPC Error on ${channel}:`, err);
        return {
          success: false,
          error: err.message || 'An unexpected internal error occurred.',
        };
      }
    });
  };

  // ==================== AUTH ====================
  handleSafe(IPC_CHANNELS.AUTH_LOGIN, async (event, { username, password }) => {
    const user = await authService.login(username, password);
    currentUser = user;
    return user;
  });

  handleSafe(IPC_CHANNELS.AUTH_LOGOUT, async () => {
    currentUser = null;
    return { loggedOut: true };
  });

  handleSafe(IPC_CHANNELS.AUTH_GET_CURRENT_USER, async () => {
    return currentUser;
  });

  handleSafe(IPC_CHANNELS.USERS_LIST, async () => {
    assertPermission(currentUser, 'users:manage');
    return authService.listUsers();
  });

  handleSafe(IPC_CHANNELS.USERS_CREATE, async (event, userData) => {
    assertPermission(currentUser, 'users:manage');
    return authService.createUser(userData, currentUser.id);
  });

  handleSafe(IPC_CHANNELS.USERS_UPDATE, async (event, userData) => {
    assertPermission(currentUser, 'users:manage');
    return authService.updateUser(userData, currentUser.id);
  });

  // ==================== MASTER DATA ====================
  handleSafe(IPC_CHANNELS.CATEGORIES_GET_ALL, async () => {
    return inventoryService.getCategories();
  });

  handleSafe(IPC_CHANNELS.CATEGORIES_SAVE, async (event, catData) => {
    assertPermission(currentUser, 'inventory:manage');
    return inventoryService.saveCategory(catData);
  });

  handleSafe(IPC_CHANNELS.UNITS_GET_ALL, async () => {
    return inventoryService.getUnits();
  });

  handleSafe(IPC_CHANNELS.PRODUCTS_SEARCH, async (event, query) => {
    return inventoryService.getProducts({ query, limit: 30 });
  });

  handleSafe(IPC_CHANNELS.PRODUCTS_GET_ALL, async (event, options) => {
    return inventoryService.getProducts(options || {});
  });

  handleSafe(IPC_CHANNELS.PRODUCTS_GET_BY_ID, async (event, id) => {
    return inventoryService.getProductById(id);
  });

  handleSafe(IPC_CHANNELS.PRODUCTS_GET_BY_BARCODE, async (event, barcode) => {
    return inventoryService.getProductByBarcode(barcode);
  });

  handleSafe(IPC_CHANNELS.PRODUCTS_SAVE, async (event, productData) => {
    assertPermission(currentUser, 'inventory:manage');
    return inventoryService.saveProduct(productData, currentUser.id);
  });

  handleSafe(IPC_CHANNELS.PRODUCTS_TOGGLE_ACTIVE, async (event, id) => {
    assertPermission(currentUser, 'inventory:manage');
    return inventoryService.toggleProductActive(id, currentUser.id);
  });

  // ==================== STOCK ====================
  handleSafe(IPC_CHANNELS.STOCK_ADJUST, async (event, adjustData) => {
    assertPermission(currentUser, 'inventory:adjust');
    return inventoryService.adjustStock(adjustData, currentUser.id);
  });

  handleSafe(IPC_CHANNELS.STOCK_GET_MOVEMENTS, async (event, options) => {
    return inventoryService.getStockMovements(options || {});
  });

  handleSafe(IPC_CHANNELS.STOCK_GET_LOW_ALERTS, async () => {
    return inventoryService.getLowStockAlerts();
  });

  // ==================== SALES / BILLING ====================
  handleSafe(IPC_CHANNELS.SALES_CREATE, async (event, saleData) => {
    if (!currentUser) throw new Error('You must be logged in to create a sale.');
    return salesService.createSale(saleData, currentUser.id);
  });

  handleSafe(IPC_CHANNELS.SALES_GET_BY_ID, async (event, id) => {
    return salesService.getSaleById(id);
  });

  handleSafe(IPC_CHANNELS.SALES_GET_LIST, async (event, options) => {
    return salesService.getSalesList(options || {});
  });

  handleSafe(IPC_CHANNELS.SALES_RETURN, async (event, returnData) => {
    if (!currentUser) throw new Error('Authentication required.');
    return salesService.processSaleReturn(returnData, currentUser.id);
  });

  handleSafe(IPC_CHANNELS.SALES_CANCEL, async (event, { saleId, reason }) => {
    assertPermission(currentUser, 'pos:cancel_bill');
    return salesService.cancelSale(saleId, reason, currentUser.id);
  });

  // ==================== PURCHASES ====================
  handleSafe(IPC_CHANNELS.PURCHASES_CREATE, async (event, purchaseData) => {
    assertPermission(currentUser, 'purchases:manage');
    return purchaseService.createPurchase(purchaseData, currentUser.id);
  });

  handleSafe(IPC_CHANNELS.PURCHASES_GET_LIST, async (event, options) => {
    return purchaseService.getPurchasesList(options || {});
  });

  handleSafe(IPC_CHANNELS.PURCHASES_GET_BY_ID, async (event, id) => {
    return purchaseService.getPurchaseById(id);
  });

  // ==================== PARTIES ====================
  handleSafe(IPC_CHANNELS.CUSTOMERS_GET_ALL, async (event, options) => {
    return paymentService.getCustomers(options || {});
  });

  handleSafe(IPC_CHANNELS.CUSTOMERS_SAVE, async (event, custData) => {
    if (!currentUser) throw new Error('Authentication required.');
    return paymentService.saveCustomer(custData, currentUser.id);
  });

  handleSafe(IPC_CHANNELS.CUSTOMERS_GET_LEDGER, async (event, id) => {
    return paymentService.getCustomerLedger(id);
  });

  handleSafe(IPC_CHANNELS.CUSTOMERS_RECORD_PAYMENT, async (event, data) => {
    if (!currentUser) throw new Error('Authentication required.');
    return paymentService.recordCustomerPayment(data, currentUser.id);
  });

  handleSafe(IPC_CHANNELS.SUPPLIERS_GET_ALL, async (event, options) => {
    return paymentService.getSuppliers(options || {});
  });

  handleSafe(IPC_CHANNELS.SUPPLIERS_SAVE, async (event, suppData) => {
    assertPermission(currentUser, 'suppliers:manage');
    return paymentService.saveSupplier(suppData, currentUser.id);
  });

  handleSafe(IPC_CHANNELS.SUPPLIERS_GET_LEDGER, async (event, id) => {
    return paymentService.getSupplierLedger(id);
  });

  handleSafe(IPC_CHANNELS.SUPPLIERS_RECORD_PAYMENT, async (event, data) => {
    assertPermission(currentUser, 'suppliers:payments');
    return paymentService.recordSupplierPayment(data, currentUser.id);
  });

  // ==================== EXPENSES ====================
  handleSafe(IPC_CHANNELS.EXPENSES_GET_LIST, async (event, options) => {
    return paymentService.getExpenses(options || {});
  });

  handleSafe(IPC_CHANNELS.EXPENSES_SAVE, async (event, expenseData) => {
    if (!currentUser) throw new Error('Authentication required.');
    return paymentService.saveExpense(expenseData, currentUser.id);
  });

  handleSafe(IPC_CHANNELS.EXPENSES_DELETE, async (event, id) => {
    assertPermission(currentUser, 'expenses:manage');
    return paymentService.deleteExpense(id, currentUser.id);
  });

  // ==================== CASH SESSIONS ====================
  handleSafe(IPC_CHANNELS.CASH_GET_ACTIVE_SESSION, async () => {
    return paymentService.getActiveCashSession();
  });

  handleSafe(IPC_CHANNELS.CASH_OPEN_SESSION, async (event, data) => {
    if (!currentUser) throw new Error('Authentication required.');
    return paymentService.openCashSession(data, currentUser.id);
  });

  handleSafe(IPC_CHANNELS.CASH_CLOSE_SESSION, async (event, data) => {
    if (!currentUser) throw new Error('Authentication required.');
    return paymentService.closeCashSession(data, currentUser.id);
  });

  // ==================== REPORTS ====================
  handleSafe(IPC_CHANNELS.REPORTS_DASHBOARD_STATS, async () => {
    return reportService.getDashboardStats();
  });

  handleSafe(IPC_CHANNELS.REPORTS_SALES_SUMMARY, async (event, { from_date, to_date }) => {
    return reportService.getSalesReport({ from_date, to_date });
  });

  handleSafe(IPC_CHANNELS.REPORTS_PAYMENT_COLLECTIONS, async (event, { from_date, to_date }) => {
    return reportService.getPaymentCollectionsReport({ from_date, to_date });
  });

  handleSafe(IPC_CHANNELS.REPORTS_PROFIT_LOSS, async (event, { from_date, to_date }) => {
    assertPermission(currentUser, 'reports:profit_loss');
    return reportService.getProfitLossReport({ from_date, to_date });
  });

  handleSafe(IPC_CHANNELS.REPORTS_STOCK_VALUATION, async () => {
    assertPermission(currentUser, 'reports:stock_valuation');
    return reportService.getStockValuationReport();
  });

  // ==================== SETTINGS & AUDIT ====================
  handleSafe(IPC_CHANNELS.SETTINGS_GET_ALL, async () => {
    const db = getDb();
    const rows = db.prepare('SELECT key, value, category FROM settings').all();
    const map = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }
    return map;
  });

  handleSafe(IPC_CHANNELS.SETTINGS_SAVE, async (event, settingsMap) => {
    assertPermission(currentUser, 'settings:manage');
    const db = getDb();
    const now = new Date().toISOString();
    const upsert = db.prepare(`
      INSERT INTO settings (key, value, category, updated_at)
      VALUES (?, ?, 'custom', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);

    db.transaction(() => {
      for (const [k, v] of Object.entries(settingsMap)) {
        upsert.run(k, String(v), now);
      }
    })();

    return { success: true };
  });

  handleSafe(IPC_CHANNELS.AUDIT_GET_LOGS, async (event, { limit = 100, offset = 0 } = {}) => {
    assertPermission(currentUser, 'audit:view');
    const db = getDb();
    return db.prepare(`
      SELECT al.*, u.username, u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.id DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
  });

  // ==================== BACKUP & RESTORE ====================
  handleSafe(IPC_CHANNELS.BACKUP_TRIGGER_MANUAL, async () => {
    assertPermission(currentUser, 'backup:manage');
    return backupService.createBackup('manual', currentUser.id);
  });

  handleSafe(IPC_CHANNELS.BACKUP_LIST, async () => {
    assertPermission(currentUser, 'backup:manage');
    return backupService.getBackupHistory(50);
  });

  handleSafe(IPC_CHANNELS.BACKUP_RESTORE, async (event, filePath) => {
    assertPermission(currentUser, 'backup:manage');
    return backupService.restoreDatabase(filePath, currentUser.id);
  });

  handleSafe(IPC_CHANNELS.BACKUP_SELECT_DIR, async () => {
    assertPermission(currentUser, 'backup:manage');
    const win = BrowserWindow.getFocusedWindow();
    const res = await dialog.showOpenDialog(win, {
      title: 'Select Backup Storage Directory',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (!res.canceled && res.filePaths.length > 0) {
      return res.filePaths[0];
    }
    return null;
  });

  // ==================== PRINTING ====================
  handleSafe(IPC_CHANNELS.PRINT_GET_PRINTERS, async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return [];
    return win.webContents.getPrintersAsync();
  });

  handleSafe(IPC_CHANNELS.PRINT_RECEIPT, async (event, printOptions) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { printed: false, error: 'No active window' };

    // Print silently or show system print dialog based on settings
    return new Promise((resolve) => {
      win.webContents.print(
        {
          silent: printOptions.silent !== false,
          printBackground: true,
          deviceName: printOptions.deviceName || '',
          margins: { marginType: 'none' },
        },
        (success, failureReason) => {
          if (!success) {
            console.warn('Thermal print failed:', failureReason);
            resolve({ printed: false, reason: failureReason });
          } else {
            resolve({ printed: true });
          }
        }
      );
    });
  });

  // ==================== WINDOW CONTROLS ====================
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
  });
}

module.exports = {
  registerIpcHandlers,
  getCurrentUser,
};
