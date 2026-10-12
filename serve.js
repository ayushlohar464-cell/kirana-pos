/**
 * KiranaPOS Local Web & Mobile Barcode Scanner Server
 * Dual HTTP (port 3000) & HTTPS (port 3443) Server
 * Enables camera barcode scanning in secure context on smartphones & PC
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');
const selfsigned = require('selfsigned');

const HTTP_PORT = parseInt(process.env.PORT || '3000', 10);
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || '3443', 10);
const PUBLIC_DIR = path.join(__dirname, 'src/renderer');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Set of active Server-Sent Events (SSE) connections
const sseClients = new Set();

/**
 * Determine local IPv4 address
 */
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const isWifi = /wi-fi|wlan|wireless|en0|eth|ethernet/i.test(name);
        candidates.push({ ip: iface.address, name, isWifi });
      }
    }
  }

  if (candidates.length === 0) return '127.0.0.1';
  const wifiCandidate = candidates.find(c => c.isWifi);
  return (wifiCandidate || candidates[0]).ip;
}

const PRODUCTS_FILE = path.join(__dirname, 'data/products.json');
const SALES_FILE = path.join(__dirname, 'data/sales.json');
const SETTINGS_FILE = path.join(__dirname, 'data/settings.json');
const CUSTOMERS_FILE = path.join(__dirname, 'data/customers.json');

const DEFAULT_SETTINGS = {
  shop_name: 'Lohar Kirana Store',
  shop_tagline: 'ताजा किराणा व दैनंदिन वस्तू',
  shop_address: 'मेन मार्केट रोड',
  shop_phone: '+91 98765 43210',
  shop_gstin: '',
  receipt_footer_msg: 'आमच्या दुकानात खरेदी केल्याबद्दल धन्यवाद! पुन्हा या.',
  printer_width: '80mm',
  printer_name: '',
};

function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading settings.json:', e);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving settings.json:', e);
  }
}

