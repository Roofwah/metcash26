const express = require('express');
const cors = require('cors');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { db } = require('./db');

const serverDir = path.resolve(__dirname);
process.chdir(serverDir);

const app = express();
const PORT = process.env.PORT || 5001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Store TEXT NOT NULL UNIQUE,
    Name TEXT NOT NULL,
    Banner TEXT,
    Overall TEXT,
    Automotive TEXT,
    "Energy Storage" TEXT,
    Lighting TEXT,
    "Special Order Hardware" TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    OFFER TEXT,
    "Offer Group" TEXT,
    "Offer Tier" TEXT,
    "Drop Months" TEXT,
    "Order Deadline" TEXT,
    "Min Order Value (ex GST)" TEXT,
    Brand TEXT,
    Range TEXT,
    "Energizer Order Code" TEXT,
    "HTH Code" TEXT,
    Code TEXT,
    Description TEXT,
    "Reg Charge Back Cost" TEXT,
    "Expo Charge Back Cost" TEXT,
    Save TEXT,
    "SRP / Promo RRP" TEXT,
    "$ GM" TEXT,
    "% GM" TEXT,
    "Qty Type" TEXT,
    Qty TEXT,
    "Reg Total Cost" TEXT,
    "Expo Total Cost" TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_number TEXT NOT NULL,
    store_name TEXT NOT NULL,
    banner TEXT,
    user_name TEXT NOT NULL,
    position TEXT,
    purchase_order TEXT,
    total_value REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    offer_id TEXT,
    offer_tier TEXT,
    quantity INTEGER NOT NULL,
    description TEXT,
    cost REAL,
    drop_month TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS mcash_stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    suburb TEXT NOT NULL,
    state TEXT NOT NULL,
    pcode TEXT,
    banner TEXT NOT NULL
  )`);

  app.listen(PORT, () => {
    console.log(`Metcash API running on http://localhost:${PORT}`);
  });

  loadStoresCSV()
    .then(() => loadMcashStoresCSV())
    .then(() => loadOffersCSV())
    .then(() => console.log('Stores and offers loaded'))
    .catch(err => console.error('CSV load failed:', err));
});

function padStoreNumber(storeNumber) {
  if (!storeNumber) return null;
  return storeNumber.toString().trim().padStart(6, '0');
}

function removeBOM(str) {
  if (!str) return str;
  if (str.charCodeAt(0) === 0xFEFF) return str.substring(1);
  return str;
}

function cleanKeys(obj) {
  const cleaned = {};
  Object.keys(obj).forEach(key => {
    cleaned[removeBOM(key.trim())] = obj[key];
  });
  return cleaned;
}

app.get('/api/store/:storeNumber', (req, res) => {
  const paddedNumber = padStoreNumber(req.params.storeNumber);
  if (!paddedNumber || paddedNumber.length !== 6) {
    return res.status(400).json({ error: 'Invalid store number format' });
  }
  fetchStoreWithRetry(paddedNumber, (err, row) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch store data' });
    if (!row) return res.status(404).json({ error: 'Store not found' });
    res.json({
      storeNo: row.Store,
      storeName: row.Name,
      banner: row.Banner || '-',
      overall: row.Overall || '',
      automotive: row.Automotive || '',
      energyStorage: row['Energy Storage'] || '',
      lighting: row.Lighting || '',
      specialOrderHardware: row['Special Order Hardware'] || ''
    });
  });
});

app.get('/api/store-data/:storeNumber', (req, res) => {
  const paddedNumber = padStoreNumber(req.params.storeNumber);
  if (!paddedNumber || paddedNumber.length !== 6) {
    return res.status(400).json({ error: 'Invalid store number format' });
  }
  fetchStoreWithRetry(paddedNumber, (err, row) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch store data' });
    if (!row) {
      return res.json({
        storeNo: paddedNumber,
        storeName: `Store ${paddedNumber}`,
        banner: '-',
        overall: '',
        automotive: '',
        energyStorage: '',
        lighting: '',
        specialOrderHardware: ''
      });
    }
    res.json({
      storeNo: row.Store,
      storeName: row.Name,
      banner: row.Banner || '-',
      overall: row.Overall || '',
      automotive: row.Automotive || '',
      energyStorage: row['Energy Storage'] || '',
      lighting: row.Lighting || '',
      specialOrderHardware: row['Special Order Hardware'] || ''
    });
  });
});

