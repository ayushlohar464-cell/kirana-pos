/**
 * Main Application Controller
 */

class AppController {
  constructor() {
    this.currentUser = null;
    this.activeCashSession = null;
    this.settings = {};

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.hdrShopName = document.getElementById('hdr-shop-name');
    this.hdrUserName = document.getElementById('hdr-user-name');
    this.hdrUserRole = document.getElementById('hdr-user-role');
    this.btnLogout = document.getElementById('btn-logout');

    this.cashSessionBtn = document.getElementById('cash-session-btn');
    this.cashSessionText = document.getElementById('cash-session-text');

    this.navItems = document.querySelectorAll('.nav-item');
    this.pageViews = document.querySelectorAll('.page-view');
    this.bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    this.sidebar = document.getElementById('app-sidebar') || document.querySelector('.sidebar');
    this.sidebarBackdrop = document.getElementById('sidebar-backdrop');
    this.btnMobileMenu = document.getElementById('btn-mobile-menu');
    this.btnCloseSidebar = document.getElementById('btn-close-sidebar');

    this.modalLogin = document.getElementById('modal-login');
    this.modalCashOpen = document.getElementById('modal-cash-open');
    this.modalCashClose = document.getElementById('modal-cash-close');
    this.modalProduct = document.getElementById('modal-product');
    this.modalStockAdjust = document.getElementById('modal-stock-adjust');
    this.modalCustomer = document.getElementById('modal-customer');
    this.modalCustPayment = document.getElementById('modal-cust-payment');
    this.modalExpense = document.getElementById('modal-expense');
    this.modalReceiptPreview = document.getElementById('modal-receipt-preview');
    this.modalSupplier = document.getElementById('modal-supplier');
    this.modalPurchase = document.getElementById('modal-purchase');
    this.modalSuppPayment = document.getElementById('modal-supp-payment');
    this.modalCustStatement = document.getElementById('modal-customer-statement');
    this.modalBarcodeSticker = document.getElementById('modal-barcode-sticker');

    this.toastContainer = document.getElementById('toast-container');
  }

