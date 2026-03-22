'use strict';
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const csv     = require('csv-parser');
const fs      = require('fs');
const path    = require('path');
const { pool } = require('./db');

const serverDir = path.resolve(__dirname);
process.chdir(serverDir);
console.log('Server dir:', serverDir);

// ---------------------------------------------------------------------------
// Offer content – logos, hero images, and marketing copy per offer group.
// Loaded once at startup from offer-content.json.
// ---------------------------------------------------------------------------
const OFFER_CONTENT_PATH = path.join(serverDir, 'offer-content.json');
let offerContentMap = {}; // normalised-name → content object

function normaliseOfferName(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

try {
  const raw = JSON.parse(fs.readFileSync(OFFER_CONTENT_PATH, 'utf8'));
  raw.forEach(item => {
    offerContentMap[normaliseOfferName(item.offer)] = item;
  });
  console.log(`Loaded ${raw.length} offer-content entries.`);
} catch (e) {
  console.warn('offer-content.json not found or invalid:', e.message);
}

function applyOfferContent(grouped) {
  Object.keys(grouped).forEach(key => {
    const match = offerContentMap[normaliseOfferName(key)];
    if (!match) return;
    const g = grouped[key];
    if (match.logo)  g.logoUrl  = `/products/${match.logo}`;
    if (match.hero)  g.heroUrl  = `/products/${match.hero}`;
    if (match.h1)    g.h1       = match.h1;
    if (match.h2)    g.h2       = match.h2;
    if (match.body)  g.message  = match.body;
  });
  return grouped;
}

const app         = express();
const PORT        = process.env.PORT || 5001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true, dbReady });
});

// ---------------------------------------------------------------------------
// Schema bootstrap – runs once on startup.
// Column names preserve the original casing so raw row objects returned to
// the frontend keep the same property names the TypeScript interfaces expect.
// ---------------------------------------------------------------------------
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stores (
      id                    SERIAL PRIMARY KEY,
      "Store"               TEXT NOT NULL UNIQUE,
      "Name"                TEXT NOT NULL,
      "Banner"              TEXT,
      "Overall"             TEXT,
      "Automotive"          TEXT,
      "Energy Storage"      TEXT,
      "Lighting"            TEXT,
      "Special Order Hardware" TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS offers (
      id                        SERIAL PRIMARY KEY,
      "OFFER"                   TEXT,
      "Offer Group"             TEXT,
      "Offer Tier"              TEXT,
      "Drop Months"             TEXT,
      "Order Deadline"          TEXT,
      "Min Order Value (ex GST)" TEXT,
      "Brand"                   TEXT,
      "Range"                   TEXT,
      "Energizer Order Code"    TEXT,
      "HTH Code"                TEXT,
      "Code"                    TEXT,
      "Description"             TEXT,
      "Reg Charge Back Cost"    TEXT,
      "Expo Charge Back Cost"   TEXT,
      "Save"                    TEXT,
      "SRP / Promo RRP"         TEXT,
      "$ GM"                    TEXT,
      "% GM"                    TEXT,
      "Qty Type"                TEXT,
      "Qty"                     TEXT,
      "Reg Total Cost"          TEXT,
      "Expo Total Cost"         TEXT
    )
  `);

  await pool.query(`
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Logo" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Product Image" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Hero" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Category" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Message" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Other" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Type" TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id             SERIAL PRIMARY KEY,
      store_number   TEXT NOT NULL,
      store_name     TEXT NOT NULL,
      banner         TEXT,
      user_name      TEXT NOT NULL,
      position       TEXT,
      purchase_order TEXT,
      email          TEXT,
      total_value    NUMERIC NOT NULL,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS email TEXT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_code TEXT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS rep_email TEXT`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id          SERIAL PRIMARY KEY,
      order_id    INTEGER NOT NULL REFERENCES orders(id),
      offer_id    TEXT,
      offer_tier  TEXT,
      quantity    INTEGER NOT NULL,
      description TEXT,
      cost        NUMERIC,
      drop_month  TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mcash_stores (
      id      SERIAL PRIMARY KEY,
      name    TEXT NOT NULL,
      address TEXT,
      suburb  TEXT NOT NULL,
      state   TEXT NOT NULL,
      pcode   TEXT,
      banner  TEXT NOT NULL
    )
  `);

  console.log('DB schema ready.');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function padStoreNumber(storeNumber) {
  if (!storeNumber) return null;
  return storeNumber.toString().trim().padStart(6, '0');
}

function removeBOM(str) {
  if (!str) return str;
  return str.charCodeAt(0) === 0xFEFF ? str.substring(1) : str;
}

function cleanKeys(obj) {
  const cleaned = {};
  Object.keys(obj).forEach(key => {
    cleaned[removeBOM(key.trim())] = obj[key];
  });
  return cleaned;
}

/** Stream a CSV file and run each cleaned row through `transform`.
 *  Rows where transform returns null/undefined are skipped. */