function fetchStoreWithRetry(storeNumber, callback) {
  db.get('SELECT * FROM stores WHERE Store = ?', [storeNumber], (err, row) => {
    if (err) return callback(err);
    if (row) return callback(null, row);
    loadStoresCSV()
      .then(() => {
        db.get('SELECT * FROM stores WHERE Store = ?', [storeNumber], callback);
      })
      .catch(callback);
  });
}

// Mcash26 store lookup: state → suburb → banner (no store numbers)
app.get('/api/states', (req, res) => {
  db.all('SELECT DISTINCT state FROM mcash_stores WHERE state IS NOT NULL AND state != "" ORDER BY state', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch states' });
    res.json(rows.map(r => r.state));
  });
});

app.get('/api/suburbs', (req, res) => {
  const state = (req.query.state || '').trim();
  if (!state) return res.status(400).json({ error: 'state required' });
  db.all('SELECT DISTINCT suburb FROM mcash_stores WHERE state = ? AND suburb IS NOT NULL AND suburb != "" ORDER BY suburb', [state], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch suburbs' });
    res.json(rows.map(r => r.suburb));
  });
});

app.get('/api/mcash-stores', (req, res) => {
  const state = (req.query.state || '').trim();
  const suburb = (req.query.suburb || '').trim();
  if (!state || !suburb) return res.status(400).json({ error: 'state and suburb required' });
  db.all('SELECT id, name, address, suburb, state, pcode, banner FROM mcash_stores WHERE state = ? AND suburb = ? ORDER BY name', [state, suburb], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch stores' });
    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      address: r.address || '',
      suburb: r.suburb,
      state: r.state,
      pcode: r.pcode || '',
      banner: r.banner || '-',
    })));
  });
});