  bindEvents() {
    // Window control buttons (desktop Electron)
    const btnWinMin = document.getElementById('btn-win-min');
    const btnWinMax = document.getElementById('btn-win-max');
    const btnWinClose = document.getElementById('btn-win-close');
    if (btnWinMin) btnWinMin.addEventListener('click', () => window.api.window.minimize());
    if (btnWinMax) btnWinMax.addEventListener('click', () => window.api.window.maximize());
    if (btnWinClose) btnWinClose.addEventListener('click', () => window.api.window.close());

    // Mobile Hamburger Menu & Drawer
    if (this.btnMobileMenu) {
      this.btnMobileMenu.addEventListener('click', () => this.toggleMobileSidebar(true));
    }
    if (this.btnCloseSidebar) {
      this.btnCloseSidebar.addEventListener('click', () => this.toggleMobileSidebar(false));
    }
    if (this.sidebarBackdrop) {
      this.sidebarBackdrop.addEventListener('click', () => this.toggleMobileSidebar(false));
    }

    // Navigation switching (Sidebar)
    this.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const pageId = item.dataset.page;
        this.navigateToPage(pageId);
        this.toggleMobileSidebar(false);
      });
    });

    // Mobile Bottom Navigation Bar
    if (this.bottomNavItems) {
      this.bottomNavItems.forEach(btn => {
        btn.addEventListener('click', () => {
          const pageId = btn.dataset.page;
          if (pageId === 'more') {
            this.toggleMobileSidebar(true);
          } else {
            this.navigateToPage(pageId);
            this.toggleMobileSidebar(false);
          }
        });
      });
    }

    // Language Toggle
    const btnLang = document.getElementById('btn-lang-toggle');
    if (btnLang) {
      btnLang.addEventListener('click', () => {
        const newLang = window.i18n.toggleLang();
        this.showToast(newLang === 'mr' ? 'भाषा: मराठी सेट झाली' : 'Language: English selected', 'info');
      });
    }

    // Logout
    this.btnLogout.addEventListener('click', async () => {
      await window.api.auth.logout();
      this.currentUser = null;
      this.showLoginModal();
    });

    // Login Form
    document.getElementById('login-btn-submit').addEventListener('click', () => this.handleLogin());
    document.getElementById('login-password').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    const btnPapaDirect = document.getElementById('login-papa-direct');
    if (btnPapaDirect) {
      btnPapaDirect.addEventListener('click', () => {
        document.getElementById('login-username').value = 'admin';
        document.getElementById('login-password').value = 'admin123';
        this.handleLogin();
      });
    }

    // Cash session pill click
    this.cashSessionBtn.addEventListener('click', () => {
      if (this.activeCashSession) {
        this.openModal(this.modalCashClose);
      } else {
        this.openModal(this.modalCashOpen);
      }
    });

    document.getElementById('cash-open-btn-submit').addEventListener('click', () => this.handleCashOpen());
    document.getElementById('cash-close-btn-submit').addEventListener('click', () => this.handleCashClose());

    // Modal Close Buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        if (modal) this.closeModal(modal);
      });
    });

    // Dashboard Refresh
    document.getElementById('dash-btn-refresh').addEventListener('click', () => this.loadDashboard());

    // Products Management
    document.getElementById('prod-btn-add').addEventListener('click', () => this.openAddProductModal());
    document.getElementById('prod-form-btn-submit').addEventListener('click', () => this.handleSaveProduct());
    document.getElementById('prod-search-input').addEventListener('input', (e) => this.loadProductsList(e.target.value));
    document.getElementById('prod-cat-filter').addEventListener('change', () => this.loadProductsList());

    // Barcode Sticker Printing for Loose Kirana Goods
    const btnStickers = document.getElementById('prod-btn-barcode-stickers');
    if (btnStickers) btnStickers.addEventListener('click', () => this.openBarcodeStickerModal());

    const stickerProdSel = document.getElementById('sticker-product-select');
    if (stickerProdSel) stickerProdSel.addEventListener('change', () => this.updateStickerPreview());
    const stickerLayoutSel = document.getElementById('sticker-layout-select');
    if (stickerLayoutSel) stickerLayoutSel.addEventListener('change', () => this.updateStickerPreview());
    const stickerShowShop = document.getElementById('sticker-show-shop');
    if (stickerShowShop) stickerShowShop.addEventListener('change', () => this.updateStickerPreview());
    const stickerShowCode = document.getElementById('sticker-show-code');
    if (stickerShowCode) stickerShowCode.addEventListener('change', () => this.updateStickerPreview());
    const stickerBtnPrint = document.getElementById('btn-print-barcode-stickers');
    if (stickerBtnPrint) stickerBtnPrint.addEventListener('click', () => this.printBarcodeStickers());

    // Stock Adjustments
    document.getElementById('stock-btn-adjust').addEventListener('click', () => this.openStockAdjustModal());
    document.getElementById('stock-adj-btn-submit').addEventListener('click', () => this.handleSaveStockAdjust());

    // Customers & Udhar
    document.getElementById('cust-btn-add').addEventListener('click', () => this.openModal(this.modalCustomer));
    document.getElementById('pos-btn-add-cust').addEventListener('click', () => this.openModal(this.modalCustomer));
    document.getElementById('cust-form-btn-submit').addEventListener('click', () => this.handleSaveCustomer());
    document.getElementById('cust-pay-btn-submit').addEventListener('click', () => this.handleSaveCustomerPayment());
    document.getElementById('cust-search-input').addEventListener('input', (e) => this.loadCustomersList(e.target.value));

    // Suppliers & Payables
    const suppBtnAdd = document.getElementById('supp-btn-add');
    if (suppBtnAdd) suppBtnAdd.addEventListener('click', () => this.openModal(this.modalSupplier));
    const suppBtnSubmit = document.getElementById('supp-form-btn-submit');
    if (suppBtnSubmit) suppBtnSubmit.addEventListener('click', () => this.handleSaveSupplier());
    const suppPaySubmit = document.getElementById('supp-pay-btn-submit');
    if (suppPaySubmit) suppPaySubmit.addEventListener('click', () => this.handleSaveSupplierPayment());

    // Purchases
    const purBtnAdd = document.getElementById('purchases-btn-add');
    if (purBtnAdd) purBtnAdd.addEventListener('click', () => this.openAddPurchaseModal());
    const purBtnSubmit = document.getElementById('pur-form-btn-submit');
    if (purBtnSubmit) purBtnSubmit.addEventListener('click', () => this.handleSavePurchase());

    // Expenses
    document.getElementById('exp-btn-add').addEventListener('click', () => this.openModal(this.modalExpense));
    document.getElementById('exp-form-btn-submit').addEventListener('click', () => this.handleSaveExpense());

    // Settings
    const btnSaveShop = document.getElementById('set-btn-save-shop');
    if (btnSaveShop) btnSaveShop.addEventListener('click', () => this.handleSaveSettings());
    const btnSaveSettings = document.getElementById('settings-btn-save');
    if (btnSaveSettings) btnSaveSettings.addEventListener('click', () => this.handleSaveSettings());
    document.getElementById('set-btn-manual-backup').addEventListener('click', () => this.handleCreateBackup());
    document.getElementById('set-btn-test-print').addEventListener('click', () => this.handleTestPrint());

    // Reports
    document.getElementById('rep-btn-run').addEventListener('click', () => this.loadReports());

    // Bills Filter
    document.getElementById('bills-btn-filter').addEventListener('click', () => this.loadBillsList());

    // Print Receipt Modal Print Button
    document.getElementById('receipt-btn-print').addEventListener('click', async () => {
      if (this.currentPreviewSale) {
        await window.posEngine.printSaleReceipt(this.currentPreviewSale);
        this.closeModal(this.modalReceiptPreview);
      }
    });
  }

  async start() {
    try {
      this.settings = await window.api.settings.getSettings();
      if (this.settings.shop_name) {
        this.hdrShopName.textContent = this.settings.shop_name;
      }

      if (window.i18n) {
        window.i18n.applyTranslations();
      }

      const user = await window.api.auth.getCurrentUser();
      if (user) {
        this.setCurrentUser(user);
      } else {
        this.showLoginModal();
      }
    } catch (e) {
      console.error('App start error:', e);
      this.showLoginModal();
    }
  }

  showLoginModal() {
    this.openModal(this.modalLogin);
    document.getElementById('login-username').focus();
  }

  async handleLogin() {
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;

    if (!u || !p) {
      this.showToast('Please enter both username and password', 'error');
      return;
    }

    try {
      const user = await window.api.auth.login(u, p);
      this.closeModal(this.modalLogin);
      this.setCurrentUser(user);
      this.showToast(`Welcome back, ${user.full_name}!`, 'success');
    } catch (err) {
      this.showToast(err.message || 'Login failed', 'error');
    }
  }

  setCurrentUser(user) {
    this.currentUser = user;
    this.hdrUserName.textContent = user.full_name;
    this.hdrUserRole.textContent = user.role.toUpperCase();
    this.hdrUserRole.className = `user-badge ${user.role}`;

    // Hide or show owner-only nav items
    const isOwner = user.role === 'owner';
    document.querySelectorAll('.nav-item.owner-only').forEach(el => {
      el.style.display = isOwner ? 'flex' : 'none';
    });

    if (window.i18n) {
      window.i18n.applyTranslations();
    }

    // Initialize POS Engine
    if (!window.posEngine) {
      window.posEngine = new PosEngine();
    }

    // Refresh active cash session & customer lists
    this.refreshCashSession();
    this.loadCustomersForPos();
    this.loadCategoriesAndUnits();
    this.navigateToPage('pos');
  }

  async refreshCashSession() {
    try {
      const session = await window.api.cash.getActiveSession();
      this.activeCashSession = session;
      const isMr = window.i18n && window.i18n.currentLang === 'mr';
      if (session) {
        this.cashSessionBtn.className = 'cash-session-pill open';
        const prefix = isMr ? 'गल्ला चालू' : 'Counter Open';
        this.cashSessionText.textContent = `${prefix}: ₹${(session.opening_cash / 100).toFixed(0)}`;
      } else {
        this.cashSessionBtn.className = 'cash-session-pill closed';
        this.cashSessionText.textContent = isMr ? 'गल्ला बंद (सुरू करण्यासाठी क्लिक करा)' : 'Cash Counter Closed (Click to Open)';
      }
    } catch (e) {
      console.warn('Cash session refresh error:', e);
    }
  }

  async handleCashOpen() {
    const amountRupees = parseFloat(document.getElementById('cash-open-amount').value) || 0;
    const notes = document.getElementById('cash-open-notes').value.trim();

    try {
      await window.api.cash.openSession({
        opening_cash: Math.round(amountRupees * 100),
        notes,
      });
      this.closeModal(this.modalCashOpen);
      this.refreshCashSession();
      this.showToast('Cash counter session opened successfully!', 'success');
    } catch (e) {
      this.showToast(e.message || 'Could not open cash session', 'error');
    }
  }

  async handleCashClose() {
    const actualRupees = parseFloat(document.getElementById('cash-close-actual').value) || 0;
    const notes = document.getElementById('cash-close-notes').value.trim();

    try {
      const closed = await window.api.cash.closeSession({
        session_id: this.activeCashSession.id,
        actual_cash: Math.round(actualRupees * 100),
        notes,
      });

      this.closeModal(this.modalCashClose);
      this.refreshCashSession();

      const diff = closed.cash_difference / 100;
      const diffMsg = diff === 0 ? 'Cash drawer balanced perfectly.' : (diff > 0 ? `Surplus cash: +₹${diff.toFixed(2)}` : `Shortage: -₹${Math.abs(diff).toFixed(2)}`);
      this.showToast(`Counter closed. Expected: ₹${(closed.expected_cash / 100).toFixed(2)}. ${diffMsg}`, 'info');
    } catch (e) {
      this.showToast(e.message || 'Could not close cash session', 'error');
    }
  }

  toggleMobileSidebar(open) {
    if (!this.sidebar) return;
    const shouldOpen = open === undefined ? !this.sidebar.classList.contains('sidebar-open') : Boolean(open);
    this.sidebar.classList.toggle('sidebar-open', shouldOpen);
    if (this.sidebarBackdrop) {
      this.sidebarBackdrop.classList.toggle('active', shouldOpen);
    }
  }

  navigateToPage(pageId) {
    this.navItems.forEach(n => {
      n.classList.toggle('active', n.dataset.page === pageId);
    });

    if (this.bottomNavItems) {
      this.bottomNavItems.forEach(b => {
        b.classList.toggle('active', b.dataset.page === pageId);
      });
    }

    this.pageViews.forEach(p => {
      p.classList.toggle('active', p.id === `page-${pageId}`);
    });

    this.toggleMobileSidebar(false);

    // Trigger page-specific data loader
    switch (pageId) {
      case 'pos':
        document.getElementById('pos-search-input').focus();
        break;
      case 'dashboard':
        this.loadDashboard();
        break;
      case 'bills':
        this.loadBillsList();
        break;
      case 'products':
        this.loadProductsList();
        break;
      case 'stock':
        this.loadStockMovements();
        break;
      case 'purchases':
        this.loadPurchasesList();
        break;
      case 'customers':
        this.loadCustomersList();
        break;
      case 'suppliers':
        this.loadSuppliersList();
        break;
      case 'expenses':
        this.loadExpensesList();
        break;
      case 'reports':
        this.loadReports();
        break;
      case 'settings':
        this.loadSettingsPage();
        break;
    }
  }

  // ==================== DASHBOARD ====================
  async loadDashboard() {
    try {
      const stats = await window.api.reports.getDashboardStats();

      document.getElementById('dash-stat-sales').textContent = `₹${(stats.today.total_sales / 100).toFixed(2)}`;
      document.getElementById('dash-stat-bills').textContent = `${stats.today.total_bills} bills completed today`;

      // Cash collection vs digital
      let cashTotal = 0;
      let digitalTotal = 0;
      stats.today.collections_by_mode.forEach(c => {
        if (c.payment_mode === 'cash') cashTotal += c.amount;
        else digitalTotal += c.amount;
      });

      document.getElementById('dash-stat-cash').textContent = `₹${(cashTotal / 100).toFixed(2)}`;
      document.getElementById('dash-stat-digital').textContent = `₹${(digitalTotal / 100).toFixed(2)}`;
      document.getElementById('dash-stat-udhar').textContent = `₹${(stats.summary.total_udhar / 100).toFixed(2)}`;
      document.getElementById('dash-stat-lowstock').textContent = stats.summary.low_stock_count;
      document.getElementById('dash-stat-payables').textContent = `₹${(stats.summary.total_payable / 100).toFixed(2)}`;

      // Recent bills
      const recentTbody = document.getElementById('dash-recent-sales-tbody');
      recentTbody.innerHTML = stats.recent_sales.map(s => `
        <tr>
          <td><strong>${s.invoice_number}</strong></td>
          <td>${s.customer_name || 'Walk-in'}</td>
          <td style="color: var(--accent-green); font-weight: bold;">₹${(s.grand_total / 100).toFixed(2)}</td>
          <td><span class="user-badge" style="background: #334155;">${s.status}</span></td>
        </tr>
      `).join('') || '<tr><td colspan="4" style="text-align:center; color: var(--text-dim);">No sales recorded yet</td></tr>';

      // Top products
      const topTbody = document.getElementById('dash-top-products-tbody');
      topTbody.innerHTML = stats.top_products.map(p => `
        <tr>
          <td>${p.product_name}</td>
          <td>${p.total_qty} ${p.unit_code}</td>
          <td style="color: var(--accent-green); font-weight: bold;">₹${(p.total_revenue / 100).toFixed(2)}</td>
        </tr>
      `).join('') || '<tr><td colspan="3" style="text-align:center; color: var(--text-dim);">No products sold this month</td></tr>';
    } catch (e) {
      console.error('Error loading dashboard:', e);
    }
  }

  // ==================== BILLS HISTORY & REPRINT ====================
  async loadBillsList() {
    const from = document.getElementById('bills-filter-from').value;
    const to = document.getElementById('bills-filter-to').value;

    try {
      const sales = await window.api.sales.getSalesList({ from_date: from, to_date: to, limit: 50 });
      const tbody = document.getElementById('bills-table-tbody');

      if (!sales || sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 20px; color: var(--text-dim);">No bills found</td></tr>';
        return;
      }

      tbody.innerHTML = sales.map(s => `
        <tr>
          <td><strong>${s.invoice_number}</strong></td>
          <td>${new Date(s.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
          <td>${s.customer_name || 'Walk-in'}</td>
          <td>${s.item_count} items</td>
          <td style="font-weight: 700; color: var(--accent-green);">₹${(s.grand_total / 100).toFixed(2)}</td>
          <td>₹${(s.paid_amount / 100).toFixed(2)}</td>
          <td style="color: ${s.credit_amount > 0 ? 'var(--accent-amber)' : 'inherit'};">₹${(s.credit_amount / 100).toFixed(2)}</td>
          <td><span class="user-badge" style="background: ${s.status === 'completed' ? '#059669' : '#dc2626'};">${s.status}</span></td>
          <td>${s.cashier_username || ''}</td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm" onclick="window.app.previewBill(${s.id})">🖨️ Reprint</button>
            ${s.status === 'completed' && this.currentUser.role === 'owner' ? `
              <button class="btn btn-danger btn-sm" onclick="window.app.cancelBill(${s.id})">Void</button>
            ` : ''}
          </td>
        </tr>
      `).join('');
    } catch (e) {
      console.error('Error loading bills:', e);
    }
  }

  async previewBill(saleId) {
    try {
      const sale = await window.api.sales.getSaleById(saleId);
      if (!sale) return;

      this.currentPreviewSale = sale;
      const settings = await window.api.settings.getSettings();
      const content = document.getElementById('receipt-preview-content');
      content.innerHTML = window.generateThermalReceiptHtml(sale, settings, false);
      this.openModal(this.modalReceiptPreview);
    } catch (e) {
      this.showToast('Could not load bill details', 'error');
    }
  }

  async cancelBill(saleId) {
    const reason = prompt('Enter reason for voiding/cancelling this bill:');
    if (!reason) return;

    try {
      const res = await window.api.sales.cancelSale(saleId, reason);
      this.showToast(res.message, 'success');
      this.loadBillsList();
    } catch (e) {
      this.showToast(e.message || 'Failed to void bill', 'error');
    }
  }

  // ==================== PRODUCTS ====================
  async loadProductsList(searchQuery = '') {
    const catId = document.getElementById('prod-cat-filter').value;
    try {
      const prods = await window.api.master.getProducts({
        query: searchQuery,
        category_id: catId ? Number(catId) : null,
        active_only: false,
        limit: 100,
      });

      const tbody = document.getElementById('prod-table-tbody');
      if (!prods || prods.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 20px; color: var(--text-dim);">No products found</td></tr>';
        return;
      }

      tbody.innerHTML = prods.map(p => `
        <tr>
          <td>${p.quick_code ? `<span class="badge-quick-code">#${p.quick_code}</span>` : '<span style="color:var(--text-dim); font-size:12px;">-</span>'}</td>
          <td><strong>${p.barcode || p.sku || '-'}</strong></td>
          <td>
            <div style="font-weight: 600;">${p.name}</div>
            ${p.name_regional ? `<div style="font-size: 11px; color: var(--text-muted);">${p.name_regional}</div>` : ''}
          </td>
          <td>${p.category_name || '-'}</td>
          <td>${p.unit_code}</td>
          <td style="text-align: right;">₹${(p.purchase_cost / 100).toFixed(2)}</td>
          <td style="text-align: right; font-weight: 700; color: var(--accent-green);">₹${(p.selling_price / 100).toFixed(2)}</td>
          <td style="text-align: right;">₹${(p.mrp / 100).toFixed(2)}</td>
          <td style="text-align: right; font-weight: 700; color: ${p.current_stock <= p.min_stock_alert ? 'var(--accent-red)' : 'inherit'};">
            ${p.current_stock}
          </td>
          <td>
            <span class="user-badge" style="background: ${p.is_active ? '#059669' : '#64748b'};">${p.is_active ? 'Active' : 'Disabled'}</span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-secondary btn-sm" onclick="window.app.openBarcodeStickerModal(${p.id})" title="सुट्टा मालासाठी बारकोड स्टिकर प्रिंट करा">🏷️ स्टिकर</button>
            ${this.currentUser.role === 'owner' ? `
              <button class="btn btn-secondary btn-sm" onclick="window.app.editProduct(${p.id})">Edit</button>
            ` : ''}
          </td>
        </tr>
      `).join('');
    } catch (e) {
      console.error('Error loading products:', e);
    }
  }

  async loadCategoriesAndUnits() {
    try {
      const cats = await window.api.master.getCategories();
      const units = await window.api.master.getUnits();

      const catFilter = document.getElementById('prod-cat-filter');
      const catForm = document.getElementById('prod-form-category');
      const unitForm = document.getElementById('prod-form-unit');

      catFilter.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      catForm.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      unitForm.innerHTML = units.map(u => `<option value="${u.short_code}">${u.name} (${u.short_code})</option>`).join('');
    } catch (e) {
      console.warn('Error loading categories & units:', e);
    }
  }

  openAddProductModal() {
    document.getElementById('prod-modal-title').textContent = '📦 Add New Product';
    document.getElementById('prod-form-id').value = '';
    document.getElementById('prod-form-name').value = '';
    document.getElementById('prod-form-name-regional').value = '';
    document.getElementById('prod-form-barcode').value = '';
    document.getElementById('prod-form-sku').value = '';
    const quickCodeEl = document.getElementById('prod-form-quick-code');
    if (quickCodeEl) quickCodeEl.value = '';
    document.getElementById('prod-form-cost').value = 0;
    document.getElementById('prod-form-price').value = 0;
    document.getElementById('prod-form-mrp').value = 0;
    document.getElementById('prod-form-stock').value = 10;
    document.getElementById('prod-form-stock').disabled = false;
    this.openModal(this.modalProduct);
  }

  async editProduct(id) {
    try {
      const p = await window.api.master.getProductById(id);
      if (!p) return;

      document.getElementById('prod-modal-title').textContent = '✏️ Edit Product';
      document.getElementById('prod-form-id').value = p.id;
      document.getElementById('prod-form-name').value = p.name;
      document.getElementById('prod-form-name-regional').value = p.name_regional || '';
      document.getElementById('prod-form-barcode').value = p.barcode || '';
      document.getElementById('prod-form-sku').value = p.sku || '';
      const quickCodeEl = document.getElementById('prod-form-quick-code');
      if (quickCodeEl) quickCodeEl.value = p.quick_code || '';
      document.getElementById('prod-form-category').value = p.category_id || '';
      document.getElementById('prod-form-unit').value = p.unit_code || 'pcs';
      document.getElementById('prod-form-cost').value = (p.purchase_cost / 100).toFixed(2);
      document.getElementById('prod-form-price').value = (p.selling_price / 100).toFixed(2);
      document.getElementById('prod-form-mrp').value = (p.mrp / 100).toFixed(2);
      document.getElementById('prod-form-tax').value = p.tax_rate;
      document.getElementById('prod-form-stock').value = p.current_stock;
      document.getElementById('prod-form-stock').disabled = true; // Use stock adjustment for existing products
      document.getElementById('prod-form-min-alert').value = p.min_stock_alert;

      this.openModal(this.modalProduct);
    } catch (e) {
      this.showToast('Could not load product for editing', 'error');
    }
  }

  async handleSaveProduct() {
    const id = document.getElementById('prod-form-id').value;
    const name = document.getElementById('prod-form-name').value.trim();
    const nameRegional = document.getElementById('prod-form-name-regional').value.trim();
    const barcode = document.getElementById('prod-form-barcode').value.trim();
    const sku = document.getElementById('prod-form-sku').value.trim();
    const quickCode = (document.getElementById('prod-form-quick-code')?.value || '').trim();
    const catId = document.getElementById('prod-form-category').value;
    const unitCode = document.getElementById('prod-form-unit').value;
    const costRupees = parseFloat(document.getElementById('prod-form-cost').value) || 0;
    const priceRupees = parseFloat(document.getElementById('prod-form-price').value) || 0;
    const mrpRupees = parseFloat(document.getElementById('prod-form-mrp').value) || 0;
    const taxRate = parseFloat(document.getElementById('prod-form-tax').value) || 0;
    const stock = parseFloat(document.getElementById('prod-form-stock').value) || 0;
    const minAlert = parseFloat(document.getElementById('prod-form-min-alert').value) || 5;

    if (!name) {
      this.showToast('Product name is required!', 'error');
      return;
    }

    const payload = {
      name,
      name_regional: nameRegional,
      barcode: barcode || null,
      sku: sku || null,
      quick_code: quickCode || null,
      category_id: catId ? Number(catId) : null,
      unit_code: unitCode,
      purchase_cost: Math.round(costRupees * 100),
      selling_price: Math.round(priceRupees * 100),
      mrp: Math.round(mrpRupees * 100),
      tax_rate: taxRate,
      current_stock: stock,
      min_stock_alert: minAlert,
      is_active: 1,
    };

    if (id) {
      payload.id = Number(id);
    }

    try {
      await window.api.master.saveProduct(payload);
      this.closeModal(this.modalProduct);
      this.loadProductsList();
      if (window.posEngine) {
        window.posEngine.renderBabaQuickBar();
      }
      this.showToast('Product saved successfully!', 'success');
    } catch (e) {
      this.showToast(e.message || 'Error saving product', 'error');
    }
  }

  // ==================== BARCODE STICKER GENERATOR (सुट्टा किराणा स्टिकर प्रिंटर) ====================
  async openBarcodeStickerModal(selectedProductId = null) {
    try {
      const prods = await window.api.master.getProducts();
      const sel = document.getElementById('sticker-product-select');
      if (!sel) return;

      sel.innerHTML = (prods || []).map(p => `
        <option value="${p.id}" ${selectedProductId && p.id === Number(selectedProductId) ? 'selected' : ''}>
          ${p.quick_code ? `[#${p.quick_code}] ` : ''}${p.name} ${p.name_regional ? `(${p.name_regional})` : ''} - ₹${(p.selling_price / 100).toFixed(2)}
        </option>
      `).join('');

      this.currentStickerProducts = prods;
      this.updateStickerPreview();
      this.openModal(this.modalBarcodeSticker);
    } catch (err) {
      console.error('Error opening sticker modal:', err);
      this.showToast('स्टिकर प्रिंटर उघडताना एरर आला', 'error');
    }
  }

  updateStickerPreview() {
    const sel = document.getElementById('sticker-product-select');
    const previewContainer = document.getElementById('single-sticker-preview');
    if (!sel || !previewContainer) return;

    const prodId = Number(sel.value);
    const prod = (this.currentStickerProducts || []).find(p => p.id === prodId);
    if (!prod) {
      previewContainer.innerHTML = '<span style="color: #64748b;">कोणतीही वस्तू निवडली नाही</span>';
      return;
    }

    const showShop = document.getElementById('sticker-show-shop')?.value !== 'no';
    const showCode = document.getElementById('sticker-show-code')?.value !== 'no';
    const shopName = this.settings?.shop_name || 'किराणा स्टोअर';

    // Ensure barcode exists (generate synthetic EAN/Code128 if missing)
    const barcode = prod.barcode || prod.sku || ('8901' + String(prod.id).padStart(8, '0'));
    const displayName = prod.name_regional || prod.name;
    const mrpVal = prod.mrp ? Math.round(prod.mrp / 100) : 0;
    const sellVal = Math.round(prod.selling_price / 100);
    const mrpStr = mrpVal > sellVal ? `MRP: ₹${mrpVal}` : '';
    const sellStr = `₹${sellVal}`;
    const unitStr = prod.unit_code ? `/${prod.unit_code}` : '';

    previewContainer.innerHTML = `
      ${showShop ? `<div class="stk-shop">${shopName}</div>` : ''}
      <div class="stk-name">
        ${showCode && prod.quick_code ? `<span class="stk-quick-tag">#${prod.quick_code}</span> ` : ''}
        ${displayName}
      </div>
      <div class="stk-prices">
        ${mrpStr ? `<span class="stk-mrp">${mrpStr}</span>` : ''}
        <span class="stk-sell">दर: ${sellStr} ${unitStr}</span>
      </div>
      <svg id="sticker-preview-svg"></svg>
    `;

    // Render Barcode via JsBarcode
    try {
      if (typeof JsBarcode !== 'undefined') {
        JsBarcode('#sticker-preview-svg', barcode, {
          format: 'CODE128',
          width: 1.4,
          height: 36,
          displayValue: true,
          fontSize: 11,
          font: 'monospace',
          textMargin: 2,
          margin: 2
        });
      }
    } catch (e) {
      console.warn('JsBarcode render error in preview:', e);
    }
  }

  printBarcodeStickers() {
    const sel = document.getElementById('sticker-product-select');
    const layout = document.getElementById('sticker-layout-select')?.value || 'a4_24';
    const qtyInput = document.getElementById('sticker-quantity-input');
    const count = Math.max(1, Math.min(200, parseInt(qtyInput?.value, 10) || 24));
    const showShop = document.getElementById('sticker-show-shop')?.value !== 'no';
    const showCode = document.getElementById('sticker-show-code')?.value !== 'no';
    const printContainer = document.getElementById('barcode-stickers-print-container');

    if (!sel || !printContainer) return;

    const prodId = Number(sel.value);
    const prod = (this.currentStickerProducts || []).find(p => p.id === prodId);
    if (!prod) {
      this.showToast('कृपया वस्तू निवडा!', 'error');
      return;
    }

    const shopName = this.settings?.shop_name || 'किराणा स्टोअर';
    const barcode = prod.barcode || prod.sku || ('8901' + String(prod.id).padStart(8, '0'));
    const displayName = prod.name_regional || prod.name;
    const mrpVal = prod.mrp ? Math.round(prod.mrp / 100) : 0;
    const sellVal = Math.round(prod.selling_price / 100);
    const mrpStr = mrpVal > sellVal ? `MRP: ₹${mrpVal}` : '';
    const sellStr = `₹${sellVal}`;
    const unitStr = prod.unit_code ? `/${prod.unit_code}` : '';

    printContainer.className = `barcode-print-${layout}`;
    printContainer.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = `sticker-grid sticker-grid-${layout}`;

    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.className = `sticker-label-item sticker-item-${layout}`;
      item.innerHTML = `
        ${showShop ? `<div class="stk-shop-print">${shopName}</div>` : ''}
        <div class="stk-name-print">
          ${showCode && prod.quick_code ? `<span class="stk-code-tag-print">#${prod.quick_code}</span> ` : ''}
          ${displayName}
        </div>
        <div class="stk-prices-print">
          ${mrpStr ? `<span class="stk-mrp-print">${mrpStr}</span>` : ''}
          <span class="stk-sell-print">दर: ${sellStr} ${unitStr}</span>
        </div>
        <svg class="stk-barcode-svg-print" id="stk-svg-${i}"></svg>
      `;
      grid.appendChild(item);
    }

    printContainer.appendChild(grid);

    // Render barcodes on each sticker SVG
    if (typeof JsBarcode !== 'undefined') {
      for (let i = 0; i < count; i++) {
        try {
          const barcodeHeight = layout === 'a4_40' ? 22 : (layout === 'thermal_single' ? 32 : 28);
          JsBarcode(`#stk-svg-${i}`, barcode, {
            format: 'CODE128',
            width: layout === 'a4_40' ? 1.05 : 1.25,
            height: barcodeHeight,
            displayValue: true,
            fontSize: 9.5,
            font: 'monospace',
            textMargin: 1,
            margin: 1
          });
        } catch (err) {
          console.warn('JsBarcode print item error:', err);
        }
      }
    }

    // Trigger Print
    setTimeout(() => {
      window.print();
    }, 150);
  }

  // ==================== STOCK ADJUSTMENTS ====================
  async loadStockMovements() {
    try {
      const movements = await window.api.inventory.getStockMovements({ limit: 50 });
      const tbody = document.getElementById('stock-table-tbody');
      tbody.innerHTML = movements.map(m => `
        <tr>
          <td>${new Date(m.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
          <td><strong>${m.product_name}</strong></td>
          <td><span class="user-badge" style="background: #334155;">${m.movement_type}</span></td>
          <td style="font-weight: 700; color: ${m.quantity_change > 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">
            ${m.quantity_change > 0 ? '+' : ''}${m.quantity_change} ${m.unit_code}
          </td>
          <td><strong>${m.resulting_stock}</strong></td>
          <td>${m.reason || '-'}</td>
          <td>${m.username || 'System'}</td>
        </tr>
      `).join('') || '<tr><td colspan="7" style="text-align:center; padding: 20px; color: var(--text-dim);">No stock movements recorded</td></tr>';
    } catch (e) {
      console.error('Error loading movements:', e);
    }
  }

  async openStockAdjustModal() {
    try {
      const prods = await window.api.master.getProducts({ active_only: true, limit: 200 });
      const select = document.getElementById('stock-adj-product');
      select.innerHTML = prods.map(p => `<option value="${p.id}">${p.name} (Stock: ${p.current_stock} ${p.unit_code})</option>`).join('');
      this.openModal(this.modalStockAdjust);
    } catch (e) {
      this.showToast('Could not load products for stock adjustment', 'error');
    }
  }

  async handleSaveStockAdjust() {
    const prodId = Number(document.getElementById('stock-adj-product').value);
    const type = document.getElementById('stock-adj-type').value;
    const qty = parseFloat(document.getElementById('stock-adj-qty').value) || 0;
    const reason = document.getElementById('stock-adj-reason').value.trim();

    if (!reason) {
      this.showToast('Reason is required for inventory audit trail!', 'error');
      return;
    }

    try {
      await window.api.inventory.adjustStock({
        product_id: prodId,
        movement_type: type,
        quantity_change: qty,
        reason,
      });
      this.closeModal(this.modalStockAdjust);
      this.loadStockMovements();
      this.showToast('Stock adjusted successfully!', 'success');
    } catch (e) {
      this.showToast(e.message || 'Error adjusting stock', 'error');
    }
  }

  // ==================== CUSTOMERS & UDHAR ====================
  async loadCustomersForPos() {
    try {
      const custs = await window.api.parties.getCustomers({ active_only: true });
      const select = document.getElementById('pos-customer-select');
      select.innerHTML = '<option value="">Walk-in Customer (Cash)</option>' +
        custs.map(c => `<option value="${c.id}">${c.name} ${c.phone ? `(${c.phone})` : ''} - Udhar: ₹${(c.current_balance / 100).toFixed(0)}</option>`).join('');
    } catch (e) {
      console.warn('Error loading customers for POS:', e);
    }
  }

  async loadCustomersList(searchQuery = '') {
    try {
      const custs = await window.api.parties.getCustomers({ query: searchQuery, active_only: false });
      const tbody = document.getElementById('cust-table-tbody');
      tbody.innerHTML = custs.map(c => `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${c.phone || '-'}</td>
          <td>${c.address || '-'}</td>
          <td>₹${(c.credit_limit / 100).toFixed(0)}</td>
          <td style="text-align: right; font-weight: 700; color: ${c.current_balance > 0 ? 'var(--accent-amber)' : 'inherit'};">
            ₹${(c.current_balance / 100).toFixed(2)}
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-secondary btn-sm" onclick="window.app.viewCustomerStatement(${c.id})">📜 खातेवही (Statement)</button>
            ${c.current_balance > 0 ? `
              <button class="btn btn-primary btn-sm" onclick="window.app.openCollectPaymentModal(${c.id}, '${c.name.replace(/'/g, "\\'")}', ${c.current_balance})" style="margin-left: 4px;">💰 जमा घ्या</button>
            ` : ''}
          </td>
        </tr>
      `).join('') || '<tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-dim);">No customer records found</td></tr>';
    } catch (e) {
      console.error('Error loading customers:', e);
    }
  }

  async handleSaveCustomer() {
    const name = document.getElementById('cust-form-name').value.trim();
    const phone = document.getElementById('cust-form-phone').value.trim();
    const address = document.getElementById('cust-form-address').value.trim();
    const limitRupees = parseFloat(document.getElementById('cust-form-limit').value) || 0;

    if (!name) {
      this.showToast('Customer name is required!', 'error');
      return;
    }

    try {
      await window.api.parties.saveCustomer({
        name,
        phone,
        address,
        credit_limit: Math.round(limitRupees * 100),
      });

      this.closeModal(this.modalCustomer);
      this.loadCustomersForPos();
      this.loadCustomersList();
      this.showToast(`Customer ${name} saved successfully!`, 'success');
    } catch (e) {
      this.showToast(e.message || 'Error saving customer', 'error');
    }
  }

  openCollectPaymentModal(id, name, balancePaise) {
    document.getElementById('cust-pay-id').value = id;
    document.getElementById('cust-pay-name').textContent = name;
    document.getElementById('cust-pay-balance').textContent = `₹${(balancePaise / 100).toFixed(2)}`;
    document.getElementById('cust-pay-amount').value = (balancePaise / 100).toFixed(0);
    this.openModal(this.modalCustPayment);
  }

  async handleSaveCustomerPayment() {
    const custId = Number(document.getElementById('cust-pay-id').value);
    const amountRupees = parseFloat(document.getElementById('cust-pay-amount').value) || 0;
    const mode = document.getElementById('cust-pay-mode').value;
    const notes = document.getElementById('cust-pay-notes').value.trim();

    if (amountRupees <= 0) {
      this.showToast('Payment amount must be greater than zero!', 'error');
      return;
    }

    try {
      await window.api.parties.recordCustomerPayment({
        party_id: custId,
        amount: Math.round(amountRupees * 100),
        payment_mode: mode,
        transaction_reference: notes,
        notes,
      });

      this.closeModal(this.modalCustPayment);
      this.loadCustomersList();
      this.loadCustomersForPos();
      this.showToast('Udhar repayment recorded successfully!', 'success');
    } catch (e) {
      this.showToast(e.message || 'Error recording payment', 'error');
    }
  }

  // ==================== SUPPLIERS ====================
  async loadSuppliersList() {
    try {
      const supps = await window.api.parties.getSuppliers();
      const tbody = document.getElementById('supp-table-tbody');
      tbody.innerHTML = supps.map(s => `
        <tr>
          <td><strong>${s.name}</strong></td>
          <td>${s.company_name || '-'}</td>
          <td>${s.phone || '-'}</td>
          <td>${s.gstin || '-'}</td>
          <td style="text-align: right; font-weight: 700; color: ${s.current_balance > 0 ? 'var(--accent-red)' : 'inherit'};">
            ₹${(s.current_balance / 100).toFixed(2)}
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-primary btn-sm" onclick="window.app.openSupplierPaymentModal(${s.id}, '${s.name.replace(/'/g, "\\'")}', ${s.current_balance})">💸 पेमेंट जमा करा</button>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-dim);">No suppliers added yet</td></tr>';
    } catch (e) {
      console.error('Error loading suppliers:', e);
    }
  }

  async handleSaveSupplier() {
    const name = document.getElementById('supp-form-name').value.trim();
    const company = document.getElementById('supp-form-company').value.trim();
    const phone = document.getElementById('supp-form-phone').value.trim();
    const gstin = document.getElementById('supp-form-gstin').value.trim();
    const address = document.getElementById('supp-form-address').value.trim();

    if (!name) {
      this.showToast('व्यापारी / फर्मचे नाव आवश्यक आहे!', 'error');
      return;
    }

    try {
      await window.api.parties.saveSupplier({
        name,
        company_name: company,
        phone,
        gstin,
        address,
      });

      this.closeModal(this.modalSupplier);
      this.loadSuppliersList();
      this.showToast(`सप्लायर ${name} सेव्ह झाला!`, 'success');
    } catch (e) {
      this.showToast(e.message || 'सप्लायर सेव्ह करताना एरर आला', 'error');
    }
  }

  openSupplierPaymentModal(id, name, balancePaise) {
    document.getElementById('supp-pay-id').value = id;
    document.getElementById('supp-pay-name').textContent = name;
    document.getElementById('supp-pay-balance').textContent = `₹${(balancePaise / 100).toFixed(2)}`;
    document.getElementById('supp-pay-amount').value = (balancePaise / 100).toFixed(0);
    this.openModal(this.modalSuppPayment);
  }

  async handleSaveSupplierPayment() {
    const suppId = Number(document.getElementById('supp-pay-id').value);
    const amountRupees = parseFloat(document.getElementById('supp-pay-amount').value) || 0;
    const mode = document.getElementById('supp-pay-mode').value;
    const notes = document.getElementById('supp-pay-notes').value.trim();

    if (amountRupees <= 0) {
      this.showToast('रक्कम 0 पेक्षा जास्त असणे आवश्यक आहे!', 'error');
      return;
    }

    try {
      await window.api.parties.recordSupplierPayment({
        party_id: suppId,
        amount: Math.round(amountRupees * 100),
        payment_mode: mode,
        transaction_reference: notes,
        notes,
      });

      this.closeModal(this.modalSuppPayment);
      this.loadSuppliersList();
      this.showToast('सप्लायर पेमेंट यशस्वीरीत्या नोंदवले गेले!', 'success');
    } catch (e) {
      this.showToast(e.message || 'पेमेंट नोंदवताना एरर आला', 'error');
    }
  }

  // ==================== PURCHASES ====================
  async loadPurchasesList() {
    try {
      const purchases = await window.api.purchases.getPurchasesList({ limit: 50 });
      const tbody = document.getElementById('purchases-table-tbody');
      tbody.innerHTML = purchases.map(p => `
        <tr>
          <td><strong>${p.purchase_invoice_no}</strong></td>
          <td>${p.supplier_name || 'सप्लायर'}</td>
          <td>${p.purchase_date}</td>
          <td>${p.item_count || 1} वस्तू</td>
          <td style="font-weight: 700; color: var(--accent-blue);">₹${(p.grand_total / 100).toFixed(2)}</td>
          <td>₹${(p.paid_amount / 100).toFixed(2)}</td>
          <td style="color: ${p.balance_due > 0 ? 'var(--accent-red)' : 'inherit'};">₹${(p.balance_due / 100).toFixed(2)}</td>
          <td>${p.recorded_by || 'पप्पा'}</td>
        </tr>
      `).join('') || '<tr><td colspan="8" style="text-align:center; padding: 20px; color: var(--text-dim);">No purchase invoices recorded</td></tr>';
    } catch (e) {
      console.error('Error loading purchases:', e);
    }
  }

  async openAddPurchaseModal() {
    try {
      const supps = await window.api.parties.getSuppliers();
      const prods = await window.api.master.getProducts({ active_only: true, limit: 200 });

      const suppSelect = document.getElementById('pur-form-supplier');
      const prodSelect = document.getElementById('pur-form-product');

      if (!supps || supps.length === 0) {
        this.showToast('कृपया आधी एक सप्लायर जोडा!', 'info');
        this.openModal(this.modalSupplier);
        return;
      }

      suppSelect.innerHTML = supps.map(s => `<option value="${s.id}">${s.name} (${s.company_name || 'फर्म'})</option>`).join('');
      prodSelect.innerHTML = prods.map(p => `<option value="${p.id}">${p.name} (चालू खरेदी: ₹${(p.purchase_cost / 100).toFixed(2)})</option>`).join('');

      document.getElementById('pur-form-invoice-no').value = `BILL-${Date.now().toString().slice(-4)}`;
      this.openModal(this.modalPurchase);
    } catch (e) {
      this.showToast('खरेदी फॉर्म उघडताना एरर आला', 'error');
    }
  }

  async handleSavePurchase() {
    const suppId = Number(document.getElementById('pur-form-supplier').value);
    const invNo = document.getElementById('pur-form-invoice-no').value.trim();
    const prodId = Number(document.getElementById('pur-form-product').value);
    const qty = parseFloat(document.getElementById('pur-form-qty').value) || 0;
    const costRupees = parseFloat(document.getElementById('pur-form-cost').value) || 0;
    const paidRupees = parseFloat(document.getElementById('pur-form-paid').value) || 0;
    const mode = document.getElementById('pur-form-mode').value;

    if (!invNo || qty <= 0 || costRupees <= 0) {
      this.showToast('कृपया बिल क्र., नग आणि खरेदी भाव भरा!', 'error');
      return;
    }

    const costPaise = Math.round(costRupees * 100);
    const totalCostPaise = Math.round(qty * costPaise);
    const paidPaise = Math.round(paidRupees * 100);
    const balanceDuePaise = Math.max(0, totalCostPaise - paidPaise);

    const payload = {
      supplier_id: suppId,
      purchase_invoice_no: invNo,
      purchase_date: new Date().toISOString().slice(0, 10),
      items: [
        {
          product_id: prodId,
          quantity: qty,
          unit_cost: costPaise,
          tax_rate: 0,
          tax_amount: 0,
          total_cost: totalCostPaise,
        },
      ],
      subtotal: totalCostPaise,
      discount_amount: 0,
      tax_amount: 0,
      grand_total: totalCostPaise,
      paid_amount: paidPaise,
      balance_due: balanceDuePaise,
      payment_mode: mode,
      notes: `खरेदी बिल ${invNo}`,
    };

    try {
      await window.api.purchases.createPurchase(payload);
      this.closeModal(this.modalPurchase);
      this.loadPurchasesList();
      this.loadProductsList();
      this.showToast('खरेदी नोंद यशस्वीरीत्या सेव्ह झाली व स्टॉक वाढवला गेला!', 'success');
    } catch (e) {
      this.showToast(e.message || 'खरेदी नोंद सेव्ह करताना एरर आला', 'error');
    }
  }

  async viewCustomerStatement(custId) {
    try {
      const res = await window.api.parties.getCustomerLedger(custId);
      const cust = res.customer;
      if (!cust) return;

      document.getElementById('cust-stmt-title').textContent = `📜 ${cust.name} - उधारी खातेवही`;
      document.getElementById('cust-stmt-phone').textContent = `मोबाईल: ${cust.phone || '-'}`;
      document.getElementById('cust-stmt-balance').textContent = `उधारी बाकी: ₹${(cust.current_balance / 100).toFixed(2)}`;

      const tbody = document.getElementById('cust-stmt-tbody');
      tbody.innerHTML = (res.entries || []).map(e => `
        <tr>
          <td>${new Date(e.created_at).toLocaleDateString('en-IN')}</td>
          <td><span class="user-badge" style="background: ${e.entry_type === 'debit' ? '#dc2626' : '#059669'};">${e.entry_type === 'debit' ? 'उधारी माल' : 'जमा (पावती)'}</span></td>
          <td>${e.description || '-'}</td>
          <td style="text-align: right; font-weight: bold;">₹${(e.amount / 100).toFixed(2)}</td>
          <td style="text-align: right; font-weight: 700; color: var(--accent-amber);">₹${(e.running_balance / 100).toFixed(2)}</td>
        </tr>
      `).join('') || '<tr><td colspan="5" style="text-align:center; padding: 16px; color: var(--text-dim);">या ग्राहकाचे अजून कोणतेही जुने व्यवहार नाहीत</td></tr>';

      this.openModal(this.modalCustStatement);
    } catch (e) {
      this.showToast('खातेवही उतारा उघडताना एरर आला', 'error');
    }
  }

  // ==================== EXPENSES ====================
  async loadExpensesList() {
    try {
      const expenses = await window.api.expenses.getExpenses({ limit: 50 });
      const tbody = document.getElementById('exp-table-tbody');
      tbody.innerHTML = expenses.map(e => `
        <tr>
          <td>${e.expense_date}</td>
          <td><strong>${e.category}</strong></td>
          <td>${e.description}</td>
          <td><span class="user-badge" style="background: #334155;">${e.payment_mode.toUpperCase()}</span></td>
          <td style="text-align: right; font-weight: 700; color: var(--accent-red);">₹${(e.amount / 100).toFixed(2)}</td>
          <td>${e.recorded_by}</td>
          <td style="text-align: right;">
            ${this.currentUser.role === 'owner' ? `
              <button class="win-btn close" onclick="window.app.deleteExpense(${e.id})">✕</button>
            ` : ''}
          </td>
        </tr>
      `).join('') || '<tr><td colspan="7" style="text-align:center; padding: 20px; color: var(--text-dim);">No expenses recorded</td></tr>';
    } catch (e) {
      console.error('Error loading expenses:', e);
    }
  }

  async handleSaveExpense() {
    const cat = document.getElementById('exp-form-category').value;
    const amountRupees = parseFloat(document.getElementById('exp-form-amount').value) || 0;
    const mode = document.getElementById('exp-form-mode').value;
    const desc = document.getElementById('exp-form-desc').value.trim();

    if (amountRupees <= 0 || !desc) {
      this.showToast('Please enter a valid amount and description', 'error');
      return;
    }

    try {
      await window.api.expenses.saveExpense({
        category: cat,
        amount: Math.round(amountRupees * 100),
        payment_mode: mode,
        description: desc,
        expense_date: new Date().toISOString().slice(0, 10),
      });

      this.closeModal(this.modalExpense);
      this.loadExpensesList();
      this.showToast('Expense recorded successfully!', 'success');
    } catch (e) {
      this.showToast(e.message || 'Error recording expense', 'error');
    }
  }

  async deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await window.api.expenses.deleteExpense(id);
      this.loadExpensesList();
      this.showToast('Expense deleted', 'info');
    } catch (e) {
      this.showToast(e.message || 'Error deleting expense', 'error');
    }
  }

  // ==================== REPORTS ====================
  async loadReports() {
    const today = new Date().toISOString().slice(0, 10);
    const from = document.getElementById('rep-from-date').value || `${today.slice(0, 7)}-01`;
    const to = document.getElementById('rep-to-date').value || today;

    document.getElementById('rep-from-date').value = from;
    document.getElementById('rep-to-date').value = to;

    try {
      const pl = await window.api.reports.getProfitLossReport({ from_date: from, to_date: to });
      document.getElementById('rep-val-revenue').textContent = `₹${(pl.revenue / 100).toFixed(2)}`;
      document.getElementById('rep-val-cogs').textContent = `₹${(pl.cogs / 100).toFixed(2)}`;
      document.getElementById('rep-val-gross').textContent = `₹${(pl.grossProfit / 100).toFixed(2)}`;
      document.getElementById('rep-val-expenses').textContent = `₹${(pl.expenses / 100).toFixed(2)}`;
      document.getElementById('rep-val-net').textContent = `₹${(pl.netProfit / 100).toFixed(2)}`;

      const stockVal = await window.api.reports.getStockValuationReport();
      document.getElementById('rep-stock-cost-val').textContent = `₹${(stockVal.summary.total_cost_value / 100).toFixed(2)}`;
      document.getElementById('rep-stock-retail-val').textContent = `₹${(stockVal.summary.total_retail_value / 100).toFixed(2)}`;
      document.getElementById('rep-stock-margin-val').textContent = `₹${(stockVal.summary.projected_margin / 100).toFixed(2)}`;
    } catch (e) {
      console.error('Error loading reports:', e);
    }
  }

  // ==================== SETTINGS & BACKUPS ====================
  async loadSettingsPage() {
    try {
      const s = await window.api.settings.getSettings();
      this.settings = s;

      document.getElementById('set-shop-name').value = s.shop_name || '';
      document.getElementById('set-shop-tagline').value = s.shop_tagline || '';
      document.getElementById('set-shop-address').value = s.shop_address || '';
      document.getElementById('set-shop-phone').value = s.shop_phone || '';
      document.getElementById('set-shop-gstin').value = s.shop_gstin || '';
      document.getElementById('set-receipt-footer').value = s.receipt_footer_msg || '';
      document.getElementById('set-printer-width').value = s.printer_width || '80mm';

      // Load printers into dropdown
      const printers = await window.api.printer.getPrinters();
      const printerSelect = document.getElementById('set-printer-name');
      printerSelect.innerHTML = '<option value="">Default System Printer</option>' +
        printers.map(p => `<option value="${p.name}">${p.name} (${p.displayName || p.name})</option>`).join('');
      if (s.printer_name) printerSelect.value = s.printer_name;

      // Load Backups history
      this.loadBackupHistory();
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }

  async loadBackupHistory() {
    try {
      const list = await window.api.backup.getBackupList();
      const tbody = document.getElementById('set-backups-tbody');
      tbody.innerHTML = list.map(b => `
        <tr>
          <td><strong>${b.backup_file_name}</strong></td>
          <td><span class="user-badge" style="background: #334155;">${b.backup_type}</span></td>
          <td>${(b.backup_size_bytes / 1024).toFixed(1)} KB</td>
          <td>${new Date(b.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
          <td><span class="user-badge" style="background: ${b.status === 'success' ? '#059669' : '#dc2626'};">${b.status}</span></td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm" onclick="window.app.handleRestoreBackup('${b.backup_file_path.replace(/\\/g, '\\\\')}')">Restore</button>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-dim);">No backup records yet</td></tr>';
    } catch (e) {
      console.error('Error loading backup list:', e);
    }
  }

  async handleSaveSettings() {
    const payload = {
      shop_name: document.getElementById('set-shop-name').value.trim(),
      shop_tagline: document.getElementById('set-shop-tagline').value.trim(),
      shop_address: document.getElementById('set-shop-address').value.trim(),
      shop_phone: document.getElementById('set-shop-phone').value.trim(),
      shop_gstin: document.getElementById('set-shop-gstin').value.trim(),
      receipt_footer_msg: document.getElementById('set-receipt-footer').value.trim(),
      printer_width: document.getElementById('set-printer-width').value,
      printer_name: document.getElementById('set-printer-name').value,
    };

    try {
      await window.api.settings.saveSettings(payload);
      this.settings = { ...this.settings, ...payload };
      this.hdrShopName.textContent = payload.shop_name || 'KiranaPOS';
      this.showToast('Settings saved successfully!', 'success');
    } catch (e) {
      this.showToast(e.message || 'Error saving settings', 'error');
    }
  }

  async handleCreateBackup() {
    try {
      this.showToast('Creating database backup...', 'info');
      const res = await window.api.backup.triggerManualBackup();
      this.showToast(`Backup created successfully: ${res.file_name}`, 'success');
      this.loadBackupHistory();
    } catch (e) {
      this.showToast(e.message || 'Backup failed', 'error');
    }
  }

  async handleRestoreBackup(filePath) {
    if (!confirm('WARNING: Restoring will overwrite the current database with this backup copy! (An automatic pre-restore backup will be created). Continue?')) {
      return;
    }

    try {
      this.showToast('Verifying integrity and restoring database...', 'info');
      const res = await window.api.backup.restoreBackup(filePath);
      this.showToast(res.message, 'success');
      this.loadDashboard();
      this.loadBackupHistory();
    } catch (e) {
      this.showToast(e.message || 'Restoration failed', 'error');
    }
  }

  async handleTestPrint() {
    const sampleSale = {
      invoice_number: 'TEST-0001',
      created_at: new Date().toISOString(),
      cashier_name: this.currentUser ? this.currentUser.full_name : 'Owner',
      customer_name: 'Test Customer',
      items: [
        { product_name: 'Aashirvaad Shudh Chakki Atta 5kg', quantity: 1, unit_code: 'pkt', unit_price: 24500, total_price: 24500 },
        { product_name: 'Tata Salt 1kg', quantity: 2, unit_code: 'pkt', unit_price: 2800, total_price: 5600 },
        { product_name: 'Sugar / Chini', quantity: 2.5, unit_code: 'kg', unit_price: 4400, total_price: 11000 },
      ],
      subtotal: 41100,
      discount_amount: 1100,
      tax_amount: 0,
      round_off: 0,
      grand_total: 40000,
      paid_amount: 40000,
      credit_amount: 0,
      payments: [{ payment_mode: 'cash', amount: 40000 }],
    };

    try {
      const s = await window.api.settings.getSettings();
      const printContainer = document.getElementById('receipt-print-container');
      printContainer.innerHTML = window.generateThermalReceiptHtml(sampleSale, s, true);
      await window.api.printer.printReceipt({
        silent: s.printer_silent !== 'false',
        deviceName: s.printer_name || '',
      });
      this.showToast('Test receipt sent to printer!', 'success');
    } catch (e) {
      this.showToast('Test print failed: ' + e.message, 'error');
    }
  }

  // ==================== MODAL & TOAST HELPERS ====================
  openModal(modalEl) {
    if (modalEl) modalEl.classList.add('active');
  }

  closeModal(modalEl) {
    if (modalEl) modalEl.classList.remove('active');
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
  window.app.start();
});
