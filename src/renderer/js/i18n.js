/**
 * KiranaPOS Multi-Language & Marathi (मराठी भाषा) Support
 * Natural Marathi terminology specially crafted for local shop owners & family elders.
 */

const translations = {
  mr: {
    // Header & App
    shop_badge: 'किराणा व जनरल स्टोअर्स',
    counter_closed: 'गल्ला बंद (सुरू करण्यासाठी क्लिक करा)',
    counter_open: 'गल्ला सुरू:',
    logout: 'बाहेर पडा',
    owner: 'मालक',
    cashier: 'कॅशियर',
    lang_label: 'मराठी',

    // Sidebar Navigation
    nav_pos: '⚡ नवीन बिल (POS)',
    nav_dashboard: '📊 डॅशबोर्ड व नफा-तोटा',
    nav_bills: '🧾 बिलांचा इतिहास व पावती',
    nav_products: '📦 किराणा माल व दर (Products)',
    nav_stock: '🔄 शिल्लक माल व नुकसान (Stock)',
    nav_purchases: '📥 खरेदी नोंदी (सप्लायर बिल)',
    nav_customers: '👥 ग्राहक उधारी खाते (खातेवही)',
    nav_suppliers: '🏢 घाऊक व्यापारी (सप्लायर)',
    nav_expenses: '💸 दुकानाचे रोजचे खर्च',
    nav_reports: '📈 नफा-तोटा व स्टॉक अहवाल',
    nav_settings: '⚙️ सेटिंग्ज व बॅकअप',

    // POS Screen
    search_placeholder: 'बारकोड स्कॅन करा किंवा वस्तूचे नाव / कोड टाईप करा... [F2 दाबा]',
    new_bill_btn: '➕ नवीन बिल (F1)',
    col_hash: '#',
    col_item: 'मालाचे नाव',
    col_qty: 'नग / वजन',
    col_rate: 'दर (₹)',
    col_disc: 'सूट (₹)',
    col_total: 'एकूण (₹)',
    col_action: 'काढा',
    empty_cart: '🛒 बारकोड स्कॅन करा किंवा वर नाव शोधून बिलामध्ये वस्तू जोडा.',

    // POS Customer & Totals Panel
    cust_label: 'ग्राहक (उधारी / रोख निवड)',
    walkin_cust: 'काउंटर ग्राहक (रोख)',
    btn_new_cust: '+ नवीन ग्राहक',
    current_udhar: 'चालू उधारी:',
    credit_limit: 'उधारी मर्यादा:',
    total_items_count: 'एकूण वस्तू',
    subtotal: 'एकूण किंमत (Subtotal)',
    bill_discount: 'बिलावर सूट (Discount)',
    gst_included: 'जीएसटी कर (समाविष्ट)',
    round_off: 'राऊंड ऑफ (Round Off)',
    grand_total: 'अंतिम एकूण रक्कम',
    payment_mode_label: 'पेमेंट कसे स्वीकारले?',
    pay_cash: '💵 रोख (Cash)',
    pay_upi: '📱 युपीआय (GPay / PhonePe)',
    pay_card: '💳 कार्ड (Card)',
    pay_credit: '📒 उधारी (खात्यावर)',
    tender_label: 'ग्राहकाने दिलेली रोकड (₹):',
    change_label: 'परत द्यायची सुट्टी रक्कम (Change):',
    btn_save_print: '🖨️ बिल पूर्ण करा व पावती प्रिंट करा (F4)',
    btn_save_only: '💾 फक्त बिल सेव्ह करा (प्रिंट नको)',
    btn_clear: 'साफ करा',

    // Dashboard
    dash_title: '📊 दुकानाचा दैनिक व्यवहार व डॅशबोर्ड',
    dash_subtitle: 'आजची एकूण विक्री, गल्ल्यातील रोख, उधारी वसुली आणि शिल्लक माल',
    dash_refresh: '🔄 रिफ्रेश करा',
    dash_stat_sales: 'आजची एकूण विक्री',
    dash_stat_bills_suffix: 'बिले पूर्ण झाली',
    dash_stat_cash: 'गल्ल्यातील रोख जमा (Cash)',
    dash_stat_digital: 'ऑनलाईन युपीआय व कार्ड',
    dash_stat_udhar: 'बाहेरील एकूण उधारी (येणे बाकी)',
    dash_stat_lowstock: 'कमी झालेला माल (भरती करा)',
    dash_stat_payables: 'सप्लायरना देणे बाकी',
    recent_bills_title: 'नुकतीच बनवलेली बिले',
    top_items_title: 'या महिन्यात सर्वाधिक विकलेला माल',

    // Bill History
    bills_title: '🧾 बिलांचा इतिहास, पुन्हा प्रिंट व परतावा',
    bills_subtitle: 'मागील बिले तपासा, पुन्हा पावती प्रिंट करा, माल परत घ्या किंवा बिल रद्द करा',
    btn_filter: 'शोधा',
    col_inv: 'बिल क्र.',
    col_datetime: 'तारीख व वेळ',
    col_customer: 'ग्राहक',
    col_paid: 'जमा',
    col_udhar: 'उधारी',
    col_status: 'स्थिती',
    col_cashier: 'कॅशियर',
    btn_reprint: '🖨️ पावती प्रिंट',
    btn_void: 'रद्द करा',

    // Products Screen
    prod_title: '📦 दुकानातील सर्व किराणा माल व दर यादी',
    prod_subtitle: 'नवीन माल जोडा, खरेदी भाव, विक्री भाव, छापील किंमत (MRP), आणि बारकोड नोंदवा',
    btn_add_product: '+ नवीन माल जोडा',
    search_prod_placeholder: 'नाव किंवा बारकोडने शोधा...',
    all_categories: 'सर्व प्रकार (Categories)',
    col_barcode: 'बारकोड / कोड',
    col_cat: 'प्रकार',
    col_unit: 'माप/युनिट',
    col_cost: 'खरेदी भाव (₹)',
    col_sell: 'विक्री भाव (₹)',
    col_mrp: 'छापील किंमत (₹)',
    col_stock: 'शिल्लक माल',
    btn_edit: 'बदल करा',

    // Customer Udhar Screen
    cust_title: '👥 ग्राहक उधारी खातेवही (खाते पुस्तक)',
    cust_subtitle: 'ग्राहकांची चालू उधारी, मर्यादा तपासा आणि उधारीचे पैसे जमा करून घ्या',
    btn_add_cust: '+ नवीन ग्राहक जोडा',
    search_cust_placeholder: 'ग्राहकाचे नाव किंवा मोबाईल शोधा...',
    col_cust_name: 'ग्राहकाचे नाव',
    col_phone: 'मोबाईल नंबर',
    col_address: 'पत्ता / गल्ली',
    col_limit: 'उधारी मर्यादा',
    col_udhar_bal: 'उधारी बाकी (₹)',
    btn_collect_pay: 'पैसे जमा घ्या',

    // Cash Counter Modals
    cash_open_title: '💵 सकाळचा गल्ला सुरू करा (Day Start)',
    cash_open_desc: 'सकाळी गल्ल्यात दिलेली सुट्ट्या पैशांची शिल्लक (Opening Float) टाका:',
    cash_open_amt: 'गल्ल्यातील रोख शिल्लक (₹)',
    cash_open_note: 'टीप (पर्यायी)',
    btn_open_session: 'गल्ला सुरू करा',

    cash_close_title: '🏁 रात्री गल्ला मोजून बंद करा (Day End)',
    cash_close_desc: 'दुकान बंद करताना गल्ल्यातील प्रत्यक्षात मोजलेली रोख रक्कम टाका:',
    cash_close_actual: 'गल्ल्यात प्रत्यक्षात मोजलेली रोकड (₹)',
    cash_close_notes: 'नोंद / कारण',
    btn_close_session: 'हिशोब तपासून गल्ला बंद करा',

    // Common & Actions
    btn_mobile_scanner: '📱 मोबाईल स्कॅनर',
    btn_add_supp: '+ नवीन सप्लायर जोडा',
    btn_add_purchase: '+ नवीन खरेदी नोंद',
    btn_add_expense: '+ दुकानाचा खर्च नोंदवा',
    btn_adjust_stock: '+ शिल्लक माल / नुकसान नोंदवा',
    cancel: 'रद्द करा',
    save: 'जतन करा (Save)',
  },

  en: {
    shop_badge: 'Kirana & General Store',
    counter_closed: 'Cash Counter Closed (Click to Open)',
    counter_open: 'Counter Open:',
    logout: 'Logout',
    owner: 'Owner',
    cashier: 'Cashier',
    lang_label: 'English',

    nav_pos: '⚡ New Billing (POS)',
    nav_dashboard: '📊 Dashboard',
    nav_bills: '🧾 Bill History & Returns',
    nav_products: '📦 Products & Prices',
    nav_stock: '🔄 Stock & Wastage',
    nav_purchases: '📥 Purchase Entries',
    nav_customers: '👥 Customer Udhar Ledger',
    nav_suppliers: '🏢 Suppliers & Payables',
    nav_expenses: '💸 Daily Expenses',
    nav_reports: '📈 Reports & P&L',
    nav_settings: '⚙️ Settings & Backups',

    search_placeholder: 'Scan barcode or type item name / SKU... [Press F2]',
    new_bill_btn: '➕ New Bill (F1)',
    col_hash: '#',
    col_item: 'Product Item',
    col_qty: 'Qty / Weight',
    col_rate: 'Rate (₹)',
    col_disc: 'Disc (₹)',
    col_total: 'Total (₹)',
    col_action: '✕',
    empty_cart: '🛒 Scan an item barcode or search above to add items to the bill.',

    cust_label: 'Customer (Udhar / Credit)',
    walkin_cust: 'Walk-in Customer (Cash)',
    btn_new_cust: '+ New',
    current_udhar: 'Current Udhar:',
    credit_limit: 'Limit:',
    total_items_count: 'Total Items',
    subtotal: 'Subtotal',
    bill_discount: 'Bill Discount',
    gst_included: 'GST Tax (Included)',
    round_off: 'Round Off',
    grand_total: 'Grand Total',
    payment_mode_label: 'Payment Mode',
    pay_cash: '💵 Cash',
    pay_upi: '📱 UPI / QR',
    pay_card: '💳 Card',
    pay_credit: '📒 Credit (Udhar)',
    tender_label: 'Amount Tendered (₹):',
    change_label: 'Change to Return:',
    btn_save_print: '🖨️ Complete & Print Bill (F4)',
    btn_save_only: '💾 Save Bill (No Print)',
    btn_clear: 'Clear',

    dash_title: '📊 Store Performance Dashboard',
    dash_subtitle: 'Live daily sales, receivables, and inventory alerts',
    dash_refresh: '🔄 Refresh',
    dash_stat_sales: "Today's Total Sales",
    dash_stat_bills_suffix: 'bills completed today',
    dash_stat_cash: 'Cash Collections',
    dash_stat_digital: 'UPI & Card Collections',
    dash_stat_udhar: 'Customer Udhar (Receivables)',
    dash_stat_lowstock: 'Low Stock Alert',
    dash_stat_payables: 'Supplier Payables',
    recent_bills_title: 'Recent Bills',
    top_items_title: 'Top Selling Items (This Month)',

    bills_title: '🧾 Bill History, Reprints & Returns',
    bills_subtitle: 'View past sales, reprint thermal receipts, process returns or voids',
    btn_filter: 'Filter',
    col_inv: 'Invoice #',
    col_datetime: 'Date & Time',
    col_customer: 'Customer',
    col_paid: 'Paid',
    col_udhar: 'Udhar',
    col_status: 'Status',
    col_cashier: 'Cashier',
    btn_reprint: '🖨️ Reprint',
    btn_void: 'Void',

    prod_title: '📦 Product Catalog & Price Management',
    prod_subtitle: 'Add products, configure purchase/selling rates, MRP, barcodes, and units',
    btn_add_product: '+ Add New Product',
    search_prod_placeholder: 'Search by name / barcode...',
    all_categories: 'All Categories',
    col_barcode: 'Barcode / SKU',
    col_cat: 'Category',
    col_unit: 'Unit',
    col_cost: 'Cost (₹)',
    col_sell: 'Sell Price (₹)',
    col_mrp: 'MRP (₹)',
    col_stock: 'Stock',
    btn_edit: 'Edit',

    cust_title: '👥 Customer Accounts & Udhar (Credit) Ledger',
    cust_subtitle: 'Track customer balances, credit limits, statements, and payment collections',
    btn_add_cust: '+ Add Customer',
    search_cust_placeholder: 'Search customer / mobile...',
    col_cust_name: 'Customer Name',
    col_phone: 'Phone',
    col_address: 'Address',
    col_limit: 'Credit Limit',
    col_udhar_bal: 'Udhar Balance (₹)',
    btn_collect_pay: 'Collect Payment',

    cash_open_title: '💵 Open Cash Counter (Day Start)',
    cash_open_desc: 'Count and enter the initial cash float / opening change in the drawer:',
    cash_open_amt: 'Opening Cash Float (₹)',
    cash_open_note: 'Opening Note (Optional)',
    btn_open_session: 'Open Counter Session',

    cash_close_title: '🏁 Close Cash Counter (Day End)',
    cash_close_desc: 'Reconcile physical cash counted in drawer against system transactions:',
    cash_close_actual: 'Physical Cash Counted in Drawer (₹)',
    cash_close_notes: 'Closing Notes / Discrepancy Reason',
    btn_close_session: 'Reconcile & Close Counter',

    // Common & Actions
    btn_mobile_scanner: '📱 Mobile Scanner',
    btn_add_supp: '+ Add Supplier',
    btn_add_purchase: '+ New Purchase Entry',
    btn_add_expense: '+ Record Expense',
    btn_adjust_stock: '+ Adjust Stock / Wastage',
    cancel: 'Cancel',
    save: 'Save',
  },
};