app.get('/api/offers', (req, res) => {
  const query = `
    SELECT "Offer Group", OFFER, Brand, Range, "Min Order Value (ex GST)", Save, "Expo Total Cost", "Offer Tier", Description, Qty, "Expo Charge Back Cost"
    FROM offers ORDER BY OFFER, "Offer Tier"
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch offers' });
    const groupedOffers = {};
    rows.forEach(row => {
      const offerKey = row.OFFER || row['Offer Group'];
      if (!groupedOffers[offerKey]) {
        groupedOffers[offerKey] = {
          offerId: offerKey,
          offerGroup: row['Offer Group'],
          brand: row.Brand,
          range: row.Range,
          minOrderValue: row['Min Order Value (ex GST)'],
          save: row.Save || '',
          totalCost: row['Expo Total Cost'] || '',
          offerTier: row['Offer Tier'] || '',
          descriptions: [],
          expoChargeBackCost: 0
        };
      }
      if (row.Save && row.Save.trim() !== '' && row.Save !== '-') {
        if (!groupedOffers[offerKey].save || groupedOffers[offerKey].save.trim() === '' || groupedOffers[offerKey].save === '-') {
          groupedOffers[offerKey].save = row.Save;
        }
      }
      if (offerKey === 'Energizer 7' && row.Save && row.Save.includes('50%')) {
        groupedOffers[offerKey].save = '50%';
      }
      if (row.Description) {
        groupedOffers[offerKey].descriptions.push({ description: row.Description, qty: row.Qty || '' });
      }
      const cost = parseFloat(row['Expo Charge Back Cost']) || 0;
      const qty = parseFloat(row.Qty) || 0;
      groupedOffers[offerKey].expoChargeBackCost += cost * qty;
    });
    Object.keys(groupedOffers).forEach(key => {
      groupedOffers[key].expoChargeBackCost = groupedOffers[key].expoChargeBackCost.toFixed(2);
      if (key === 'Energizer 7') groupedOffers[key].save = '50%';
    });
    res.json(Object.values(groupedOffers));
  });
});

app.get('/api/offers/:offerId', (req, res) => {
  const { offerId } = req.params;
  db.all(
    'SELECT * FROM offers WHERE OFFER = ? OR "Offer Group" = ? ORDER BY "Offer Tier", Description',
    [offerId, offerId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch offer details' });
      if (rows.length === 0) return res.status(404).json({ error: 'Offer not found' });
      const firstRow = rows[0];
      const hasTiers = firstRow['Offer Tier'] && !['Range Offer', 'Display Pre-Pack', 'Display Component'].includes(firstRow['Offer Tier']);
      if (hasTiers) {
        const tiers = {};
        rows.forEach(row => {
          const t = row['Offer Tier'];
          if (!tiers[t]) tiers[t] = [];
          tiers[t].push(row);
        });
        return res.json({ offerId, offerGroup: firstRow['Offer Group'], brand: firstRow.Brand, range: firstRow.Range, hasTiers: true, tiers, allItems: rows });
      }
      res.json({ offerId, offerGroup: firstRow['Offer Group'], brand: firstRow.Brand, range: firstRow.Range, hasTiers: false, items: rows });
    }
  );
});

app.post('/api/save-order', (req, res) => {
  const orderData = req.body;
  const storeNumber = orderData.storeNumber || '';
  const storeName = orderData.storeName || '';
  const banner = orderData.banner || '';
  const userName = orderData.userName || '';
  const position = orderData.position || '';
  const purchaseOrder = orderData.purchaseOrder || '';
  const totalValue = parseFloat(orderData.totalValue) || 0;
  const items = orderData.items || [];

  db.run(
    `INSERT INTO orders (store_number, store_name, banner, user_name, position, purchase_order, total_value)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [storeNumber, storeName, banner, userName, position, purchaseOrder, totalValue],
    function (err) {
      if (err) {
        console.error('Order insert error:', err);
        return res.status(500).json({ error: 'Failed to save order' });
      }
      const orderId = this.lastID;
      if (items.length === 0) {
        return res.json({ success: true, orderId, message: 'Order saved successfully' });
      }
      const stmt = db.prepare(
        'INSERT INTO order_items (order_id, offer_id, offer_tier, quantity, description, cost, drop_month) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      items.forEach(item => {
        const dropMonths = item.dropMonths && Array.isArray(item.dropMonths) ? item.dropMonths : (item.dropMonth ? Array(item.quantity || 1).fill(item.dropMonth) : Array(item.quantity || 1).fill('March'));
        for (let i = 0; i < (item.quantity || 1); i++) {
          stmt.run(orderId, item.offerId || '', item.offerTier || '', 1, item.description || '', parseFloat(item.cost) || 0, dropMonths[i] || 'March');
        }
      });
      stmt.finalize(err2 => {
        if (err2) {
          console.error('Order items insert error:', err2);
          return res.status(500).json({ error: 'Failed to save order items' });
        }
        res.json({ success: true, orderId, message: 'Order saved successfully' });
      });
    }
  );
});

app.get('/api/orders-stats', (req, res) => {
  db.get('SELECT COUNT(*) as count, COALESCE(SUM(total_value), 0) as totalValue FROM orders', [], (err, row) => {
    if (err) return res.status(500).json({ count: 0, totalValue: '0.00' });
    res.json({ count: row.count || 0, totalValue: (row.totalValue || 0).toFixed(2) });
  });
});

