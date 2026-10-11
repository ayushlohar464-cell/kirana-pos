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
  const product = products.find(p => p.barcode === barcode);
  broadcastMessage({
    type: 'barcode_scan',
    barcode: String(barcode).trim(),
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
        const product = products.find(p => p.barcode === barcode);

        console.log(`[📱 Barcode Scanned]: ${barcode} -> ${product ? product.name : '(नवीन वस्तू / Uncatalogued)'}`);
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
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(products));
    return;
  }

  if (pathname === '/api/products' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const newProd = JSON.parse(body);
        if (!newProd.barcode || !newProd.name) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Barcode and name required' }));
          return;
        }
        const products = getProducts();
        const existingIdx = products.findIndex(p => p.barcode === newProd.barcode);
        if (existingIdx >= 0) {
          products[existingIdx] = { ...products[existingIdx], ...newProd };
        } else {
          newProd.id = products.length > 0 ? Math.max(...products.map(p => p.id || 0)) + 1 : 1;
          products.push(newProd);
        }
        saveProducts(products);
        broadcastMessage({ type: 'catalog_updated', product: newProd });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, product: newProd }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
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
          shop_name: 'श्री गणेश किराणा & जनरल स्टोअर',
          shop_phone: '+91 98765 43210',
          shop_address: 'मेन मार्केट रोड, दुकान नं. ४',
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