function parseCSV(filePath, transform) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(csv())
      .on('data', (data) => {
        const row = transform(cleanKeys(data));
        if (row) results.push(row);
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

let fallbackMcashStores = null;
let fallbackMcashStoresPromise = null;
let fallbackOffersRows = null;
let fallbackOffersPromise = null;

function invalidateOffersFallbackCache() {
  fallbackOffersRows = null;
  fallbackOffersPromise = null;
}

/** Excel/Sheets often export `offers` as tab-separated; csv-parser defaults to comma. */
function detectOffersCsvSeparator(filePath) {
  try {
    const head = fs.readFileSync(filePath, { encoding: 'utf8' });
    const firstLine = (head.split(/\r?\n/, 1)[0] || '').trimStart();
    const line = removeBOM(firstLine);
    const tabs = (line.match(/\t/g) || []).length;
    const commas = (line.match(/,/g) || []).length;
    if (tabs > 0 && tabs >= commas) return '\t';
  } catch (_) { /* keep comma */ }
  return ',';
}

/** Read offers.csv into raw row objects (trimmed keys). */
function readOffersCsvRaw(filePath) {
  const separator = detectOffersCsvSeparator(filePath);
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(csv({ separator }))
      .on('data', (data) => results.push(cleanKeys(data)))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

/** Map new spreadsheet (Name / Item / cost …) → same row shape as legacy `loadOffersCSV` transform. */
function mapNewRetailOffersCsv(rawRows) {
  let carryName = '';
  let carryBrand = '';
  let carryType = '';
  const out = [];
  for (const clean of rawRows) {
    const name = (clean.Name || '').trim();
    if (name) carryName = name;
    const b = (clean.Brand || '').trim();
    if (b) carryBrand = b;
    const t = (clean.Type || '').trim();
    if (t) carryType = t;
    const item = (clean.Item || '').trim();
    if (!item || !carryName) continue;

    const qtyNum = parseFloat(String(clean.qty || '').replace(/,/g, '')) || 0;
    const lineReg = parseFloat(String(clean['reg cost'] || '').replace(/,/g, '')) || 0;
    const lineExpo = parseFloat(String(clean.cost || '').replace(/,/g, '')) || 0;
    const perReg = qtyNum > 0 ? lineReg / qtyNum : lineReg;
    const perExpo = qtyNum > 0 ? lineExpo / qtyNum : lineExpo;

    out.push({
      offer: carryName,
      offerGroup: carryType,
      offerTier: (clean.range || '').trim(),
      dropMonths: (clean.months || '').trim(),
      orderDeadline: (clean.deadline || '').trim(),
      minOrderValue: String(clean['min order'] ?? '').trim(),
      brand: carryBrand || carryName.split(/\s+/)[0] || carryName,
      range: (clean.range || '').trim(),
      energizerOrderCode: '',
      hthCode: '',
      code: (clean.Code || '').trim(),
      description: item,
      regChargeBackCost: perReg > 0 ? String(perReg) : '',
      expoChargeBackCost: perExpo > 0 ? String(perExpo) : '',
      save: '',
      srpPromoRrp: String(clean.rrp ?? '').trim(),
      gmDollar: '',
      gmPercent: '',
      qtyType: '',
      qty: String(clean.qty ?? '').trim(),
      regTotalCost: String(clean['reg cost'] ?? '').trim(),
      expoTotalCost: String(clean.cost ?? '').trim(),
      logo: '',
      productImage: '',
      hero: '',
      category: '',
      message: '',
      other: '',
      offerType: '',
    });
  }
  return out;
}

/** Blank or "-" → empty string (never null; safe for DB text columns). */
function normalizeCsvCell(v) {
  const t = String(v ?? '').trim();
  if (!t || t === '-') return '';
  return t;
}

/** Paths like `images/x.png` or `/images/x.png` — served from `frontend/public`. */
function normalizePublicImagePath(p) {
  const s = normalizeCsvCell(p);
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return s.startsWith('/') ? s : `/${s.replace(/^\/+/, '')}`;
}

/** First non-empty text across rows (DB or fallback row keys). */
function pickFirstNonEmptyText(rows, ...keys) {
  for (const row of rows) {
    for (const k of keys) {
      const t = normalizeCsvCell(row[k]);
      if (t) return t;
    }
  }
  return '';
}

/** First usable public image URL across rows. */
function firstImageUrl(rows, ...keys) {
  for (const row of rows) {
    for (const k of keys) {
      const u = normalizePublicImagePath(row[k]);
      if (u) return u;
    }
  }
  return '';
}

function buildOfferMetaFromRows(rows) {
  return {
    logoUrl: firstImageUrl(rows, 'Logo', 'logo'),
    productImageUrl: firstImageUrl(rows, 'Product Image', 'ProductImage', 'productImage'),
    heroUrl: firstImageUrl(rows, 'Hero', 'hero'),
    category: pickFirstNonEmptyText(rows, 'Category', 'category'),
    message: pickFirstNonEmptyText(rows, 'Message', 'message'),
    other: pickFirstNonEmptyText(rows, 'Other', 'other'),
    offerType: pickFirstNonEmptyText(rows, 'Type', 'type'),
  };
}

/**
 * Group raw DB/fallback rows into list payload (one object per offer id).
 */
function groupOffersRows(rows) {
  const grouped = {};
  rows.forEach((row) => {
    const key = row.OFFER || row['Offer Group'];
    if (!key) return;
    if (!grouped[key]) {
      const meta = buildOfferMetaFromRows([row]);
      grouped[key] = {
        offerId: key,
        offerGroup: row['Offer Group'],
        brand: row.Brand,
        range: row.Range,
        minOrderValue: row['Min Order Value (ex GST)'],
        save: row.Save || '',
        totalCost: row['Expo Total Cost'] || '',
        offerTier: row['Offer Tier'] || '',
        descriptions: [],
        expoChargeBackCost: 0,
        logoUrl: meta.logoUrl,
        productImageUrl: meta.productImageUrl,
        heroUrl: meta.heroUrl,
        category: meta.category,
        message: meta.message,
        other: meta.other,
        offerType: meta.offerType,
      };
    } else {
      const g = grouped[key];
      const merge = buildOfferMetaFromRows([row]);
      if (!g.logoUrl && merge.logoUrl) g.logoUrl = merge.logoUrl;
      if (!g.productImageUrl && merge.productImageUrl) g.productImageUrl = merge.productImageUrl;
      if (!g.heroUrl && merge.heroUrl) g.heroUrl = merge.heroUrl;
      if (!g.category && merge.category) g.category = merge.category;
      if (!g.message && merge.message) g.message = merge.message;
      if (!g.other && merge.other) g.other = merge.other;
      if (!g.offerType && merge.offerType) g.offerType = merge.offerType;
    }
    if (row.Save && row.Save.trim() && row.Save !== '-') {
      if (!grouped[key].save || !grouped[key].save.trim() || grouped[key].save === '-') {
        grouped[key].save = row.Save;
      }
    }
    if (key === 'Energizer 7' && row.Save && row.Save.includes('50%')) {
      grouped[key].save = '50%';
    }
    if (row.Description) {
      const expoPrice  = parseFloat(row['Expo Total Cost'])  || 0;
      const normCost   = parseFloat(row['Reg Total Cost'])   || 0;
      const rrp        = parseFloat(row['SRP / Promo RRP'])  || 0;
      const units      = parseFloat(row.Qty)                 || 1;
      const expoPerUnit = expoPrice / units;
      const discount   = normCost > 0 ? ((normCost - expoPrice) / normCost * 100).toFixed(1) + '%' : (row.Save || '');
      const margin     = rrp > 0 ? ((rrp - expoPerUnit) / rrp * 100).toFixed(1) + '%' : '';
      grouped[key].descriptions.push({
        description:  row.Description,
        metcashCode:  row['HTH Code'] || row.Code || '',
        qty:          row.Qty || '',
        rrp:          row['SRP / Promo RRP'] || '',
        expoPrice:    row['Expo Total Cost'] || '',
        normalCost:   row['Reg Total Cost'] || '',
        discount,
        margin,
      });
    }
    // expoChargeBackCost = sum of all Expo Total Cost values across all SKUs in this offer
    grouped[key].expoChargeBackCost += parseFloat(row['Expo Total Cost']) || 0;
  });

  Object.keys(grouped).forEach((k) => {
    grouped[k].expoChargeBackCost = grouped[k].expoChargeBackCost.toFixed(2);
  });

  return grouped;
}

function mapLegacyOffersCsvRow(clean) {
  return {
    offer:              normalizeCsvCell(clean.OFFER),
    offerGroup:         normalizeCsvCell(clean['Offer Group']),
    offerTier:          normalizeCsvCell(clean['Offer Tier']),
    dropMonths:         normalizeCsvCell(clean['Drop Months']),
    orderDeadline:      normalizeCsvCell(clean['Order Deadline']),
    minOrderValue:      normalizeCsvCell(clean['Min Order Value (ex GST)']),
    brand:              normalizeCsvCell(clean.Brand),
    range:              normalizeCsvCell(clean.Range),
    energizerOrderCode: normalizeCsvCell(clean['Energizer Order Code']),
    hthCode:            normalizeCsvCell(clean['HTH Code']),
    code:               normalizeCsvCell(clean.Code),
    description:        normalizeCsvCell(clean.Description),
    regChargeBackCost:  normalizeCsvCell(clean['Reg Charge Back Cost']),
    expoChargeBackCost: normalizeCsvCell(clean['Expo Charge Back Cost']),
    save:               normalizeCsvCell(clean.Save),
    srpPromoRrp:        normalizeCsvCell(clean['SRP / Promo RRP']),
    gmDollar:           normalizeCsvCell(clean['$ GM']),
    gmPercent:          normalizeCsvCell(clean['% GM']),
    qtyType:            normalizeCsvCell(clean['Qty Type']),
    qty:                normalizeCsvCell(clean.Qty),
    regTotalCost:       normalizeCsvCell(clean['Reg Total Cost']),
    expoTotalCost:      normalizeCsvCell(clean['Expo Total Cost']),
    logo:               normalizeCsvCell(clean.Logo),
    productImage:       normalizeCsvCell(clean['Product Image'] || clean.ProductImage),
    hero:               normalizeCsvCell(clean.Hero),
    category:           normalizeCsvCell(clean.Category),
    message:            normalizeCsvCell(clean.Message),
    other:              normalizeCsvCell(clean.Other),
    offerType:          normalizeCsvCell(clean.Type),
  };
}

/**
 * Unified CSV: OFFER + image columns + business fields in one place.
 * Forward-fills Logo, Hero, Product Image, Offer Group, Brand when blank on continuation rows.
 */
function mapUnifiedOffersCsv(rawRows) {
  let carryLogo = '';
  let carryHero = '';
  let carryProduct = '';
  let carryGroup = '';
  let carryBrand = '';
  const out = [];
  for (const c of rawRows) {
    const off = normalizeCsvCell(c.OFFER);
    if (!off) continue;

    const lg = normalizeCsvCell(c.Logo);
    const hr = normalizeCsvCell(c.Hero);
    const pi = normalizeCsvCell(c['Product Image'] || c.ProductImage);
    const og = normalizeCsvCell(c['Offer Group']);
    const br = normalizeCsvCell(c.Brand);
    if (lg) carryLogo = lg;
    if (hr) carryHero = hr;
    if (pi) carryProduct = pi;
    if (og) carryGroup = og;
    if (br) carryBrand = br;

    const itemLine = normalizeCsvCell(c.Item);
    const desc = normalizeCsvCell(c.Description);
    const lineDescription = itemLine || desc;

    const reg = normalizeCsvCell(c['Reg Charge Back Cost']) || normalizeCsvCell(c['Reg Charge']);
    const expo = normalizeCsvCell(c['Expo Charge Back Cost']) || normalizeCsvCell(c['Expo Charge']);
    const discount = normalizeCsvCell(c.Discount) || normalizeCsvCell(c.Save);
    const minVal = normalizeCsvCell(c.Value) || normalizeCsvCell(c['Min Order Value (ex GST)']);

    const marketing = normalizeCsvCell(c.Message) || (itemLine && desc ? desc : '');

    out.push({
      offer: off,
      offerGroup: carryGroup,
      offerTier: normalizeCsvCell(c.Tier) || normalizeCsvCell(c['Offer Tier']),
      dropMonths: normalizeCsvCell(c['Drop Months']),
      orderDeadline: normalizeCsvCell(c['Order Deadline']),
      minOrderValue: minVal,
      brand: carryBrand,
      range: normalizeCsvCell(c.Range),
      energizerOrderCode: normalizeCsvCell(c['Energizer Order Code']),
      hthCode: normalizeCsvCell(c['HTH Code']),
      code: normalizeCsvCell(c.Code),
      description: lineDescription,
      regChargeBackCost: reg,
      expoChargeBackCost: expo,
      save: discount,
      srpPromoRrp: normalizeCsvCell(c['SRP / Promo RRP']),
      gmDollar: normalizeCsvCell(c['$ GM']),
      gmPercent: normalizeCsvCell(c['% GM']),
      qtyType: normalizeCsvCell(c['Qty Type']),
      qty: normalizeCsvCell(c.Qty),
      regTotalCost: normalizeCsvCell(c['Reg Total Cost']),
      expoTotalCost: normalizeCsvCell(c['Expo Total Cost']),
      logo: carryLogo,
      productImage: carryProduct,
      hero: carryHero,
      category: normalizeCsvCell(c.Category),
      message: marketing,
      other: normalizeCsvCell(c.Other),
      offerType: normalizeCsvCell(c.Type),
    });
  }
  return out;
}

/** Internal insert rows for `offers` table (legacy or new CSV). */
async function loadOffersCsvInternalRows(filePath) {
  const raw = await readOffersCsvRaw(filePath);
  if (raw.length === 0) return [];
  const headers = Object.keys(raw[0]);
  const isRetailNameItem = headers.includes('Item') && !headers.includes('OFFER');
  if (isRetailNameItem) return mapNewRetailOffersCsv(raw);
  const isUnified =
    headers.includes('OFFER') &&
    (headers.includes('Logo') || headers.includes('Hero') ||
      headers.includes('Product Image') || headers.includes('ProductImage'));
  if (isUnified) return mapUnifiedOffersCsv(raw);
  return raw
    .map((clean) => mapLegacyOffersCsvRow(clean))
    .filter((r) => r.offer || r.offerGroup || r.description);
}

function internalOfferRowToApiRow(r) {
  return {
    OFFER: r.offer,
    'Offer Group': r.offerGroup,
    'Offer Tier': r.offerTier,
    'Drop Months': r.dropMonths,
    'Order Deadline': r.orderDeadline,
    'Min Order Value (ex GST)': r.minOrderValue,
    Brand: r.brand,
    Range: r.range,
    'Energizer Order Code': r.energizerOrderCode,
    'HTH Code': r.hthCode,
    Code: r.code,
    Description: r.description,
    'Reg Charge Back Cost': r.regChargeBackCost,
    'Expo Charge Back Cost': r.expoChargeBackCost,
    Save: r.save,
    'SRP / Promo RRP': r.srpPromoRrp,
    '$ GM': r.gmDollar,
    '% GM': r.gmPercent,
    'Qty Type': r.qtyType,
    Qty: r.qty,
    'Reg Total Cost': r.regTotalCost,
    'Expo Total Cost': r.expoTotalCost,
    Logo: r.logo || '',
    'Product Image': r.productImage || '',
    Hero: r.hero || '',
    Category: r.category || '',
    Message: r.message || '',
    Other: r.other || '',
    Type: r.offerType || '',
  };
}

function loadFallbackMcashStores() {
  if (fallbackMcashStores) return Promise.resolve(fallbackMcashStores);
  if (fallbackMcashStoresPromise) return fallbackMcashStoresPromise;

  const filePath = path.resolve(__dirname, 'mcash26.csv');
  if (!fs.existsSync(filePath)) {
    fallbackMcashStores = [];
    return Promise.resolve(fallbackMcashStores);
  }

  fallbackMcashStoresPromise = parseCSV(filePath, (clean) => {
    const name = (clean.Store || clean.store || '').trim();
    const suburb = (clean.Suburb || clean.suburb || '').trim();
    const state = (clean.State || clean.state || '').trim();
    if (!name || !suburb || !state) return null;
    return {
      id: `${state}-${suburb}-${name}`,
      name,
      address: (clean.Address || clean.address || '').trim(),
      suburb,
      state,
      pcode: (clean.Pcode || clean.pcode || '').trim(),
      banner: ((clean.Banner || clean.banner || '-').trim()) || '-',
    };
  })
    .then((rows) => {
      fallbackMcashStores = rows;
      fallbackMcashStoresPromise = null;
      console.log(`Loaded ${rows.length} fallback mcash stores.`);
      return rows;
    })
    .catch((err) => {
      fallbackMcashStoresPromise = null;
      console.error('Failed loading fallback mcash stores:', err.message);
      return [];
    });

  return fallbackMcashStoresPromise;
}

function loadFallbackOffersRows() {
  if (fallbackOffersRows) return Promise.resolve(fallbackOffersRows);
  if (fallbackOffersPromise) return fallbackOffersPromise;

  const filePath = path.resolve(__dirname, 'offers.csv');
  if (!fs.existsSync(filePath)) {
    fallbackOffersRows = [];
    return Promise.resolve(fallbackOffersRows);
  }

  fallbackOffersPromise = loadOffersCsvInternalRows(filePath)
    .then((insertRows) => {
      const rows = insertRows.map(internalOfferRowToApiRow);
      fallbackOffersRows = rows;
      fallbackOffersPromise = null;
      console.log(`Loaded ${rows.length} fallback offer rows.`);
      return rows;
    })
    .catch((err) => {
      fallbackOffersPromise = null;
      console.error('Failed loading fallback offers:', err.message);
      return [];
    });

  return fallbackOffersPromise;
}

// ---------------------------------------------------------------------------
// CSV loaders
// ---------------------------------------------------------------------------
async function loadStoresCSV() {
  const filePath = path.resolve(__dirname, 'ihg26stores.csv');
  if (!fs.existsSync(filePath)) { console.warn('ihg26stores.csv not found – skipping.'); return; }

  const results = await parseCSV(filePath, (clean) => {
    const store = padStoreNumber(clean.Store || clean.store);
    if (!store) return null;
    return {
      store,
      name:           (clean.Name || '').trim(),
      banner:         (clean.Banner || '-').trim(),
      overall:        (clean.Overall || '').trim(),
      automotive:     (clean.Automotive || '').trim(),
      energyStorage:  (clean['Energy Storage'] || '').trim(),
      lighting:       (clean.Lighting || '').trim(),
      specialOrderHw: (clean['Special Order Hardware'] || '').trim(),
    };
  });

  if (results.length === 0) return;

  // Single-query bulk INSERT via UNNEST — one round trip regardless of row count
  await pool.query('DELETE FROM stores');
  await pool.query(
    `INSERT INTO stores
       ("Store","Name","Banner","Overall","Automotive","Energy Storage","Lighting","Special Order Hardware")
     SELECT * FROM unnest(
       $1::text[], $2::text[], $3::text[], $4::text[],
       $5::text[], $6::text[], $7::text[], $8::text[]
     )
     ON CONFLICT ("Store") DO UPDATE SET
       "Name"                   = EXCLUDED."Name",
       "Banner"                 = EXCLUDED."Banner",
       "Overall"                = EXCLUDED."Overall",
       "Automotive"             = EXCLUDED."Automotive",
       "Energy Storage"         = EXCLUDED."Energy Storage",
       "Lighting"               = EXCLUDED."Lighting",
       "Special Order Hardware" = EXCLUDED."Special Order Hardware"`,
    [
      results.map(r => r.store),
      results.map(r => r.name),
      results.map(r => r.banner),
      results.map(r => r.overall),
      results.map(r => r.automotive),
      results.map(r => r.energyStorage),
      results.map(r => r.lighting),
      results.map(r => r.specialOrderHw),
    ]
  );
  console.log(`Loaded ${results.length} stores.`);
}

async function loadMcashStoresCSV() {
  const filePath = path.resolve(__dirname, 'mcash26.csv');
  if (!fs.existsSync(filePath)) { console.warn('mcash26.csv not found – skipping.'); return; }

  const results = await parseCSV(filePath, (clean) => {
    const name   = (clean.Store  || clean.store  || '').trim();
    const suburb = (clean.Suburb || clean.suburb || '').trim();
    const state  = (clean.State  || clean.state  || '').trim();
    if (!name || !suburb || !state) return null;
    return {
      name,
      address: (clean.Address || clean.address || '').trim(),
      suburb,
      state,
      pcode:   (clean.Pcode  || clean.pcode  || '').trim(),
      banner:  ((clean.Banner || clean.banner || '-').trim()) || '-',
    };
  });

  if (results.length === 0) return;

  await pool.query('DELETE FROM mcash_stores');
  await pool.query(
    `INSERT INTO mcash_stores (name, address, suburb, state, pcode, banner)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[])`,
    [
      results.map(r => r.name),
      results.map(r => r.address),
      results.map(r => r.suburb),
      results.map(r => r.state),
      results.map(r => r.pcode),
      results.map(r => r.banner),
    ]
  );
  console.log(`Loaded ${results.length} mcash stores.`);
}

async function loadOffersCSV() {
  const filePath = path.resolve(__dirname, 'offers.csv');
  if (!fs.existsSync(filePath)) { console.warn('offers.csv not found – skipping.'); return; }

  invalidateOffersFallbackCache();
  const results = await loadOffersCsvInternalRows(filePath);
  if (results.length === 0) return;

  await pool.query('DELETE FROM offers');
  await pool.query(
    `INSERT INTO offers
       ("OFFER","Offer Group","Offer Tier","Drop Months","Order Deadline",
        "Min Order Value (ex GST)","Brand","Range","Energizer Order Code",
        "HTH Code","Code","Description","Reg Charge Back Cost",
        "Expo Charge Back Cost","Save","SRP / Promo RRP","$ GM","% GM",
        "Qty Type","Qty","Reg Total Cost","Expo Total Cost",
        "Logo","Product Image","Hero","Category","Message","Other","Type")
     SELECT * FROM unnest(
       $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
       $7::text[], $8::text[], $9::text[], $10::text[], $11::text[], $12::text[],
       $13::text[], $14::text[], $15::text[], $16::text[], $17::text[], $18::text[],
       $19::text[], $20::text[], $21::text[], $22::text[], $23::text[], $24::text[],
       $25::text[], $26::text[], $27::text[], $28::text[], $29::text[]
     )`,
    [
      results.map((r) => r.offer),          results.map((r) => r.offerGroup),
      results.map((r) => r.offerTier),      results.map((r) => r.dropMonths),
      results.map((r) => r.orderDeadline),  results.map((r) => r.minOrderValue),
      results.map((r) => r.brand),          results.map((r) => r.range),
      results.map((r) => r.energizerOrderCode), results.map((r) => r.hthCode),
      results.map((r) => r.code),           results.map((r) => r.description),
      results.map((r) => r.regChargeBackCost),  results.map((r) => r.expoChargeBackCost),
      results.map((r) => r.save),           results.map((r) => r.srpPromoRrp),
      results.map((r) => r.gmDollar),       results.map((r) => r.gmPercent),
      results.map((r) => r.qtyType),        results.map((r) => r.qty),
      results.map((r) => r.regTotalCost),   results.map((r) => r.expoTotalCost),
      results.map((r) => r.logo || ''),    results.map((r) => r.productImage || ''),
      results.map((r) => r.hero || ''),    results.map((r) => r.category || ''),
      results.map((r) => r.message || ''), results.map((r) => r.other || ''),
      results.map((r) => r.offerType || ''),
    ]
  );
  console.log(`Loaded ${results.length} offer rows.`);
}

// ---------------------------------------------------------------------------
// API – stores
// ---------------------------------------------------------------------------
app.get('/api/store/:storeNumber', async (req, res) => {
  try {
    const paddedNumber = padStoreNumber(req.params.storeNumber);
    if (!paddedNumber || paddedNumber.length !== 6) {
      return res.status(400).json({ error: 'Invalid store number format' });
    }
    const { rows } = await pool.query(
      'SELECT * FROM stores WHERE "Store" = $1 LIMIT 1', [paddedNumber]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Store not found' });
    const row = rows[0];
    let address = '';
    let suburb = '';
    let state = '';
    let pcode = '';
    try {
      const { rows: mrows } = await pool.query(
        `SELECT address, suburb, state, pcode FROM mcash_stores
         WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
        [row.Name]
      );
      if (mrows.length > 0) {
        address = mrows[0].address || '';
        suburb = mrows[0].suburb || '';
        state = mrows[0].state || '';
        pcode = mrows[0].pcode || '';
      }
    } catch (_) { /* optional enrichment */ }
    res.json({
      storeNo:            row.Store,
      storeName:          row.Name,
      banner:             row.Banner              || '-',
      overall:            row.Overall             || '',
      automotive:         row.Automotive          || '',
      energyStorage:      row['Energy Storage']   || '',
      lighting:           row.Lighting            || '',
      specialOrderHardware: row['Special Order Hardware'] || '',
      address,
      suburb,
      state,
      pcode,
    });
  } catch (err) {
    console.error('GET /api/store error:', err.message);
    res.status(500).json({ error: 'Failed to fetch store data' });
  }
});

// Legacy alias – same logic, falls back to a default object when not found
app.get('/api/store-data/:storeNumber', async (req, res) => {
  try {
    const paddedNumber = padStoreNumber(req.params.storeNumber);
    if (!paddedNumber || paddedNumber.length !== 6) {
      return res.status(400).json({ error: 'Invalid store number format' });
    }
    const { rows } = await pool.query(
      'SELECT * FROM stores WHERE "Store" = $1 LIMIT 1', [paddedNumber]
    );
    if (rows.length === 0) {
      return res.json({
        storeNo: paddedNumber, storeName: `Store ${paddedNumber}`, banner: '-',
        overall: '', automotive: '', energyStorage: '', lighting: '', specialOrderHardware: '',
      });
    }
    const row = rows[0];
    res.json({
      storeNo:            row.Store,
      storeName:          row.Name,
      banner:             row.Banner              || '-',
      overall:            row.Overall             || '',
      automotive:         row.Automotive          || '',
      energyStorage:      row['Energy Storage']   || '',
      lighting:           row.Lighting            || '',
      specialOrderHardware: row['Special Order Hardware'] || '',
    });
  } catch (err) {
    console.error('GET /api/store-data error:', err.message);
    res.status(500).json({ error: 'Failed to fetch store data' });
  }
});

// ---------------------------------------------------------------------------
// API – Metcash store lookup (state → suburb → stores)
// ---------------------------------------------------------------------------
app.get('/api/states', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT state FROM mcash_stores
       WHERE state IS NOT NULL AND state <> '' ORDER BY state`
    );
    if (rows.length > 0) {
      return res.json(rows.map(r => r.state));
    }
    const fallbackRows = await loadFallbackMcashStores();
    const states = [...new Set(fallbackRows.map((r) => r.state))].sort();
    res.json(states);
  } catch (err) {
    const fallbackRows = await loadFallbackMcashStores();
    const states = [...new Set(fallbackRows.map((r) => r.state))].sort();
    res.json(states);
  }
});

app.get('/api/suburbs', async (req, res) => {
  try {
    const state = (req.query.state || '').trim();
    if (!state) return res.status(400).json({ error: 'state required' });
    const { rows } = await pool.query(
      `SELECT DISTINCT suburb FROM mcash_stores
       WHERE state = $1 AND suburb IS NOT NULL AND suburb <> '' ORDER BY suburb`,
      [state]
    );
    if (rows.length > 0) {
      return res.json(rows.map(r => r.suburb));
    }
    const fallbackRows = await loadFallbackMcashStores();
    const suburbs = [...new Set(
      fallbackRows.filter((r) => r.state === state).map((r) => r.suburb)
    )].sort();
    res.json(suburbs);
  } catch (err) {
    const state = (req.query.state || '').trim();
    if (!state) return res.status(400).json({ error: 'state required' });
    const fallbackRows = await loadFallbackMcashStores();
    const suburbs = [...new Set(
      fallbackRows.filter((r) => r.state === state).map((r) => r.suburb)
    )].sort();
    res.json(suburbs);
  }
});

app.get('/api/mcash-stores', async (req, res) => {
  try {
    const state  = (req.query.state  || '').trim();
    const suburb = (req.query.suburb || '').trim();
    if (!state || !suburb) return res.status(400).json({ error: 'state and suburb required' });
    const { rows } = await pool.query(
      `SELECT id, name, address, suburb, state, pcode, banner
       FROM mcash_stores WHERE state = $1 AND suburb = $2 ORDER BY name`,
      [state, suburb]
    );
    if (rows.length > 0) {
      return res.json(rows.map(r => ({
        id:      r.id,
        name:    r.name,
        address: r.address || '',
        suburb:  r.suburb,
        state:   r.state,
        pcode:   r.pcode  || '',
        banner:  r.banner || '-',
      })));
    }
    const fallbackRows = await loadFallbackMcashStores();
    const matches = fallbackRows.filter((r) => r.state === state && r.suburb === suburb);
    res.json(matches.map((r, idx) => ({
      id: idx + 1,
      name: r.name,
      address: r.address || '',
      suburb: r.suburb,
      state: r.state,
      pcode: r.pcode || '',
      banner: r.banner || '-',
    })));
  } catch (err) {
    const state  = (req.query.state  || '').trim();
    const suburb = (req.query.suburb || '').trim();
    if (!state || !suburb) return res.status(400).json({ error: 'state and suburb required' });
    const fallbackRows = await loadFallbackMcashStores();
    const matches = fallbackRows.filter((r) => r.state === state && r.suburb === suburb);
    res.json(matches.map((r, idx) => ({
      id: idx + 1,
      name: r.name,
      address: r.address || '',
      suburb: r.suburb,
      state: r.state,
      pcode: r.pcode || '',
      banner: r.banner || '-',
    })));
  }
});

// Warm fallback cache at startup so first request is fast
loadFallbackMcashStores().catch(() => {});
loadFallbackOffersRows().catch(() => {});

// ---------------------------------------------------------------------------
// API – offers
// ---------------------------------------------------------------------------
app.get('/api/offers', async (req, res) => {
  try {
    let rows = [];
    try {
      const dbResult = await pool.query(`
      SELECT "Offer Group","OFFER","Brand","Range","Min Order Value (ex GST)",
             "Save","Expo Total Cost","Offer Tier","Description","Qty","Expo Charge Back Cost",
             "Logo","Product Image","Hero","Category","Message","Other","Type"
      FROM offers
      ORDER BY "OFFER","Offer Tier"
    `);
      rows = dbResult.rows;
    } catch {
      rows = await loadFallbackOffersRows();
    }
    if (rows.length === 0) rows = await loadFallbackOffersRows();

    const grouped = applyOfferContent(groupOffersRows(rows));
    res.json(Object.values(grouped));
  } catch (err) {
    console.error('GET /api/offers error:', err.message);
    const rows = await loadFallbackOffersRows();
    const grouped = applyOfferContent(groupOffersRows(rows));
    res.json(Object.values(grouped));
  }
});

app.get('/api/offers/:offerId', async (req, res) => {
  try {
    const { offerId } = req.params;
    let rows = [];
    try {
      const dbResult = await pool.query(
        `SELECT * FROM offers
         WHERE "OFFER" = $1 OR "Offer Group" = $1
         ORDER BY "Offer Tier","Description"`,
        [offerId]
      );
      rows = dbResult.rows;
    } catch {
      const fallbackRows = await loadFallbackOffersRows();
      rows = fallbackRows.filter((row) => row.OFFER === offerId || row['Offer Group'] === offerId);
    }
    if (rows.length === 0) {
      const fallbackRows = await loadFallbackOffersRows();
      rows = fallbackRows.filter((row) => row.OFFER === offerId || row['Offer Group'] === offerId);
    }
    if (rows.length === 0) return res.status(404).json({ error: 'Offer not found' });

    const first = rows[0];
    const meta = buildOfferMetaFromRows(rows);

    // Apply offer-content.json (logo, hero, copy)
    const contentKey = normaliseOfferName(offerId);
    const content = offerContentMap[contentKey] || {};
    if (content.logo)  meta.logoUrl  = `/products/${content.logo}`;
    if (content.hero)  meta.heroUrl  = `/products/${content.hero}`;
    if (content.h1)    meta.h1       = content.h1;
    if (content.h2)    meta.h2       = content.h2;
    if (content.body)  meta.message  = content.body;

    // Enrich each row with computed deal fields
    const enrichRow = (row) => {
      const expoPrice = parseFloat(row['Expo Total Cost']) || 0;
      const normCost  = parseFloat(row['Reg Total Cost'])  || 0;
      const rrp       = parseFloat(row['SRP / Promo RRP']) || 0;
      const units     = parseFloat(row.Qty) || 1;
      return {
        ...row,
        metcashCode: row['HTH Code'] || row.Code || '',
        qty:         row.Qty || '',
        rrp:         row['SRP / Promo RRP'] || '',
        expoPrice:   row['Expo Total Cost'] || '',
        normalCost:  row['Reg Total Cost'] || '',
        discount:    normCost > 0 ? ((normCost - expoPrice) / normCost * 100).toFixed(1) + '%' : (row.Save || ''),
        margin:      rrp > 0 ? ((rrp - expoPrice / units) / rrp * 100).toFixed(1) + '%' : '',
      };
    };

    const expoChargeBackCost = rows.reduce((s, r) => s + (parseFloat(r['Expo Total Cost']) || 0), 0).toFixed(2);

    const hasTiers = first['Offer Tier'] &&
      !['Range Offer', 'Display Pre-Pack', 'Display Component'].includes(first['Offer Tier']);

    if (hasTiers) {
      const tiers = {};
      rows.forEach(row => {
        const t = row['Offer Tier'];
        if (!tiers[t]) tiers[t] = [];
        tiers[t].push(enrichRow(row));
      });
      return res.json({
        offerId, offerGroup: first['Offer Group'], brand: first.Brand, range: first.Range,
        hasTiers: true, tiers, allItems: rows.map(enrichRow), expoChargeBackCost,
        ...meta,
      });
    }
    res.json({
      offerId, offerGroup: first['Offer Group'], brand: first.Brand, range: first.Range,
      hasTiers: false, items: rows.map(enrichRow), expoChargeBackCost,
      ...meta,
    });
  } catch (err) {
    console.error('GET /api/offers/:id error:', err.message);
    const { offerId } = req.params;
    const fallbackRows = await loadFallbackOffersRows();
    const rows = fallbackRows.filter((row) => row.OFFER === offerId || row['Offer Group'] === offerId);
    if (rows.length === 0) return res.status(404).json({ error: 'Offer not found' });
    const first = rows[0];
    const meta = buildOfferMetaFromRows(rows);
    const hasTiers = first['Offer Tier'] &&
      !['Range Offer', 'Display Pre-Pack', 'Display Component'].includes(first['Offer Tier']);
    if (hasTiers) {
      const tiers = {};
      rows.forEach((row) => {
        const t = row['Offer Tier'];
        if (!tiers[t]) tiers[t] = [];
        tiers[t].push(row);
      });
      return res.json({
        offerId, offerGroup: first['Offer Group'], brand: first.Brand, range: first.Range,
        hasTiers: true, tiers, allItems: rows,
        ...meta,
      });
    }
    res.json({
      offerId, offerGroup: first['Offer Group'], brand: first.Brand, range: first.Range,
      hasTiers: false, items: rows,
      ...meta,
    });
  }
});

app.post('/api/reload-offers', async (req, res) => {
  try {
    await loadOffersCSV();
    res.json({ success: true, message: 'Offers reloaded.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// API – orders
// ---------------------------------------------------------------------------
app.post('/api/save-order', async (req, res) => {
  const client = await pool.connect();
  try {
    const { storeNumber='', storeName='', banner='', userName='',
            position='', purchaseOrder='', email='', storeCode='', repEmail='', items=[], totalValue=0 } = req.body;

    await client.query('BEGIN');

    const { rows: [{ id: orderId }] } = await client.query(
      `INSERT INTO orders (store_number,store_name,banner,user_name,position,purchase_order,email,store_code,rep_email,total_value)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [storeNumber, storeName, banner, userName, position, purchaseOrder, email, storeCode, repEmail, parseFloat(totalValue) || 0]
    );

    for (const item of items) {
      const qty = item.quantity || 1;
      const dropMonths = Array.isArray(item.dropMonths)
        ? item.dropMonths
        : Array(qty).fill(item.dropMonth || 'March');

      for (let i = 0; i < qty; i++) {
        await client.query(
          `INSERT INTO order_items (order_id,offer_id,offer_tier,quantity,description,cost,drop_month)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [orderId, item.offerId||'', item.offerTier||'', 1,
           item.description||'', parseFloat(item.cost)||0, dropMonths[i]||'March']
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, orderId, message: 'Order saved.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/save-order error:', err.message);
    res.status(500).json({ error: 'Failed to save order' });
  } finally {
    client.release();
  }
});

app.get('/api/orders-stats', async (req, res) => {
  try {
    const { rows: [row] } = await pool.query(
      'SELECT COUNT(*) AS count, COALESCE(SUM(total_value),0) AS total FROM orders'
    );
    res.json({
      count:      parseInt(row.count,   10),
      totalValue: parseFloat(row.total).toFixed(2),
    });
  } catch (err) {
    res.status(500).json({ count: 0, totalValue: '0.00' });
  }
});

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
app.get('/api/dashboard', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        o.id,
        o.created_at,
        o.store_name,
        o.banner,
        o.user_name,
        o.email       AS store_email,
        o.rep_email,
        o.total_value::numeric::float8 AS total_value
      FROM orders o
      ORDER BY o.total_value DESC, o.created_at DESC
    `);
    const grand = rows.reduce((s, r) => s + (r.total_value || 0), 0);
    res.json({ orders: rows, grandTotal: parseFloat(grand.toFixed(2)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/charts', async (req, res) => {
  try {
    const [offersRes, statesRes, repsRes] = await Promise.all([
      pool.query(`
        SELECT oi.offer_id AS label, SUM(oi.quantity)::int AS value
        FROM order_items oi
        GROUP BY oi.offer_id
        ORDER BY value DESC
        LIMIT 12
      `),
      pool.query(`
        SELECT COALESCE(ms.state, 'Unknown') AS label,
               SUM(o.total_value)::numeric::float8 AS value
        FROM orders o
        LEFT JOIN mcash_stores ms ON LOWER(ms.name) = LOWER(o.store_name)
        GROUP BY ms.state
        ORDER BY value DESC
      `),
      pool.query(`
        SELECT COALESCE(NULLIF(o.rep_email,''), 'Unknown') AS label,
               SUM(o.total_value)::numeric::float8 AS value
        FROM orders o
        GROUP BY o.rep_email
        ORDER BY value DESC
      `),
    ]);
    res.json({
      offerQty:  offersRes.rows,
      stateSales: statesRes.rows,
      repSales:   repsRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/csv', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        o.id                                                              AS order_id,
        'Confirmed'                                                       AS order_status,
        ms.state                                                          AS state,
        o.store_code                                                      AS customer_number,
        o.store_name                                                      AS customer_name,
        o.email                                                           AS customer_email,
        o.email                                                           AS order_placed_by,
        30152                                                             AS vendor_number,
        'ENERGIZER AUSTRALIA'                                             AS vendor_name,
        CASE
          WHEN oi.drop_month IS NOT NULL AND oi.drop_month != ''
          THEN '01/' || LPAD(EXTRACT(MONTH FROM TO_DATE(oi.drop_month, 'Month'))::TEXT, 2, '0') || '/2026'
          ELSE ''
        END                                                               AS drop_date_into_store,
        of."HTH Code"                                                     AS item_number,
        of."Description"                                                  AS item_desc,
        of."Range"                                                        AS sub_range_number,
        ''                                                                AS commodity_number,
        of."Range"                                                        AS commodity_name,
        'Claim'                                                           AS order_type,
        'SingleDeal'                                                      AS deal_type,
        of."Offer Group"                                                  AS parcel_name,
        of."Qty"                                                          AS ctns_ordered,
        of."Expo Total Cost"                                              AS deal_value_per_ctn,
        of."SRP / Promo RRP"                                              AS gross_ctn_value,
        CASE
          WHEN of."SRP / Promo RRP" ~ '^[0-9.]+$' AND of."Expo Total Cost" ~ '^[0-9.]+$'
          THEN (of."SRP / Promo RRP"::numeric - of."Expo Total Cost"::numeric)::TEXT
          ELSE ''
        END                                                               AS net_ctn_value,
        CASE
          WHEN of."Expo Total Cost" ~ '^[0-9.]+$' AND of."Qty" ~ '^[0-9.]+$'
          THEN (of."Expo Total Cost"::numeric * of."Qty"::numeric)::TEXT
          ELSE ''
        END                                                               AS extended_deal_value,
        CASE
          WHEN of."SRP / Promo RRP" ~ '^[0-9.]+$' AND of."Qty" ~ '^[0-9.]+$'
          THEN (of."SRP / Promo RRP"::numeric * of."Qty"::numeric)::TEXT
          ELSE ''
        END                                                               AS extended_gross_order_value,
        CASE
          WHEN of."SRP / Promo RRP" ~ '^[0-9.]+$' AND of."Expo Total Cost" ~ '^[0-9.]+$' AND of."Qty" ~ '^[0-9.]+$'
          THEN ((of."SRP / Promo RRP"::numeric - of."Expo Total Cost"::numeric) * of."Qty"::numeric)::TEXT
          ELSE ''
        END                                                               AS extended_net_order_value
      FROM orders o
      LEFT JOIN order_items oi    ON oi.order_id = o.id
      LEFT JOIN offers of         ON of."OFFER" = oi.offer_id
      LEFT JOIN mcash_stores ms   ON LOWER(ms.name) = LOWER(o.store_name)
      WHERE oi.offer_id IS NOT NULL
      ORDER BY o.total_value DESC, o.id, oi.id, of."HTH Code"
    `);

    const headers = [
      'Order Number','Order Status','State','Customer Number','Customer Name',
      'Customer Email','Order Placed By','Vendor Number','Vendor Name',
      'Drop Date Into Store','Item Number','Item Desc','Sub Range Number',
      'Commodity Number','Commodity Name','Order Type','Deal Type','Parcel Name',
      'Ctns Ordered (qty)','Deal Value Per Ctn $','Gross Ctn Value $',
      'Net Ctn Value $','Extended Deal Value $','Extended Gross Order Value $',
      'Extended Net Order Value $'
    ];

    const keys = [
      'order_id','order_status','state','customer_number','customer_name',
      'customer_email','order_placed_by','vendor_number','vendor_name',
      'drop_date_into_store','item_number','item_desc','sub_range_number',
      'commodity_number','commodity_name','order_type','deal_type','parcel_name',
      'ctns_ordered','deal_value_per_ctn','gross_ctn_value',
      'net_ctn_value','extended_deal_value','extended_gross_order_value',
      'extended_net_order_value'
    ];

    if (!rows.length) return res.status(200).send(headers.join(','));

    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      headers.join(','),
      ...rows.map(r => keys.map(k => escape(r[k])).join(','))
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="metcash-orders-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Serve React build (single-service deployment)
// ---------------------------------------------------------------------------
const possibleBuilds = [
  path.join(__dirname, '..', 'frontend', 'build'),
  path.join(__dirname, '..', 'client',   'build'),
];
const buildPath = possibleBuilds.find(p => fs.existsSync(p));
if (buildPath) {
  console.log('Serving React build from:', buildPath);
  app.use(express.static(buildPath));
  app.use((req, res) => res.sendFile(path.join(buildPath, 'index.html')));
} else {
  app.get('/', (req, res) => res.status(200).send('<h1>metcash26-api running</h1><p>React build not found — run <code>npm run build</code> inside /frontend.</p>'));
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
let dbReady = false;

async function initDbWithRetry() {
  try {
    await initDb();
    dbReady = true;
    console.log('Database connection ready.');
    // Load reference data in the background once DB is reachable.
    loadStoresCSV()
      .then(() => loadMcashStoresCSV())
      .then(() => loadOffersCSV())
      .then(() => console.log('All CSV data loaded.'))
      .catch(err => console.error('CSV load failed:', err.message));
  } catch (err) {
    dbReady = false;
    console.error('Database init failed, retrying in 10s:', err.message || err);
    setTimeout(initDbWithRetry, 10000);
  }
}

app.listen(PORT, () => {
  console.log(`Metcash API → http://localhost:${PORT}`);
  initDbWithRetry();
});

process.on('SIGINT', async () => {
  await pool.end();
  console.log('Pool closed.');
  process.exit(0);
});