class I18nManager {
  constructor() {
    this.currentLang = localStorage.getItem('kiranapos_lang') || 'mr'; // Default to Marathi!
  }

  t(key) {
    const langDict = translations[this.currentLang] || translations.mr;
    return langDict[key] || translations.en[key] || key;
  }

  setLang(lang) {
    if (translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem('kiranapos_lang', lang);
      this.applyTranslations();
    }
  }

  toggleLang() {
    const newLang = this.currentLang === 'mr' ? 'en' : 'mr';
    this.setLang(newLang);
    return newLang;
  }

  applyTranslations() {
    // 1. Update navigation items
    const navMapping = {
      pos: 'nav_pos',
      dashboard: 'nav_dashboard',
      bills: 'nav_bills',
      products: 'nav_products',
      stock: 'nav_stock',
      purchases: 'nav_purchases',
      customers: 'nav_customers',
      suppliers: 'nav_suppliers',
      expenses: 'nav_expenses',
      reports: 'nav_reports',
      settings: 'nav_settings',
    };

    document.querySelectorAll('.nav-item').forEach(item => {
      const page = item.dataset.page;
      const key = navMapping[page];
      if (key) {
        const spanText = item.querySelectorAll('span')[1];
        if (spanText) spanText.textContent = this.t(key).replace(/^[^\s]+\s/, ''); // keep or clean emoji
      }
    });

    // 2. Language toggle button label
    const langLabel = document.getElementById('current-lang-label');
    if (langLabel) {
      langLabel.textContent = this.currentLang === 'mr' ? 'मराठी (म)' : 'English';
    }

    // 3. Search placeholder
    const searchInput = document.getElementById('pos-search-input');
    if (searchInput) searchInput.placeholder = this.t('search_placeholder');

    // 4. POS Buttons & Labels
    const btnNewBill = document.getElementById('pos-btn-new-bill');
    if (btnNewBill) btnNewBill.textContent = this.t('new_bill_btn');

    const emptyCartMsg = document.getElementById('pos-empty-cart-msg');
    if (emptyCartMsg) emptyCartMsg.textContent = this.t('empty_cart');

    const btnSavePrint = document.getElementById('pos-btn-save-print');
    if (btnSavePrint) btnSavePrint.textContent = this.t('btn_save_print');

    const btnSaveOnly = document.getElementById('pos-btn-save-only');
    if (btnSaveOnly) btnSaveOnly.textContent = this.t('btn_save_only');

    const btnClear = document.getElementById('pos-btn-clear');
    if (btnClear) btnClear.textContent = this.t('btn_clear');

    // 5. Payment mode buttons
    document.querySelectorAll('.pay-mode-btn').forEach(btn => {
      const mode = btn.dataset.mode;
      const span = btn.querySelector('span');
      if (span) {
        if (mode === 'cash') span.textContent = this.currentLang === 'mr' ? 'रोख (Cash)' : 'Cash';
        else if (mode === 'upi') span.textContent = this.currentLang === 'mr' ? 'युपीआय (UPI)' : 'UPI / QR';
        else if (mode === 'card') span.textContent = this.currentLang === 'mr' ? 'कार्ड (Card)' : 'Card';
        else if (mode === 'credit') span.textContent = this.currentLang === 'mr' ? 'उधारी (Udhar)' : 'Credit (Udhar)';
      }
    });

    // 6. Action buttons across pages
    const btnAddSupp = document.getElementById('supp-btn-add');
    if (btnAddSupp) btnAddSupp.textContent = this.t('btn_add_supp');

    const btnAddPur = document.getElementById('purchases-btn-add');
    if (btnAddPur) btnAddPur.textContent = this.t('btn_add_purchase');

    const btnAddCust = document.getElementById('cust-btn-add');
    if (btnAddCust) btnAddCust.textContent = this.t('btn_add_cust');

    const btnAddProd = document.getElementById('prod-btn-add');
    if (btnAddProd) btnAddProd.textContent = this.t('btn_add_product');

    const btnStockAdj = document.getElementById('stock-btn-adjust');
    if (btnStockAdj) btnStockAdj.textContent = this.t('btn_adjust_stock');

    const btnAddExp = document.getElementById('exp-btn-add');
    if (btnAddExp) btnAddExp.textContent = this.t('btn_add_expense');

    const btnMobileScanner = document.getElementById('pos-btn-mobile-scanner');
    if (btnMobileScanner) btnMobileScanner.textContent = this.t('btn_mobile_scanner');

    // 7. Refresh active cash session badge text
    if (window.app && window.app.refreshCashSession) {
      window.app.refreshCashSession();
    }
  }
}

window.i18n = new I18nManager();