function getCustomers() {
  try {
    if (fs.existsSync(CUSTOMERS_FILE)) {
      return JSON.parse(fs.readFileSync(CUSTOMERS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading customers.json:', e);
  }
  return [
    { id: 1, name: 'Ramesh Patel', phone: '9820011223', address: 'Flat 102, Shanti Niwas', credit_limit: 500000, current_balance: 145000, is_active: 1 },
    { id: 2, name: 'Sanjay Shinde', phone: '9833445566', address: 'Shop 4, Station Road', credit_limit: 300000, current_balance: 52000, is_active: 1 },
    { id: 3, name: 'Pooja Kulkarni', phone: '9819283746', address: 'Building B, Sector 3', credit_limit: 200000, current_balance: 0, is_active: 1 },
  ];
}

function saveCustomers(customers) {
  try {
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(customers, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving customers.json:', e);
  }
}

function getProducts() {
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading products.json:', e);
  }
  return [];
}

function saveProducts(products) {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving products.json:', e);
  }
}

function getSales() {
  try {
    if (fs.existsSync(SALES_FILE)) {
      return JSON.parse(fs.readFileSync(SALES_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading sales.json:', e);
  }
  return [];
}

function saveSales(sales) {
  try {
    fs.writeFileSync(SALES_FILE, JSON.stringify(sales, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving sales.json:', e);
  }
}

/**
 * Broadcast message to all connected screens (POS, Scanner)
 */
function broadcastMessage(payloadObj) {
  const payload = JSON.stringify(payloadObj);
  const msg = `data: ${payload}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(msg);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

function broadcastBarcode(barcode) {
  const products = getProducts();
  const trimmed = String(barcode).trim();
  const product = products.find(p => (p.quick_code && String(p.quick_code).trim() === trimmed) || p.barcode === trimmed);
  broadcastMessage({
    type: 'barcode_scan',
    barcode: trimmed,
    product: product || null,
    timestamp: Date.now(),
  });
}

// Keep SSE connections active
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(':keep-alive\n\n');
    } catch (err) {
      sseClients.delete(client);
    }
  }
}, 15000);

/**
 * Common request handler for both HTTP and HTTPS
 */
async function handleRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. API: Network info & QR Codes for mobile pairing
  if (pathname === '/api/network-info' && req.method === 'GET') {
    try {
      const localIp = getLocalIpAddress();
      const httpScannerUrl = `http://${localIp}:${HTTP_PORT}/scanner.html`;
      const httpsScannerUrl = `https://${localIp}:${HTTPS_PORT}/scanner.html`;

      // Generate QR Code for the HTTPS scanner URL (enables live camera on mobile)
      const qrDataUrlHttps = await QRCode.toDataURL(httpsScannerUrl, {
        margin: 1,
        width: 250,
        color: { dark: '#0f172a', light: '#ffffff' },
      });

      // Also generate QR code for HTTP
      const qrDataUrlHttp = await QRCode.toDataURL(httpScannerUrl, {
        margin: 1,
        width: 250,
        color: { dark: '#0f172a', light: '#ffffff' },
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ip: localIp,
        httpPort: HTTP_PORT,
        httpsPort: HTTPS_PORT,
        httpScannerUrl,
        httpsScannerUrl,
        scannerUrl: httpsScannerUrl, // Default to HTTPS for live camera
        qrDataUrl: qrDataUrlHttps,
        qrDataUrlHttp,
        connectedScreens: sseClients.size,
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 2. API: SSE Stream for Live Barcode Push
  if (pathname === '/api/scan-stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });

    res.write(':connected\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 3. API: Receive Barcode Scanned from Mobile Phone & Return Product Details
  if (pathname === '/api/scan' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 20000) req.destroy();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const barcode = (data.barcode || '').trim();

        if (!barcode) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Barcode is required' }));
          return;
        }

        const products = getProducts();
        const trimmed = barcode.trim();
        const product = products.find(p => (p.quick_code && String(p.quick_code).trim() === trimmed) || p.barcode === trimmed);

        console.log(`[📱 Barcode/Quick Code]: ${barcode} -> ${product ? product.name : '(नवीन वस्तू / Uncatalogued)'}`);
        broadcastBarcode(barcode);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          barcode,
          product: product || null,
          found: !!product,
          broadcastCount: sseClients.size,
          timestamp: Date.now(),
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // 4. API: Products Catalog
  if (pathname === '/api/products' && req.method === 'GET') {
    const products = getProducts();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(products));
    return;
  }

  if (pathname === '/api/products' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const newProd = JSON.parse(body);
        if (!newProd.name) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Product name is required' }));
          return;
        }

        const products = getProducts();
        if (!newProd.barcode) {
          newProd.barcode = '8901' + Date.now().toString().slice(-8);
        }

        // Match existing by id first, then by barcode
        let existingIdx = -1;
        if (newProd.id) {
          existingIdx = products.findIndex(p => p.id === Number(newProd.id));
        }
        if (existingIdx === -1 && newProd.barcode) {
          existingIdx = products.findIndex(p => p.barcode === String(newProd.barcode).trim());
        }

        if (existingIdx >= 0) {
          products[existingIdx] = { ...products[existingIdx], ...newProd };
          newProd.id = products[existingIdx].id;
        } else {
          newProd.id = newProd.id ? Number(newProd.id) : (products.length > 0 ? Math.max(...products.map(p => Number(p.id) || 0)) + 1 : 1);
          products.push(newProd);
        }

        saveProducts(products);
        console.log(`[📦 Catalog Synced]: ${newProd.name} (Code: ${newProd.quick_code || '-'}, Barcode: ${newProd.barcode})`);
        broadcastMessage({ type: 'catalog_updated', product: newProd });

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, product: newProd }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/products' && req.method === 'DELETE') {
    const id = parsedUrl.searchParams.get('id');
    if (id) {
      let products = getProducts();
      products = products.filter(p => p.id !== Number(id));
      saveProducts(products);
      console.log(`[📦 Product Deleted]: ID ${id}`);
      broadcastMessage({ type: 'catalog_updated' });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true }));
      return;
    }
  }

  // 4b. API: Customers & Udhar Ledger
  if (pathname === '/api/customers' && req.method === 'GET') {
    const customers = getCustomers();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(customers));
    return;
  }

  if (pathname === '/api/customers' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const custData = JSON.parse(body);
        const customers = getCustomers();
        let existingIdx = -1;
        if (custData.id) {
          existingIdx = customers.findIndex(c => c.id === Number(custData.id));
        } else if (custData.phone) {
          existingIdx = customers.findIndex(c => c.phone === custData.phone);
        }

        if (existingIdx >= 0) {
          customers[existingIdx] = { ...customers[existingIdx], ...custData };
        } else {
          custData.id = custData.id || Date.now();
          custData.current_balance = custData.current_balance || 0;
          customers.push(custData);
        }
        saveCustomers(customers);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, customer: custData }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 5. API: Complete Sale & Generate Bill Directly from Mobile
  if (pathname === '/api/sales' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const saleData = JSON.parse(body);
        const sales = getSales();
        
        const currentYear = new Date().getFullYear();
        const invoiceNum = String(sales.length + 1).padStart(4, '0');
        const invoiceNo = `INV-${currentYear}-${invoiceNum}`;

        const currentSettings = getSettings();
        const saleRecord = {
          id: Date.now(),
          invoice_no: invoiceNo,
          customer_name: saleData.customer_name || 'साधा ग्राहक (Walk-in)',
          customer_phone: saleData.customer_phone || '',
          payment_mode: saleData.payment_mode || 'cash',
          items: saleData.items || [],
          total_items: (saleData.items || []).reduce((acc, it) => acc + (Number(it.qty) || 1), 0),
          subtotal: Number(saleData.subtotal) || 0,
          discount: Number(saleData.discount) || 0,
          grand_total: Number(saleData.grand_total) || 0,
          created_at: new Date().toISOString(),
          shop_name: currentSettings.shop_name || 'Lohar Kirana Store',
          shop_phone: currentSettings.shop_phone || '+91 98765 43210',
          shop_address: currentSettings.shop_address || 'मेन मार्केट रोड',
        };

        sales.unshift(saleRecord);
        saveSales(sales);

        console.log(`[🧾 Sale Generated]: ${invoiceNo} | ₹${saleRecord.grand_total} | Items: ${saleRecord.total_items}`);

        // Broadcast to PC POS screen
        broadcastMessage({
          type: 'sale_completed',
          sale: saleRecord,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          sale: saleRecord,
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/sales' && req.method === 'GET') {
    const sales = getSales();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(sales.slice(0, 50)));
    return;
  }

  // 6. API: Shop Settings Management
  if (pathname === '/api/settings' && req.method === 'GET') {
    const settings = getSettings();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(settings));
    return;
  }

  if (pathname === '/api/settings' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        const existing = getSettings();
        const merged = { ...existing, ...incoming };
        saveSettings(merged);
        console.log(`[⚙️ Shop Settings Updated]: ${merged.shop_name}`);

        broadcastMessage({
          type: 'settings_updated',
          settings: merged,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, settings: merged }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 4. Static Files
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  } else if (reqPath === '/scanner' || reqPath === '/scanner/') {
    reqPath = '/scanner.html';
  }

  const filePath = path.join(PUBLIC_DIR, reqPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

async function startServers() {
  const localIp = getLocalIpAddress();

  // 1. Start HTTP Server
  const httpServer = http.createServer(handleRequest);
  httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`🛒 HTTP POS Server:    http://localhost:${HTTP_PORT}`);
    console.log(`📱 HTTP Mobile Scanner: http://${localIp}:${HTTP_PORT}/scanner.html`);
  });

  // 2. Generate SSL Cert and Start HTTPS Server locally (for secure live camera context on smartphones)
  if (!process.env.PORT) {
    try {
      const pems = await selfsigned.generate([
        { name: 'commonName', value: localIp },
        { name: 'organizationName', value: 'KiranaPOS Local' },
      ], {
        days: 365,
        keySize: 2048,
      });

      const httpsServer = https.createServer({
        key: pems.private,
        cert: pems.cert,
      }, handleRequest);

      httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`🔒 HTTPS POS Server:   https://localhost:${HTTPS_PORT}`);
        console.log(`📱 HTTPS Mobile Live:  https://${localIp}:${HTTPS_PORT}/scanner.html (Recommended for Live Camera)`);
        console.log('================================================================');
      });
    } catch (sslErr) {
      console.warn('Could not start HTTPS server, falling back to HTTP only:', sslErr.message);
    }
  } else {
    console.log(`☁️ Cloud Deployment Active: Listening on port ${HTTP_PORT}`);
    console.log('================================================================');
  }
}

startServers();

module.exports = { broadcastBarcode, getLocalIpAddress };
