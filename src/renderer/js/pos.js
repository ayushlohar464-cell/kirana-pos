/**
 * POS Billing Engine, Cart Management & Barcode Scanner Integration
 */

class PosEngine {
  constructor() {
    this.cart = [];
    this.selectedCustomerId = null;
    this.paymentMode = 'cash';
    this.billDiscountPaise = 0;
    this.searchResults = [];
    this.selectedSearchIndex = -1;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.searchInput = document.getElementById('pos-search-input');
    this.searchResultsBox = document.getElementById('pos-search-results');
    this.cartTbody = document.getElementById('pos-cart-tbody');
    this.emptyCartMsg = document.getElementById('pos-empty-cart-msg');
    this.customerSelect = document.getElementById('pos-customer-select');
    this.custUdharInfo = document.getElementById('pos-cust-udhar-info');
    this.custUdharVal = document.getElementById('pos-cust-udhar-val');
    this.custLimitVal = document.getElementById('pos-cust-limit-val');

    this.summaryItems = document.getElementById('pos-summary-items');
    this.summarySubtotal = document.getElementById('pos-summary-subtotal');
    this.discountInput = document.getElementById('pos-discount-input');
    this.summaryTax = document.getElementById('pos-summary-tax');
    this.summaryRoundoff = document.getElementById('pos-summary-roundoff');
    this.summaryGrandTotal = document.getElementById('pos-summary-grandtotal');

    this.tenderInput = document.getElementById('pos-tender-input');
    this.changeVal = document.getElementById('pos-change-val');

    this.btnSavePrint = document.getElementById('pos-btn-save-print');
    this.btnSaveOnly = document.getElementById('pos-btn-save-only');
    this.btnClear = document.getElementById('pos-btn-clear');
    this.btnNewBill = document.getElementById('pos-btn-new-bill');
    this.payModeButtons = document.querySelectorAll('.pay-mode-btn');

    this.babaQuickBar = document.getElementById('baba-quick-bar');
    this.babaQuickItems = document.getElementById('baba-quick-items');

    this.btnMobileScanner = document.getElementById('pos-btn-mobile-scanner');
    this.modalMobileScanner = document.getElementById('modal-mobile-scanner');
    this.scannerAudioCtx = null;
  }

