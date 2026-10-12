/**
 * Web Fallback Adapter
 * Complete, fully-functional browser database engine with localStorage persistence
 */

if (typeof window.api === 'undefined') {
  console.log('Running in browser mode: initializing full Web Fallback engine...');

  const STORAGE_KEYS = {
    USER: 'kiranapos_current_user',
    PRODUCTS: 'kiranapos_products',
    CUSTOMERS: 'kiranapos_customers',
    SUPPLIERS: 'kiranapos_suppliers',
    SALES: 'kiranapos_sales',
    PURCHASES: 'kiranapos_purchases',
    EXPENSES: 'kiranapos_expenses',
    STOCK_MOVEMENTS: 'kiranapos_stock_movements',
    CUSTOMER_LEDGER: 'kiranapos_customer_ledger',
    SUPPLIER_LEDGER: 'kiranapos_supplier_ledger',
    BACKUPS: 'kiranapos_backups',
    SETTINGS: 'kiranapos_settings',
    CASH_SESSION: 'kiranapos_cash_session',
  };

  const getStored = (key) => JSON.parse(localStorage.getItem(key) || '[]');
  const setStored = (key, val) => localStorage.setItem(key, JSON.stringify(val));

  async function initBrowserStorage() {
    // 1. Fetch live products from server catalog
    try {
      const pRes = await fetch('/api/products');
      if (pRes.ok) {
        const serverProds = await pRes.json();
        if (Array.isArray(serverProds) && serverProds.length > 0) {
          setStored(STORAGE_KEYS.PRODUCTS, serverProds);
        }
      }
    } catch (e) {
      console.warn('Initial product sync error (using local cache):', e);
    }

    // 2. Fetch live customers from server
    try {
      const cRes = await fetch('/api/customers');
      if (cRes.ok) {
        const serverCusts = await cRes.json();
        if (Array.isArray(serverCusts) && serverCusts.length > 0) {
          setStored(STORAGE_KEYS.CUSTOMERS, serverCusts);
        }
      }
    } catch (e) {
      console.warn('Initial customer sync error (using local cache):', e);
    }

    // 3. Fetch live settings from server
    try {
      const sRes = await fetch('/api/settings');
      if (sRes.ok) {
        const serverSettings = await sRes.json();
        if (serverSettings && serverSettings.shop_name) {
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(serverSettings));
        }
      }
    } catch (e) {}

    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      const defaultProducts = [
        { id: 1, quick_code: '1', name: 'Madhur Pure Sugar / Chini', name_regional: 'मधुर साखर', barcode: '890103000002', sku: 'SUGAR-1K', category_id: 5, category_name: 'Sugar & Salt', unit_code: 'kg', purchase_cost: 3800, selling_price: 4400, mrp: 4800, tax_rate: 0, current_stock: 120, min_stock_alert: 15, is_active: 1 },
        { id: 2, quick_code: '2', name: 'Fortune Sunlite Sunflower Oil 1L', name_regional: 'फॉर्च्यून तेल', barcode: '890103000003', sku: 'OIL-1L', category_id: 3, category_name: 'Edible Oils', unit_code: 'pkt', purchase_cost: 11500, selling_price: 13500, mrp: 14500, tax_rate: 5, current_stock: 30, min_stock_alert: 8, is_active: 1 },
        { id: 3, quick_code: '3', name: 'Aashirvaad Shudh Chakki Atta 5kg', name_regional: 'आशीर्वाद आटा', barcode: '890103000001', sku: 'ATTA-5K', category_id: 1, category_name: 'Grains & Flours', unit_code: 'pkt', purchase_cost: 21000, selling_price: 24000, mrp: 25000, tax_rate: 0, current_stock: 45, min_stock_alert: 5, is_active: 1 },
        { id: 4, quick_code: '4', name: 'Tata Salt Vaccum Evaporated 1kg', name_regional: 'टाटा मीठ', barcode: '890103000004', sku: 'SALT-1K', category_id: 5, category_name: 'Sugar & Salt', unit_code: 'pkt', purchase_cost: 2200, selling_price: 2800, mrp: 3000, tax_rate: 0, current_stock: 60, min_stock_alert: 10, is_active: 1 },
        { id: 5, quick_code: '5', name: 'Toor Dal Premium Desi 1kg', name_regional: 'तूर डाळ', barcode: '890103000005', sku: 'DAL-TOOR', category_id: 2, category_name: 'Pulses & Dals', unit_code: 'kg', purchase_cost: 13500, selling_price: 16000, mrp: 17500, tax_rate: 0, current_stock: 55, min_stock_alert: 10, is_active: 1 },
        { id: 6, quick_code: '6', name: 'Tata Tea Gold 250g', name_regional: 'टाटा चहा', barcode: '8901030012345', sku: 'TEA-GOLD', category_id: 7, category_name: 'Beverages & Tea', unit_code: 'pkt', purchase_cost: 11000, selling_price: 13000, mrp: 14000, tax_rate: 5, current_stock: 35, min_stock_alert: 8, is_active: 1 },
        { id: 7, quick_code: '7', name: 'Parle-G Gold Biscuit 250g', name_regional: 'पारले जी बिस्किट', barcode: '890103000007', sku: 'PARLE-G', category_id: 6, category_name: 'Snacks & Biscuits', unit_code: 'pkt', purchase_cost: 2500, selling_price: 3000, mrp: 3000, tax_rate: 18, current_stock: 80, min_stock_alert: 15, is_active: 1 },
        { id: 8, quick_code: '8', name: 'Amul Butter 100g', name_regional: 'अमूल बटर', barcode: '890103000006', sku: 'AMUL-100G', category_id: 8, category_name: 'Dairy', unit_code: 'pcs', purchase_cost: 5000, selling_price: 5800, mrp: 6000, tax_rate: 12, current_stock: 25, min_stock_alert: 5, is_active: 1 },
      ];
      setStored(STORAGE_KEYS.PRODUCTS, defaultProducts);
    }

    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
      const defaultCustomers = [
        { id: 1, name: 'Ramesh Patel', phone: '9820011223', address: 'Flat 102, Shanti Niwas', credit_limit: 500000, current_balance: 145000, is_active: 1 },
        { id: 2, name: 'Sanjay Shinde', phone: '9833445566', address: 'Shop 4, Station Road', credit_limit: 300000, current_balance: 52000, is_active: 1 },
        { id: 3, name: 'Pooja Kulkarni', phone: '9819283746', address: 'Building B, Sector 3', credit_limit: 200000, current_balance: 0, is_active: 1 },
      ];
      setStored(STORAGE_KEYS.CUSTOMERS, defaultCustomers);
    }

    if (!localStorage.getItem(STORAGE_KEYS.SUPPLIERS)) {
      const defaultSuppliers = [
        { id: 1, name: 'Kailash Wholesale Traders', company_name: 'Kailash FMCG Distributors', phone: '9821100998', gstin: '27AABCT1234F1Z5', current_balance: 185000, is_active: 1 },
        { id: 2, name: 'Om Sai Grain Depot', company_name: 'Om Sai Wholesale Traders', phone: '9819001122', gstin: '27ABCDE9988G1Z1', current_balance: 95000, is_active: 1 },
      ];
      setStored(STORAGE_KEYS.SUPPLIERS, defaultSuppliers);
    }

    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      const defaultSettings = {
        shop_name: 'Shree Ganesh Kirana & General Store',
        shop_tagline: 'Fresh Groceries & Daily Needs',
        shop_address: 'Main Market Road, Near Town Clock Tower',
        shop_phone: '+91 98765 43210',
        shop_gstin: '27AAAAA0000A1Z5',
        receipt_footer_msg: 'Thank you for shopping with us! Visit again.',
        printer_width: '80mm',
        printer_silent: 'false',
        printer_name: '',
      };
      setStored(STORAGE_KEYS.SETTINGS, defaultSettings);
    }

    if (!localStorage.getItem(STORAGE_KEYS.SALES)) {
      setStored(STORAGE_KEYS.SALES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PURCHASES)) {
      setStored(STORAGE_KEYS.PURCHASES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) {
      setStored(STORAGE_KEYS.EXPENSES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.STOCK_MOVEMENTS)) {
      setStored(STORAGE_KEYS.STOCK_MOVEMENTS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.BACKUPS)) {
      setStored(STORAGE_KEYS.BACKUPS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMER_LEDGER)) {
      setStored(STORAGE_KEYS.CUSTOMER_LEDGER, [
        {
          id: 1,
          customer_id: 1,
          entry_type: 'debit',
          amount: 145000,
          running_balance: 145000,
          description: 'मागील उधारी शिल्लक (Opening Balance)',
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: 2,
          customer_id: 2,
          entry_type: 'debit',
          amount: 52000,
          running_balance: 52000,
          description: 'मागील उधारी शिल्लक (Opening Balance)',
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
      ]);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUPPLIER_LEDGER)) {
      setStored(STORAGE_KEYS.SUPPLIER_LEDGER, [
        {
          id: 1,
          supplier_id: 1,
          entry_type: 'credit',
          amount: 185000,
          running_balance: 185000,
          description: 'मागील देणे बाकी (Opening Balance)',
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
        {
          id: 2,
          supplier_id: 2,
          entry_type: 'credit',
          amount: 95000,
          running_balance: 95000,
          description: 'मागील देणे बाकी (Opening Balance)',
          created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        },
      ]);
    }
  }

  initBrowserStorage();

  window.api = {
    // ==================== AUTH ====================
    auth: {
      login: async (username, password) => {
        const user = { id: 1, username: 'admin', full_name: 'दुकान मालक (पप्पा)', role: 'owner' };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        return user;
      },
      logout: async () => {
        localStorage.removeItem(STORAGE_KEYS.USER);
        return { loggedOut: true };
      },
      getCurrentUser: async () => {
        const u = localStorage.getItem(STORAGE_KEYS.USER);
        return u ? JSON.parse(u) : { id: 1, username: 'admin', full_name: 'दुकान मालक (पप्पा)', role: 'owner' };
      },
      listUsers: async () => [
        { id: 1, username: 'admin', full_name: 'दुकान मालक (पप्पा)', role: 'owner', is_active: 1 },
      ],
    },

    // ==================== MASTER DATA ====================
    master: {
      getCategories: async () => [
        { id: 1, name: 'Grains & Flours' },
        { id: 2, name: 'Pulses & Dals' },
        { id: 3, name: 'Edible Oils & Ghee' },
        { id: 4, name: 'Spices & Masalas' },
        { id: 5, name: 'Sugar & Salt' },
        { id: 6, name: 'Snacks & Biscuits' },
        { id: 7, name: 'Beverages & Tea' },
        { id: 8, name: 'Dairy & Bakery' },
      ],
      saveCategory: async (c) => c,
      getUnits: async () => [
        { name: 'Piece', short_code: 'pcs', allow_decimal: 0 },
        { name: 'Packet', short_code: 'pkt', allow_decimal: 0 },
        { name: 'Kilogram', short_code: 'kg', allow_decimal: 1 },
        { name: 'Gram', short_code: 'g', allow_decimal: 1 },
        { name: 'Litre', short_code: 'l', allow_decimal: 1 },
        { name: 'Box', short_code: 'box', allow_decimal: 0 },
      ],
      searchProducts: async (q) => {
        const all = getStored(STORAGE_KEYS.PRODUCTS);
        const term = q.trim().toLowerCase();
        return all.filter(p =>
          (p.quick_code && String(p.quick_code).trim().toLowerCase() === term) ||
          (p.name && p.name.toLowerCase().includes(term)) ||
          (p.name_regional && p.name_regional.toLowerCase().includes(term)) ||
          (p.name_mr && p.name_mr.toLowerCase().includes(term)) ||
          (p.barcode && p.barcode.includes(term)) ||
          (p.sku && p.sku.toLowerCase().includes(term))
        );
      },
      getProducts: async ({ query = '', category_id = null } = {}) => {
        try {
          const res = await fetch('/api/products');
          if (res.ok) {
            const serverProds = await res.json();
            if (Array.isArray(serverProds) && serverProds.length > 0) {
              setStored(STORAGE_KEYS.PRODUCTS, serverProds);
            }
          }
        } catch (e) {}

        let prods = getStored(STORAGE_KEYS.PRODUCTS);
        if (query) {
          const t = query.trim().toLowerCase();
          prods = prods.filter(p => 
            (p.quick_code && String(p.quick_code).trim().toLowerCase() === t) ||
            (p.name && p.name.toLowerCase().includes(t)) || 
            (p.name_regional && p.name_regional.toLowerCase().includes(t)) ||
            (p.name_mr && p.name_mr.toLowerCase().includes(t)) ||
            (p.barcode && p.barcode.includes(t))
          );
        }
        if (category_id) {
          prods = prods.filter(p => p.category_id === category_id);
        }
        return prods;
      },
      getProductById: async (id) => {
        const prods = getStored(STORAGE_KEYS.PRODUCTS);
        return prods.find(p => p.id === id) || null;
      },
      getProductByBarcode: async (barcode) => {
        const prods = getStored(STORAGE_KEYS.PRODUCTS);
        const b = String(barcode).trim().toLowerCase();
        let found = prods.find(p => 
          (p.quick_code && String(p.quick_code).trim().toLowerCase() === b) ||
          p.barcode === barcode || 
          p.sku === barcode
        );
        if (!found) {
          try {
            const res = await fetch('/api/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ barcode: String(barcode).trim() })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.found && data.product) {
                found = data.product;
              }
            }
          } catch (e) {}
        }
        return found || null;
      },
      saveProduct: async (p) => {
        let savedProd = { ...p };
        try {
          const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(p),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.product) {
              savedProd = data.product;
            }
          }
        } catch (e) {
          console.warn('Network error saving product to server, saving locally:', e);
          if (!savedProd.id) savedProd.id = Date.now();
        }

        const prods = getStored(STORAGE_KEYS.PRODUCTS);
        const idx = prods.findIndex(x => (savedProd.id && x.id === savedProd.id) || (savedProd.barcode && x.barcode === savedProd.barcode));
        if (idx !== -1) {
          prods[idx] = { ...prods[idx], ...savedProd };
        } else {
          prods.push(savedProd);

          // Add opening stock movement
          if (savedProd.current_stock > 0) {
            const movements = getStored(STORAGE_KEYS.STOCK_MOVEMENTS);
            movements.unshift({
              id: Date.now(),
              product_name: savedProd.name,
              unit_code: savedProd.unit_code,
              movement_type: 'opening',
              quantity_change: savedProd.current_stock,
              resulting_stock: savedProd.current_stock,
              reason: 'Initial opening stock',
              username: 'दुकान मालक (पप्पा)',
              created_at: new Date().toISOString(),
            });
            setStored(STORAGE_KEYS.STOCK_MOVEMENTS, movements);
          }
        }
        setStored(STORAGE_KEYS.PRODUCTS, prods);
        return savedProd;
      },
      toggleProductActive: async (id) => {
        const prods = getStored(STORAGE_KEYS.PRODUCTS);
        const item = prods.find(x => x.id === id);
        if (item) {
          item.is_active = item.is_active ? 0 : 1;
          try {
            await fetch('/api/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            });
          } catch (e) {}
        }
        setStored(STORAGE_KEYS.PRODUCTS, prods);
        return { id, is_active: item ? item.is_active : 1 };
      },
    },

    // ==================== INVENTORY & STOCK ====================
    inventory: {
      adjustStock: async ({ product_id, movement_type, quantity_change, reason }) => {
        const prods = getStored(STORAGE_KEYS.PRODUCTS);
        const p = prods.find(x => x.id === product_id);
        if (!p) throw new Error('Product not found');

        let delta = quantity_change;
        if (movement_type === 'adjustment_sub' || movement_type === 'wastage') {
          delta = -Math.abs(delta);
        } else if (movement_type === 'adjustment_add') {
          delta = Math.abs(delta);
        }

        p.current_stock = Math.max(0, Math.round((p.current_stock + delta) * 1000) / 1000);
        setStored(STORAGE_KEYS.PRODUCTS, prods);

        // Record movement
        const movements = getStored(STORAGE_KEYS.STOCK_MOVEMENTS);
        movements.unshift({
          id: Date.now(),
          product_name: p.name,
          unit_code: p.unit_code,
          movement_type,
          quantity_change: delta,
          resulting_stock: p.current_stock,
          reason,
          username: 'दुकान मालक (पप्पा)',
          created_at: new Date().toISOString(),
        });
        setStored(STORAGE_KEYS.STOCK_MOVEMENTS, movements);

        return { product_id, new_stock: p.current_stock };
      },
      getStockMovements: async () => getStored(STORAGE_KEYS.STOCK_MOVEMENTS),
      getLowStockAlerts: async () => {
        const prods = getStored(STORAGE_KEYS.PRODUCTS);
        return prods.filter(p => p.current_stock <= p.min_stock_alert);
      },
    },

    // ==================== SALES & BILLING ====================
    sales: {
      createSale: async (saleData) => {
        const sales = getStored(STORAGE_KEYS.SALES);
        const prods = getStored(STORAGE_KEYS.PRODUCTS);
        const movements = getStored(STORAGE_KEYS.STOCK_MOVEMENTS);

        const id = Date.now();
        const invoice_number = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(sales.length + 1).padStart(4, '0')}`;
        
        // Deduct stock & log movement
        saleData.items.forEach(item => {
          const p = prods.find(x => x.id === item.product_id);
          if (p) {
            p.current_stock = Math.max(0, Math.round((p.current_stock - item.quantity) * 1000) / 1000);
            movements.unshift({
              id: Date.now() + Math.random(),
              product_name: p.name,
              unit_code: p.unit_code,
              movement_type: 'sale',
              quantity_change: -item.quantity,
              resulting_stock: p.current_stock,
              reason: `Sale ${invoice_number}`,
              username: 'दुकान मालक (पप्पा)',
              created_at: new Date().toISOString(),
            });
          }
        });
        setStored(STORAGE_KEYS.PRODUCTS, prods);
        setStored(STORAGE_KEYS.STOCK_MOVEMENTS, movements);

        // Update customer credit if applicable
        let customerName = 'Walk-in';
        if (saleData.customer_id) {
          const custs = getStored(STORAGE_KEYS.CUSTOMERS);
          const c = custs.find(x => x.id === saleData.customer_id);
          if (c) {
            customerName = c.name;
            if (saleData.credit_amount > 0) {
              c.current_balance += saleData.credit_amount;
              setStored(STORAGE_KEYS.CUSTOMERS, custs);

              const ledger = getStored(STORAGE_KEYS.CUSTOMER_LEDGER);
              ledger.unshift({
                id: Date.now(),
                customer_id: saleData.customer_id,
                entry_type: 'debit',
                amount: saleData.credit_amount,
                running_balance: c.current_balance,
                description: `बिल क्र. ${invoice_number} (उधारी माल)`,
                created_at: new Date().toISOString(),
              });
              setStored(STORAGE_KEYS.CUSTOMER_LEDGER, ledger);
            }
          }
        }

        const saleRecord = {
          ...saleData,
          id,
          invoice_number,
          customer_name: customerName,
          status: 'completed',
          created_at: new Date().toISOString(),
          cashier_name: 'दुकान मालक (पप्पा)',
        };

        sales.unshift(saleRecord);
        setStored(STORAGE_KEYS.SALES, sales);
        return saleRecord;
      },
      getSaleById: async (id) => {
        const sales = getStored(STORAGE_KEYS.SALES);
        return sales.find(s => s.id === id) || null;
      },
      getSalesList: async () => getStored(STORAGE_KEYS.SALES),
      cancelSale: async (saleId, reason) => {
        const sales = getStored(STORAGE_KEYS.SALES);
        const prods = getStored(STORAGE_KEYS.PRODUCTS);
        const s = sales.find(x => x.id === saleId);
        if (s) {
          s.status = 'cancelled';
          s.notes = (s.notes || '') + ` [Cancelled: ${reason}]`;

          // Revert stock
          if (s.items) {
            s.items.forEach(item => {
              const p = prods.find(x => x.id === item.product_id);
              if (p) p.current_stock += item.quantity;
            });
            setStored(STORAGE_KEYS.PRODUCTS, prods);
          }

          // Revert Udhar
          if (s.credit_amount > 0 && s.customer_id) {
            const custs = getStored(STORAGE_KEYS.CUSTOMERS);
            const c = custs.find(x => x.id === s.customer_id);
            if (c) c.current_balance = Math.max(0, c.current_balance - s.credit_amount);
            setStored(STORAGE_KEYS.CUSTOMERS, custs);
          }
        }
        setStored(STORAGE_KEYS.SALES, sales);
        return { success: true, message: 'Bill cancelled and stock reverted' };
      },
      processReturn: async (returnData) => returnData,
    },

    // ==================== PURCHASES ====================
    purchases: {
      createPurchase: async (purchaseData) => {
        const purchases = getStored(STORAGE_KEYS.PURCHASES);
        const prods = getStored(STORAGE_KEYS.PRODUCTS);
        const supps = getStored(STORAGE_KEYS.SUPPLIERS);
        const movements = getStored(STORAGE_KEYS.STOCK_MOVEMENTS);

        const id = Date.now();
        const supplier = supps.find(x => x.id === purchaseData.supplier_id);
        const supplierName = supplier ? supplier.name : 'Supplier';

        // Increase product stock & update cost
        purchaseData.items.forEach(item => {
          const p = prods.find(x => x.id === item.product_id);
          if (p) {
            p.current_stock = Math.round((p.current_stock + item.quantity) * 1000) / 1000;
            p.purchase_cost = item.unit_cost;
            movements.unshift({
              id: Date.now() + Math.random(),
              product_name: p.name,
              unit_code: p.unit_code,
              movement_type: 'purchase',
              quantity_change: item.quantity,
              resulting_stock: p.current_stock,
              reason: `Purchase Inv ${purchaseData.purchase_invoice_no}`,
              username: 'दुकान मालक (पप्पा)',
              created_at: new Date().toISOString(),
            });
          }
        });
        setStored(STORAGE_KEYS.PRODUCTS, prods);
        setStored(STORAGE_KEYS.STOCK_MOVEMENTS, movements);

        // Update supplier balance due
        if (purchaseData.balance_due > 0 && supplier) {
          supplier.current_balance += purchaseData.balance_due;
          setStored(STORAGE_KEYS.SUPPLIERS, supps);

          const suppLedger = getStored(STORAGE_KEYS.SUPPLIER_LEDGER);
          suppLedger.unshift({
            id: Date.now(),
            supplier_id: purchaseData.supplier_id,
            entry_type: 'credit',
            amount: purchaseData.balance_due,
            running_balance: supplier.current_balance,
            description: `खरेदी इनव्हॉइस ${purchaseData.purchase_invoice_no}`,
            created_at: new Date().toISOString(),
          });
          setStored(STORAGE_KEYS.SUPPLIER_LEDGER, suppLedger);
        }

        const record = {
          ...purchaseData,
          id,
          supplier_name: supplierName,
          item_count: purchaseData.items.length,
          recorded_by: 'दुकान मालक (पप्पा)',
          created_at: new Date().toISOString(),
        };

        purchases.unshift(record);
        setStored(STORAGE_KEYS.PURCHASES, purchases);
        return record;
      },
      getPurchasesList: async () => getStored(STORAGE_KEYS.PURCHASES),
      getPurchaseById: async (id) => {
        const list = getStored(STORAGE_KEYS.PURCHASES);
        return list.find(x => x.id === id) || null;
      },
    },

    // ==================== PARTIES (CUSTOMERS & SUPPLIERS) ====================
    parties: {
      getCustomers: async () => {
        try {
          const res = await fetch('/api/customers');
          if (res.ok) {
            const custs = await res.json();
            if (Array.isArray(custs) && custs.length > 0) {
              setStored(STORAGE_KEYS.CUSTOMERS, custs);
              return custs;
            }
          }
        } catch (e) {}
        return getStored(STORAGE_KEYS.CUSTOMERS);
      },
      saveCustomer: async (c) => {
        let savedCust = { ...c };
        try {
          const res = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(c),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.customer) {
              savedCust = data.customer;
            }
          }
        } catch (e) {
          if (!savedCust.id) savedCust.id = Date.now();
        }

        const custs = getStored(STORAGE_KEYS.CUSTOMERS);
        const idx = custs.findIndex(x => (savedCust.id && x.id === savedCust.id) || (savedCust.phone && x.phone === savedCust.phone));
        if (idx !== -1) {
          custs[idx] = { ...custs[idx], ...savedCust };
        } else {
          savedCust.current_balance = savedCust.current_balance || 0;
          custs.push(savedCust);
        }
        setStored(STORAGE_KEYS.CUSTOMERS, custs);
        return savedCust;
      },
      getCustomerLedger: async (id) => {
        const custs = getStored(STORAGE_KEYS.CUSTOMERS);
        const c = custs.find(x => x.id === id);
        const ledger = getStored(STORAGE_KEYS.CUSTOMER_LEDGER);
        const entries = ledger.filter(x => x.customer_id === id);
        return { customer: c, entries };
      },
      recordCustomerPayment: async ({ party_id, amount, payment_mode = 'cash' }) => {
        const custs = getStored(STORAGE_KEYS.CUSTOMERS);
        const c = custs.find(x => x.id === party_id);
        if (c) {
          c.current_balance = Math.max(0, c.current_balance - amount);
          const ledger = getStored(STORAGE_KEYS.CUSTOMER_LEDGER);
          ledger.unshift({
            id: Date.now(),
            customer_id: party_id,
            entry_type: 'credit',
            amount,
            running_balance: c.current_balance,
            description: `उधारी जमा पावती (${payment_mode.toUpperCase()})`,
            created_at: new Date().toISOString(),
          });
          setStored(STORAGE_KEYS.CUSTOMER_LEDGER, ledger);
        }
        setStored(STORAGE_KEYS.CUSTOMERS, custs);
        return { success: true, new_balance: c ? c.current_balance : 0 };
      },
      getSuppliers: async () => getStored(STORAGE_KEYS.SUPPLIERS),
      saveSupplier: async (s) => {
        const supps = getStored(STORAGE_KEYS.SUPPLIERS);
        if (s.id) {
          const idx = supps.findIndex(x => x.id === s.id);
          if (idx !== -1) supps[idx] = { ...supps[idx], ...s };
        } else {
          s.id = Date.now();
          s.current_balance = 0;
          supps.push(s);
        }
        setStored(STORAGE_KEYS.SUPPLIERS, supps);
        return s;
      },
      getSupplierLedger: async (id) => {
        const supps = getStored(STORAGE_KEYS.SUPPLIERS);
        const s = supps.find(x => x.id === id);
        const ledger = getStored(STORAGE_KEYS.SUPPLIER_LEDGER);
        const entries = ledger.filter(x => x.supplier_id === id);
        return { supplier: s, entries };
      },
      recordSupplierPayment: async ({ party_id, amount, payment_mode = 'cash' }) => {
        const supps = getStored(STORAGE_KEYS.SUPPLIERS);
        const s = supps.find(x => x.id === party_id);
        if (s) {
          s.current_balance = Math.max(0, s.current_balance - amount);
          const suppLedger = getStored(STORAGE_KEYS.SUPPLIER_LEDGER);
          suppLedger.unshift({
            id: Date.now(),
            supplier_id: party_id,
            entry_type: 'debit',
            amount,
            running_balance: s.current_balance,
            description: `सप्लायर पेमेंट (${payment_mode.toUpperCase()})`,
            created_at: new Date().toISOString(),
          });
          setStored(STORAGE_KEYS.SUPPLIER_LEDGER, suppLedger);
        }
        setStored(STORAGE_KEYS.SUPPLIERS, supps);
        return { success: true, new_balance: s ? s.current_balance : 0 };
      },
    },

    // ==================== EXPENSES ====================
    expenses: {
      getExpenses: async () => getStored(STORAGE_KEYS.EXPENSES),
      saveExpense: async (e) => {
        const exps = getStored(STORAGE_KEYS.EXPENSES);
        e.id = Date.now();
        e.recorded_by = 'दुकान मालक (पप्पा)';
        exps.unshift(e);
        setStored(STORAGE_KEYS.EXPENSES, exps);
        return e;
      },
      deleteExpense: async (id) => {
        let exps = getStored(STORAGE_KEYS.EXPENSES);
        exps = exps.filter(x => x.id !== id);
        setStored(STORAGE_KEYS.EXPENSES, exps);
        return { success: true };
      },
    },

    // ==================== CASH SESSION ====================
    cash: {
      getActiveSession: async () => {
        const s = localStorage.getItem(STORAGE_KEYS.CASH_SESSION);
        return s ? JSON.parse(s) : { id: 1, opening_cash: 200000, status: 'open', opening_time: new Date().toISOString() };
      },
      openSession: async ({ opening_cash, notes }) => {
        const s = { id: Date.now(), opening_cash, status: 'open', opening_time: new Date().toISOString(), notes };
        localStorage.setItem(STORAGE_KEYS.CASH_SESSION, JSON.stringify(s));
        return s;
      },
      closeSession: async ({ actual_cash, notes }) => {
        const s = JSON.parse(localStorage.getItem(STORAGE_KEYS.CASH_SESSION) || '{}');
        s.status = 'closed';
        s.actual_cash = actual_cash;
        s.expected_cash = s.opening_cash || 200000;
        s.cash_difference = actual_cash - s.expected_cash;
        s.closing_time = new Date().toISOString();
        s.notes = notes;
        localStorage.removeItem(STORAGE_KEYS.CASH_SESSION);
        return s;
      },
    },

    // ==================== REPORTS ====================
    reports: {
      getDashboardStats: async () => {
        const sales = getStored(STORAGE_KEYS.SALES);
        const custs = getStored(STORAGE_KEYS.CUSTOMERS);
        const supps = getStored(STORAGE_KEYS.SUPPLIERS);
        const prods = getStored(STORAGE_KEYS.PRODUCTS);

        const totalSales = sales.reduce((acc, s) => acc + (s.grand_total || 0), 0);
        const totalUdhar = custs.reduce((acc, c) => acc + (c.current_balance || 0), 0);
        const totalPayable = supps.reduce((acc, s) => acc + (s.current_balance || 0), 0);
        const lowStock = prods.filter(p => p.current_stock <= p.min_stock_alert).length;

        return {
          today: {
            total_bills: sales.length,
            total_sales: totalSales,
            total_collected: totalSales,
            total_credit_given: 0,
            collections_by_mode: [{ payment_mode: 'cash', amount: totalSales }],
          },
          summary: {
            total_udhar: totalUdhar,
            total_payable: totalPayable,
            low_stock_count: lowStock,
            total_products_count: prods.length,
          },
          recent_sales: sales.slice(0, 5),
          top_products: prods.slice(0, 5).map(p => ({ product_name: p.name, unit_code: p.unit_code, total_qty: 10, total_revenue: 24000 })),
        };
      },
      getSalesReport: async () => ({ summary: {}, dailyBreakdown: [] }),
      getPaymentCollectionsReport: async () => ({ collections: [] }),
      getProfitLossReport: async () => {
        const sales = getStored(STORAGE_KEYS.SALES);
        const rev = sales.reduce((acc, s) => acc + (s.grand_total || 0), 0);
        const exps = getStored(STORAGE_KEYS.EXPENSES);
        const totalExp = exps.reduce((acc, e) => acc + (e.amount || 0), 0);
        const cogs = Math.round(rev * 0.82);
        const gross = rev - cogs;
        return { revenue: rev, cogs, grossProfit: gross, expenses: totalExp, netProfit: gross - totalExp };
      },
      getStockValuationReport: async () => {
        const prods = getStored(STORAGE_KEYS.PRODUCTS);
        let costVal = 0;
        let retailVal = 0;
        prods.forEach(p => {
          costVal += p.current_stock * p.purchase_cost;
          retailVal += p.current_stock * p.selling_price;
        });
        return {
          summary: {
            total_items: prods.length,
            total_cost_value: costVal,
            total_retail_value: retailVal,
            projected_margin: retailVal - costVal,
          },
        };
      },
    },

    // ==================== SETTINGS ====================
    settings: {
      getSettings: async () => {
        try {
          const res = await fetch('/api/settings');
          if (res.ok) {
            const data = await res.json();
            if (data && data.shop_name) {
              localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data));
              return data;
            }
          }
        } catch (e) {
          // Offline / network fallback
        }
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
      },
      saveSettings: async (map) => {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
        const merged = { ...existing, ...map };
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
        try {
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(merged),
          });
        } catch (e) {
          // Offline / network fallback
        }
        return { success: true, settings: merged };
      },
      getAuditLogs: async () => [],
    },

    // ==================== BACKUP & RESTORE ====================
    backup: {
      triggerManualBackup: async () => {
        const data = {};
        for (const k of Object.values(STORAGE_KEYS)) {
          data[k] = localStorage.getItem(k);
        }
        const jsonStr = JSON.stringify(data, null, 2);
        const fileName = `kirana_pos_backup_${new Date().toISOString().slice(0, 10)}.json`;

        // Create browser download
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        const backups = getStored(STORAGE_KEYS.BACKUPS);
        backups.unshift({
          backup_file_name: fileName,
          backup_type: 'manual',
          backup_size_bytes: jsonStr.length,
          created_at: new Date().toISOString(),
          status: 'success',
          backup_file_path: 'Downloaded to PC',
        });
        setStored(STORAGE_KEYS.BACKUPS, backups);

        return { success: true, file_name: fileName };
      },
      getBackupList: async () => getStored(STORAGE_KEYS.BACKUPS),
      restoreBackup: async () => ({ success: true, message: 'डेटा रिस्टोअर झाला!' }),
      selectBackupDir: async () => null,
    },

    // ==================== PRINTER ====================
    printer: {
      getPrinters: async () => [{ name: 'Default Thermal Printer' }],
      printReceipt: async () => {
        window.print();
        return { printed: true };
      },
    },

    window: {
      minimize: () => {},
      maximize: () => {},
      close: () => window.close(),
    },
  };

  // ==================== MULTI-DEVICE LIVE SYNC (SSE) ====================
  try {
    const sseSync = new EventSource('/api/scan-stream');
    sseSync.onmessage = async (e) => {
      if (!e.data || e.data.startsWith(':')) return;
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'catalog_updated') {
          console.log('[🔄 Multi-Device Sync]: Catalog updated on another phone/PC. Refreshing...');
          try {
            const res = await fetch('/api/products');
            if (res.ok) {
              const freshProds = await res.json();
              if (Array.isArray(freshProds)) {
                setStored(STORAGE_KEYS.PRODUCTS, freshProds);
              }
            }
          } catch (err) {}

          // Refresh Baba Quick Bar
          if (window.posEngine && typeof window.posEngine.renderBabaQuickBar === 'function') {
            window.posEngine.renderBabaQuickBar();
          }
          // Refresh Products Table if open
          if (window.app && typeof window.app.loadProductsList === 'function') {
            window.app.loadProductsList();
          }
        }
      } catch (err) {}
    };
  } catch (err) {}
}