// Serve React app (client/build) when running as single service (e.g. Render)
const possibleBuildPaths = [
  path.join(__dirname, '..', 'frontend', 'build'),
  path.join(process.cwd(), 'frontend', 'build'),
  path.join(__dirname, '..', 'client', 'build'),
  path.join(process.cwd(), 'client', 'build'),
];
const clientBuildPath = possibleBuildPaths.find(p => fs.existsSync(p));
if (clientBuildPath) {
  console.log('Serving React build from:', clientBuildPath);
  app.use(express.static(clientBuildPath));
  // Express 5 / path-to-regexp no longer accepts bare "*" routes.
  app.use((req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  console.error('Client build not found. Tried:', possibleBuildPaths);
  app.get('/', (req, res) => {
    res.status(500).send(
      '<h1>Client build missing</h1><p>Set <b>Root Directory</b> to empty, <b>Build</b> to: <code>cd client && npm install && npm run build && cd ../server && npm install</code>, <b>Start</b> to: <code>node server/server.js</code>. Then redeploy.</p>'
    );
  });
}

function loadStoresCSV() {
  const filePath = path.resolve(__dirname, 'ihg26stores.csv');
  if (!fs.existsSync(filePath)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(csv())
      .on('data', (data) => {
        const cleanData = cleanKeys(data);
        const storeNumber = padStoreNumber(cleanData.Store || cleanData['Store']);
        if (!storeNumber) return;
        results.push({
          Store: storeNumber,
          Name: (cleanData.Name || '').trim(),
          Banner: (cleanData.Banner || '-').trim(),
          Overall: (cleanData.Overall || '').trim(),
          Automotive: (cleanData.Automotive || '').trim(),
          'Energy Storage': (cleanData['Energy Storage'] || '').trim(),
          Lighting: (cleanData.Lighting || '').trim(),
          'Special Order Hardware': (cleanData['Special Order Hardware'] || '').trim()
        });
      })
      .on('end', () => {
        if (results.length === 0) return resolve();
        db.run('DELETE FROM stores', err => {
          if (err) return reject(err);
          const stmt = db.prepare(`INSERT OR REPLACE INTO stores (Store, Name, Banner, Overall, Automotive, "Energy Storage", Lighting, "Special Order Hardware") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
          results.forEach(row => stmt.run([row.Store, row.Name, row.Banner, row.Overall, row.Automotive, row['Energy Storage'], row.Lighting, row['Special Order Hardware']]));
          stmt.finalize();
          console.log(`Loaded ${results.length} stores`);
          resolve();
        });
      })
      .on('error', reject);
  });
}

function loadMcashStoresCSV() {
  const filePath = path.resolve(__dirname, 'mcash26.csv');
  if (!fs.existsSync(filePath)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(csv())
      .on('data', (data) => {
        const clean = cleanKeys(data);
        const name = (clean.Store || clean.store || '').trim();
        const suburb = (clean.Suburb || clean.suburb || '').trim();
        const state = (clean.State || clean.state || '').trim();
        const banner = (clean.Banner || clean.banner || '-').trim() || '-';
        if (!name || !suburb || !state) return;
        results.push({
          name,
          address: (clean.Address || clean.address || '').trim(),
          suburb,
          state,
          pcode: (clean.Pcode || clean.pcode || '').trim(),
          banner,
        });
      })
      .on('end', () => {
        if (results.length === 0) return resolve();
        db.run('DELETE FROM mcash_stores', err => {
          if (err) return reject(err);
          const stmt = db.prepare('INSERT INTO mcash_stores (name, address, suburb, state, pcode, banner) VALUES (?, ?, ?, ?, ?, ?)');
          results.forEach(row => stmt.run([row.name, row.address, row.suburb, row.state, row.pcode, row.banner]));
          stmt.finalize();
          console.log(`Loaded ${results.length} mcash stores`);
          resolve();
        });
      })
      .on('error', reject);
  });
}

function loadOffersCSV() {
  const filePath = path.resolve(__dirname, 'offers.csv');
  if (!fs.existsSync(filePath)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(csv())
      .on('data', (data) => results.push(cleanKeys(data)))
      .on('end', () => {
        if (results.length === 0) return resolve();
        db.run('DELETE FROM offers', err => {
          if (err) return reject(err);
          const columns = Object.keys(results[0]);
          const placeholders = columns.map(() => '?').join(',');
          const quotedColumns = columns.map(col => `"${col}"`).join(',');
          const stmt = db.prepare(`INSERT INTO offers (${quotedColumns}) VALUES (${placeholders})`);
          results.forEach(row => stmt.run(columns.map(col => (row[col] || '').trim())));
          stmt.finalize();
          console.log(`Loaded ${results.length} offers`);
          resolve();
        });
      })
      .on('error', reject);
  });
}

process.on('SIGINT', () => {
  db.close(() => process.exit(0));
});