  bindEvents() {
    // Render Baba's 1-Touch Quick Bar (१-टच जलद वस्तू कोड्स)
    this.renderBabaQuickBar();

    // Search input typing & debounce
    let searchDebounce = null;
    this.searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      clearTimeout(searchDebounce);
      if (!q) {
        this.hideSearchResults();
        return;
      }
      searchDebounce = setTimeout(() => this.searchProducts(q), 150);
    });

    // Keyboard navigation in search (Arrow keys & Enter)
    this.searchInput.addEventListener('keydown', async (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateSearch(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateSearch(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const val = this.searchInput.value.trim();
        if (!val) return;

        // 1. Try exact barcode/SKU/quick_code lookup first (instant scanner or Baba quick number entry)
        try {
          const directProd = await window.api.master.getProductByBarcode(val);
          if (directProd) {
            this.addToCart(directProd);
            this.searchInput.value = '';
            this.hideSearchResults();
            return;
          }
        } catch (err) {
          console.warn('Barcode lookup error:', err);
        }

        // 2. Also check if typed val matches any quick_code in searchResults
        if (this.searchResults && this.searchResults.length > 0) {
          const quickMatch = this.searchResults.find(p => p.quick_code && String(p.quick_code).trim().toLowerCase() === val.toLowerCase());
          if (quickMatch) {
            this.addToCart(quickMatch);
            this.searchInput.value = '';
            this.hideSearchResults();
            return;
          }
        }

        // 3. If dropdown is open and an item is highlighted
        if (this.selectedSearchIndex >= 0 && this.searchResults[this.selectedSearchIndex]) {
          this.addToCart(this.searchResults[this.selectedSearchIndex]);
          this.searchInput.value = '';
          this.hideSearchResults();
        } else if (this.searchResults.length === 1) {
          this.addToCart(this.searchResults[0]);
          this.searchInput.value = '';
          this.hideSearchResults();
        }
      } else if (e.key === 'Escape') {
        this.hideSearchResults();
      }
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!this.searchInput.contains(e.target) && !this.searchResultsBox.contains(e.target)) {
        this.hideSearchResults();
      }
    });

    // Customer Selection Change
    this.customerSelect.addEventListener('change', (e) => {
      this.selectedCustomerId = e.target.value ? Number(e.target.value) : null;
      this.updateCustomerCreditInfo();
    });

    // Bill Discount input change
    this.discountInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      this.billDiscountPaise = Math.round(val * 100);
      this.calculateTotals();
    });

    // Tender input change
    this.tenderInput.addEventListener('input', () => {
      this.updateChangeCalculation();
    });

    // Payment Mode buttons
    this.payModeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.payModeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.paymentMode = btn.dataset.mode;
        this.calculateTotals();
      });
    });

    // Button actions
    this.btnSavePrint.addEventListener('click', () => this.handleCheckout(true));
    this.btnSaveOnly.addEventListener('click', () => this.handleCheckout(false));
    this.btnClear.addEventListener('click', () => this.clearCart());
    this.btnNewBill.addEventListener('click', () => this.clearCart());

    // Mobile Barcode Scanner Pairing & Live SSE Stream
    if (this.btnMobileScanner) {
      this.btnMobileScanner.addEventListener('click', () => this.openMobileScannerModal());
    }

    const btnCopyScannerUrl = document.getElementById('btn-copy-scanner-url');
    if (btnCopyScannerUrl) {
      btnCopyScannerUrl.addEventListener('click', () => {
        const linkEl = document.getElementById('mobile-scanner-url-link');
        const url = linkEl ? (linkEl.href || linkEl.textContent) : '';
        if (url) {
          navigator.clipboard.writeText(url).then(() => {
            window.app.showToast('📋 मोबाईल स्कॅनर लिंक कॉपी झाली!', 'info');
          });
        }
      });
    }

    // Global POS Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        this.clearCart();
      } else if (e.key === 'F2') {
        e.preventDefault();
        this.searchInput.focus();
        this.searchInput.select();
      } else if (e.key === 'F3') {
        e.preventDefault();
        this.customerSelect.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        this.handleCheckout(true);
      }
    });

    this.initMobileScannerStream();
  }

  async renderBabaQuickBar() {
    if (!this.babaQuickItems) return;
    try {
      const prods = await window.api.master.getProducts();
      // Filter products that have quick_code assigned
      const quickProds = (prods || []).filter(p => p.quick_code && String(p.quick_code).trim().length > 0);

      // Sort numerically by quick code (1, 2, 3, ...)
      quickProds.sort((a, b) => {
        const numA = parseInt(a.quick_code, 10) || 999;
        const numB = parseInt(b.quick_code, 10) || 999;
        return numA - numB;
      });

      if (quickProds.length === 0) {
        this.babaQuickItems.innerHTML = '<span style="font-size: 11px; color: var(--text-dim); padding: 4px;">उत्पादने मेनूमध्ये जाऊन महत्त्वाच्या किराणा मालावर क्विक नंबर (#१, #२) टाका.</span>';
        return;
      }

      this.babaQuickItems.innerHTML = quickProds.map(p => `
        <button type="button" class="baba-code-btn" data-id="${p.id}" data-code="${p.quick_code}" title="${p.name} बिलामध्ये जोडा">
          <span class="baba-code-num">${p.quick_code}</span>
          <span class="baba-code-name">${p.name_regional || p.name}</span>
          <span class="baba-code-price">₹${(p.selling_price / 100).toFixed(0)}</span>
        </button>
      `).join('');

      // Click listener for quick buttons
      this.babaQuickItems.querySelectorAll('.baba-code-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const id = Number(btn.dataset.id);
          const found = quickProds.find(p => p.id === id);
          if (found) {
            this.addToCart(found);
            if (this.searchInput) this.searchInput.focus();
            window.app.showToast(`✅ ${found.name_regional || found.name} बिलात जोडले!`, 'success');
          }
        });
      });
    } catch (err) {
      console.warn('Error rendering Baba Quick Bar:', err);
    }
  }

  async searchProducts(query) {
    try {
      const results = await window.api.master.searchProducts(query);
      this.searchResults = results;
      this.selectedSearchIndex = -1;

      if (!results || results.length === 0) {
        this.searchResultsBox.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 12px;">No matching items found</div>';
        this.searchResultsBox.style.display = 'block';
        return;
      }

      let html = '';
      results.forEach((p, idx) => {
        html += `
          <div class="search-item-row" data-index="${idx}">
            <div>
              <div class="search-item-name">
                ${p.quick_code ? `<span class="baba-badge-sm">#${p.quick_code}</span>` : ''}
                ${p.name} ${p.name_regional ? `<span style="color: var(--text-muted);">(${p.name_regional})</span>` : ''}
              </div>
              <div class="search-item-sub">Barcode: ${p.barcode || 'N/A'} | Unit: ${p.unit_code} | Stock: ${p.current_stock}</div>
            </div>
            <div class="search-item-price">₹${(p.selling_price / 100).toFixed(2)}</div>
          </div>
        `;
      });

      this.searchResultsBox.innerHTML = html;
      this.searchResultsBox.style.display = 'block';

      // Item row click
      this.searchResultsBox.querySelectorAll('.search-item-row').forEach(row => {
        row.addEventListener('click', () => {
          const idx = Number(row.dataset.index);
          if (this.searchResults[idx]) {
            this.addToCart(this.searchResults[idx]);
            this.searchInput.value = '';
            this.hideSearchResults();
          }
        });
      });
    } catch (e) {
      console.error('Product search error:', e);
    }
  }

  navigateSearch(dir) {
    const rows = this.searchResultsBox.querySelectorAll('.search-item-row');
    if (rows.length === 0) return;

    this.selectedSearchIndex += dir;
    if (this.selectedSearchIndex < 0) this.selectedSearchIndex = rows.length - 1;
    if (this.selectedSearchIndex >= rows.length) this.selectedSearchIndex = 0;

    rows.forEach((r, idx) => {
      r.classList.toggle('selected', idx === this.selectedSearchIndex);
    });

    rows[this.selectedSearchIndex].scrollIntoView({ block: 'nearest' });
  }

  hideSearchResults() {
    this.searchResultsBox.style.display = 'none';
    this.selectedSearchIndex = -1;
  }

  addToCart(product) {
    const existing = this.cart.find(item => item.product_id === product.id);
    if (existing) {
      existing.quantity += 1;
      existing.total_price = Math.round(existing.quantity * existing.unit_price) - existing.discount_amount;
    } else {
      const defaultQty = 1;
      this.cart.push({
        product_id: product.id,
        product_name: product.name,
        unit_code: product.unit_code,
        allow_decimal: product.allow_decimal || 0,
        quantity: defaultQty,
        unit_price: product.selling_price, // paise
        discount_amount: 0,
        tax_rate: product.tax_rate || 0,
        tax_amount: 0,
        total_price: product.selling_price,
        current_stock: product.current_stock,
      });
    }

    this.renderCart();
    this.calculateTotals();
    this.searchInput.focus();
  }

  renderCart() {
    if (this.cart.length === 0) {
      this.cartTbody.innerHTML = '';
      this.emptyCartMsg.style.display = 'block';
      return;
    }

    this.emptyCartMsg.style.display = 'none';
    let html = '';

    this.cart.forEach((item, idx) => {
      const step = item.allow_decimal ? '0.05' : '1';
      html += `
        <tr>
          <td style="color: var(--text-dim);">${idx + 1}</td>
          <td>
            <div style="font-weight: 600;">${item.product_name}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${item.unit_code} | Avail: ${item.current_stock}</div>
          </td>
          <td style="text-align: center;">
            <div class="qty-control">
              <button class="qty-btn" onclick="window.posEngine.updateItemQty(${idx}, -1)">-</button>
              <input type="number" class="qty-input" value="${item.quantity}" min="0.001" step="${step}"
                onchange="window.posEngine.setItemQty(${idx}, this.value)">
              <button class="qty-btn" onclick="window.posEngine.updateItemQty(${idx}, 1)">+</button>
            </div>
          </td>
          <td style="text-align: right;">
            <input type="number" class="text-input" style="width: 76px; text-align: right; padding: 3px;"
              value="${(item.unit_price / 100).toFixed(2)}" step="0.5"
              onchange="window.posEngine.setItemPrice(${idx}, this.value)">
          </td>
          <td style="text-align: right;">
            <input type="number" class="text-input" style="width: 65px; text-align: right; padding: 3px;"
              value="${(item.discount_amount / 100).toFixed(2)}" step="1"
              onchange="window.posEngine.setItemDiscount(${idx}, this.value)">
          </td>
          <td style="text-align: right; font-weight: 700; color: var(--accent-green);">
            ₹${(item.total_price / 100).toFixed(2)}
          </td>
          <td style="text-align: center;">
            <button class="win-btn close" style="width: 24px; height: 24px;" onclick="window.posEngine.removeFromCart(${idx})">✕</button>
          </td>
        </tr>
      `;
    });

    this.cartTbody.innerHTML = html;
  }

  updateItemQty(idx, delta) {
    if (!this.cart[idx]) return;
    const item = this.cart[idx];
    const newQty = Math.round((item.quantity + delta) * 1000) / 1000;
    if (newQty <= 0) {
      this.removeFromCart(idx);
    } else {
      item.quantity = newQty;
      item.total_price = Math.round(item.quantity * item.unit_price) - item.discount_amount;
      this.renderCart();
      this.calculateTotals();
    }
  }

  setItemQty(idx, val) {
    if (!this.cart[idx]) return;
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      this.removeFromCart(idx);
    } else {
      this.cart[idx].quantity = num;
      this.cart[idx].total_price = Math.round(num * this.cart[idx].unit_price) - this.cart[idx].discount_amount;
      this.renderCart();
      this.calculateTotals();
    }
  }

  setItemPrice(idx, val) {
    if (!this.cart[idx]) return;
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      this.cart[idx].unit_price = Math.round(num * 100);
      this.cart[idx].total_price = Math.round(this.cart[idx].quantity * this.cart[idx].unit_price) - this.cart[idx].discount_amount;
      this.renderCart();
      this.calculateTotals();
    }
  }

  setItemDiscount(idx, val) {
    if (!this.cart[idx]) return;
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      this.cart[idx].discount_amount = Math.round(num * 100);
      this.cart[idx].total_price = Math.round(this.cart[idx].quantity * this.cart[idx].unit_price) - this.cart[idx].discount_amount;
      this.renderCart();
      this.calculateTotals();
    }
  }

  removeFromCart(idx) {
    this.cart.splice(idx, 1);
    this.renderCart();
    this.calculateTotals();
  }

  clearCart() {
    this.cart = [];
    this.billDiscountPaise = 0;
    this.discountInput.value = 0;
    this.customerSelect.value = '';
    this.selectedCustomerId = null;
    this.custUdharInfo.style.display = 'none';
    this.tenderInput.value = 0;
    this.changeVal.textContent = '₹0.00';
    this.renderCart();
    this.calculateTotals();
    this.searchInput.focus();
  }

  calculateTotals() {
    let subtotalPaise = 0;
    let totalTaxPaise = 0;
    let totalQty = 0;

    this.cart.forEach(item => {
      subtotalPaise += item.total_price;
      totalQty += item.quantity;

      // Extract GST component if tax_rate > 0
      if (item.tax_rate > 0) {
        const itemTax = Math.round(item.total_price - (item.total_price / (1 + (item.tax_rate / 100))));
        item.tax_amount = itemTax;
        totalTaxPaise += itemTax;
      }
    });

    const netSubtotal = Math.max(0, subtotalPaise - this.billDiscountPaise);
    
    // Round to nearest integer Rupee
    const exactRupees = netSubtotal / 100;
    const roundedRupees = Math.round(exactRupees);
    const roundOffPaise = Math.round((roundedRupees * 100) - netSubtotal);
    const grandTotalPaise = roundedRupees * 100;

    this.totals = {
      subtotal: subtotalPaise,
      discount_amount: this.billDiscountPaise,
      tax_amount: totalTaxPaise,
      round_off: roundOffPaise,
      grand_total: grandTotalPaise,
    };

    // Update UI elements
    this.summaryItems.textContent = `${this.cart.length} items (${totalQty.toFixed(1)} qty)`;
    this.summarySubtotal.textContent = `₹${(subtotalPaise / 100).toFixed(2)}`;
    this.summaryTax.textContent = `₹${(totalTaxPaise / 100).toFixed(2)}`;
    this.summaryRoundoff.textContent = `${roundOffPaise >= 0 ? '+' : ''}₹${(roundOffPaise / 100).toFixed(2)}`;
    this.summaryGrandTotal.textContent = `₹${(grandTotalPaise / 100).toFixed(2)}`;

    // Default tender to grand total if cash mode
    if (this.paymentMode === 'cash' && (parseFloat(this.tenderInput.value) || 0) === 0) {
      this.tenderInput.value = (grandTotalPaise / 100).toFixed(0);
    }
    this.updateChangeCalculation();
  }

  updateChangeCalculation() {
    if (!this.totals) return;
    const tenderRupees = parseFloat(this.tenderInput.value) || 0;
    const tenderPaise = Math.round(tenderRupees * 100);
    const diffPaise = tenderPaise - this.totals.grand_total;

    if (diffPaise >= 0) {
      this.changeVal.textContent = `₹${(diffPaise / 100).toFixed(2)}`;
      this.changeVal.style.color = 'var(--accent-green)';
    } else {
      this.changeVal.textContent = `-₹${(Math.abs(diffPaise) / 100).toFixed(2)} (Short)`;
      this.changeVal.style.color = 'var(--accent-red)';
    }
  }

  async updateCustomerCreditInfo() {
    if (!this.selectedCustomerId) {
      this.custUdharInfo.style.display = 'none';
      return;
    }

    try {
      const customers = await window.api.parties.getCustomers({ active_only: false });
      const c = customers.find(x => x.id === this.selectedCustomerId);
      if (c) {
        this.custUdharVal.textContent = `₹${(c.current_balance / 100).toFixed(2)}`;
        this.custLimitVal.textContent = c.credit_limit > 0 ? `₹${(c.credit_limit / 100).toFixed(2)}` : 'Unlimited';
        this.custUdharInfo.style.display = 'block';
      }
    } catch (e) {
      console.error('Error fetching customer details:', e);
    }
  }

  async handleCheckout(shouldPrint) {
    if (this.cart.length === 0) {
      window.app.showToast('Cart is empty! Add products before checking out.', 'error');
      this.searchInput.focus();
      return;
    }

    if (this.paymentMode === 'credit' && !this.selectedCustomerId) {
      window.app.showToast('Credit (Udhar) sale requires selecting a customer!', 'error');
      this.customerSelect.focus();
      return;
    }

    const grandTotal = this.totals.grand_total;
    let paidAmount = grandTotal;
    let creditAmount = 0;

    if (this.paymentMode === 'credit') {
      paidAmount = 0;
      creditAmount = grandTotal;
    }

    const payload = {
      customer_id: this.selectedCustomerId,
      items: this.cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        unit_code: item.unit_code,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: item.discount_amount,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        total_price: item.total_price,
      })),
      subtotal: this.totals.subtotal,
      discount_amount: this.totals.discount_amount,
      tax_amount: this.totals.tax_amount,
      round_off: this.totals.round_off,
      grand_total: grandTotal,
      paid_amount: paidAmount,
      credit_amount: creditAmount,
      payment_mode: this.paymentMode,
      payment_reference: this.paymentMode === 'cash' ? `Tender ₹${this.tenderInput.value}` : '',
      notes: '',
    };

    try {
      this.btnSavePrint.disabled = true;
      this.btnSaveOnly.disabled = true;

      const sale = await window.api.sales.createSale(payload);
      window.app.showToast(`Bill ${sale.invoice_number} created successfully!`, 'success');

      if (shouldPrint) {
        await this.printSaleReceipt(sale);
      }

      this.clearCart();
    } catch (err) {
      console.error('Checkout failed:', err);
      window.app.showToast(err.message || 'Billing failed', 'error');
    } finally {
      this.btnSavePrint.disabled = false;
      this.btnSaveOnly.disabled = false;
    }
  }

  async printSaleReceipt(sale) {
    try {
      const settings = await window.api.settings.getSettings();
      const printContainer = document.getElementById('receipt-print-container');
      printContainer.innerHTML = window.generateThermalReceiptHtml(sale, settings, true);

      await window.api.printer.printReceipt({
        silent: settings.printer_silent !== 'false',
        deviceName: settings.printer_name || '',
      });
    } catch (printErr) {
      console.warn('Printer dispatch error:', printErr);
      window.app.showToast('Bill saved, but printing failed. Check printer connection.', 'info');
    }
  }

  // ==================== MOBILE BARCODE SCANNER INTEGRATION ====================
  playPosBeep() {
    try {
      if (!this.scannerAudioCtx) {
        this.scannerAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.scannerAudioCtx.state === 'suspended') {
        this.scannerAudioCtx.resume();
      }
      const osc = this.scannerAudioCtx.createOscillator();
      const gain = this.scannerAudioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1950, this.scannerAudioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, this.scannerAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.scannerAudioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.scannerAudioCtx.destination);
      osc.start();
      osc.stop(this.scannerAudioCtx.currentTime + 0.12);
    } catch (e) {
      console.warn('POS audio error:', e);
    }
  }

  initMobileScannerStream() {
    try {
      const evtSource = new EventSource('/api/scan-stream');

      evtSource.onmessage = async (e) => {
        if (!e.data || e.data.startsWith(':')) return;
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'barcode_scan' && payload.barcode) {
            await this.handleIncomingMobileBarcode(payload.barcode, payload.product);
          } else if (payload.type === 'sale_completed' && payload.sale) {
            this.handleIncomingCompletedSale(payload.sale);
          }
        } catch (err) {
          console.warn('SSE parse error:', err);
        }
      };

      evtSource.onerror = () => {
        // Automatically reconnects by default
      };
    } catch (err) {
      console.warn('SSE initialization failed:', err);
    }
  }

  handleIncomingCompletedSale(sale) {
    this.playPosBeep();
    if (window.app && window.app.showToast) {
      window.app.showToast(`📱 मोबाईलवरून बिल पूर्ण झाले: ${sale.invoice_no} (₹${Number(sale.grand_total).toFixed(2)}) ✅`, 'success');
    }
    // Clear PC cart if it was the same active transaction
    if (this.cart.length > 0) {
      this.clearCart();
    }
  }

  async handleIncomingMobileBarcode(barcode, preloadedProduct = null) {
    const code = String(barcode).trim();
    if (!code) return;

    this.playPosBeep();

    try {
      let prod = null;

      // 1. Check if server preloaded product
      if (preloadedProduct) {
        prod = {
          id: preloadedProduct.id,
          name: preloadedProduct.name,
          name_regional: preloadedProduct.name_mr,
          barcode: preloadedProduct.barcode,
          selling_price: Math.round(Number(preloadedProduct.selling_price) * 100),
          unit_code: preloadedProduct.unit || 'pkt'
        };
      }

      // 2. Direct barcode / SKU lookup from local API
      if (!prod && window.api && window.api.master) {
        prod = await window.api.master.getProductByBarcode(code);
        if (!prod) {
          const results = await window.api.master.searchProducts(code);
          if (results && results.length > 0) {
            prod = results.find(p => p.barcode === code || p.sku === code) || results[0];
          }
        }
      }

      if (prod) {
        this.addToCart(prod);
        window.app.showToast(`📱 मोबाईलवरून स्कॅन: ${prod.name} (₹${(prod.selling_price / 100).toFixed(2)}) बिलामध्ये जोडले! ✅`, 'success');
      } else {
        window.app.showToast(`⚠️ मोबाईलवरून स्कॅन: बारकोड '${code}' कॅटलॉगमध्ये सापडला नाही!`, 'error');
        this.searchInput.value = code;
        this.searchInput.focus();
      }
    } catch (e) {
      console.error('Error handling mobile scan:', e);
      window.app.showToast('मोबाईल स्कॅन प्रोसेस करताना एरर आला', 'error');
    }
  }

  async openMobileScannerModal() {
    // If user is accessing from a mobile device or narrow screen, go straight to scanner portal!
    if (window.innerWidth < 768) {
      window.location.href = '/scanner.html';
      return;
    }

    try {
      const res = await fetch('/api/network-info');
      const data = await res.json();

      const qrImg = document.getElementById('mobile-scanner-qr-img');
      const linkEl = document.getElementById('mobile-scanner-url-link');
      const statusText = document.getElementById('mobile-scanner-active-status');

      if (qrImg && data.qrDataUrl) {
        qrImg.src = data.qrDataUrl;
      }
      if (linkEl && data.scannerUrl) {
        linkEl.href = data.scannerUrl;
        linkEl.textContent = data.scannerUrl;
      }
      if (statusText) {
        statusText.textContent = `🟢 स्कॅनर सर्व्हर चालू आहे (${data.connectedScreens || 1} स्क्रीन कनेक्टेड)`;
      }

      window.app.openModal(this.modalMobileScanner);
    } catch (err) {
      console.error('Error fetching mobile scanner pairing info:', err);
      window.app.showToast('मोबाईल स्कॅनर माहिती लोड करताना एरर आला', 'error');
    }
  }
}

window.PosEngine = PosEngine;
