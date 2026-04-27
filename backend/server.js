'use strict';
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const csv     = require('csv-parser');
const fs      = require('fs');
const path    = require('path');
const { Readable } = require('stream');
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

/** Basename only for /products/ — rejects paths, URLs, and traversal. */
function safeEditorialImageFilename(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return null;
  const norm = s.replace(/\\/g, '/');
  if (norm.includes('..')) return null;
  const base = path.basename(norm);
  if (!base || base === '.' || base === '..') return null;
  return base;
}

function loadOfferContentFromDisk() {
  offerContentMap = {};
  try {
    const raw = JSON.parse(fs.readFileSync(OFFER_CONTENT_PATH, 'utf8'));
    if (!Array.isArray(raw)) return;
    raw.forEach(item => {
      offerContentMap[normaliseOfferName(item.offer)] = item;
    });
    console.log(`Loaded ${raw.length} offer-content entries.`);
  } catch (e) {
    console.warn('offer-content.json not found or invalid:', e.message);
  }
}

loadOfferContentFromDisk();

// ---------------------------------------------------------------------------
// POS (point-of-sale) supporting copy — backend/pos.csv, keyed by OFFER
// ---------------------------------------------------------------------------
const POS_CSV_PATH = path.join(serverDir, 'pos.csv');
/** @type {Record<string, { description: string, callouts: string[] }>} */
let posByOfferKey = {};

/** Split Callout cell on | for multiple bullets. */
function splitPosCalloutCell(s) {
  if (!s || typeof s !== 'string') return [];
  return s.split(/\|/).map((x) => x.trim()).filter(Boolean);
}

async function loadPosCsvFromDisk() {
  posByOfferKey = {};
  if (!fs.existsSync(POS_CSV_PATH)) {
    console.warn('pos.csv not found — POS fields will be empty.');
    return;
  }
  try {
    const rows = await parseCSV(POS_CSV_PATH, (clean) => {
      const offer = normalizeCsvCell(clean.OFFER || clean.offer || '');
      if (!offer) return null;
      const description = normalizeCsvCell(clean.Description || clean.description || '');
      const calloutCell = normalizeCsvCell(clean.Callout || clean.callout || '');
      const callouts = splitPosCalloutCell(calloutCell);
      return { offer, description, callouts };
    });
    rows.forEach((r) => {
      posByOfferKey[normaliseOfferName(r.offer)] = {
        description: r.description,
        callouts: r.callouts,
      };
    });
    console.log(`Loaded ${rows.length} POS row(s) from pos.csv.`);
  } catch (e) {
    console.warn('pos.csv load failed:', e.message);
  }
}

function mergePosIntoTarget(target, offerId) {
  const row = posByOfferKey[normaliseOfferName(offerId)];
  if (!row) return;
  const description = row.description || '';
  const callouts = Array.isArray(row.callouts) ? row.callouts : [];
  if (!description && callouts.length === 0) return;
  target.pos = { description, callouts };
}

function applyPosContent(grouped) {
  Object.keys(grouped).forEach((key) => {
    mergePosIntoTarget(grouped[key], key);
  });
  return grouped;
}

/**
 * Merge one offer-content.json entry onto a payload object (list row or GET /offers/:id meta).
 * Filenames are relative to frontend/public/products/.
 */
function mergeEditorialFromContent(target, content) {
  if (!content || typeof content !== 'object') return target;
  const logoFile = safeEditorialImageFilename(content.logo);
  const heroFile = safeEditorialImageFilename(content.hero);
  const productFile = safeEditorialImageFilename(content.productImage);
  const promoFile = safeEditorialImageFilename(content.promoImage);
  target.logo = logoFile;
  target.hero = heroFile;
  target.productImage = productFile;
  target.promoImage = promoFile;
  if (logoFile) target.logoUrl = `/products/${logoFile}`;
  if (heroFile) target.heroUrl = `/products/${heroFile}`;
  if (productFile) target.productImageUrl = `/products/${productFile}`;
  if (promoFile) target.promoImageUrl = `/products/${promoFile}`;
  if (content.showPromos !== undefined) target.showPromos = !!content.showPromos;
  if (content.h1 !== undefined) target.h1 = content.h1;
  if (content.h2 !== undefined) target.h2 = content.h2;
  if (content.body !== undefined) {
    target.body = content.body;
    target.message = content.body;
  }
  if (content.other !== undefined) target.other = content.other;
  if (content.modalTitle !== undefined) target.modalTitle = content.modalTitle;
  if (Array.isArray(content.callouts)) {
    target.callouts = content.callouts.filter((x) => typeof x === 'string' && x.trim());
  }
  return target;
}

function mergeEditorialIntoMetaByOfferId(meta, offerId) {
  const content = offerContentMap[normaliseOfferName(offerId)];
  if (!content || typeof content !== 'object') return meta;
  meta.logoUrl = '';
  meta.heroUrl = '';
  meta.productImageUrl = '';
  meta.logo = null;
  meta.hero = null;
  meta.productImage = null;
  return mergeEditorialFromContent(meta, content);
}

function applyOfferContent(grouped) {
  Object.keys(grouped).forEach((key) => {
    const match = offerContentMap[normaliseOfferName(key)];
    if (!match) return;
    const g = grouped[key];
    g.logoUrl = '';
    g.heroUrl = '';
    g.productImageUrl = '';
    g.logo = null;
    g.hero = null;
    g.productImage = null;
    mergeEditorialFromContent(g, match);
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
  await pool.query(`DROP TABLE IF EXISTS stores`);

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
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Offer Code" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Offer Name" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "SKU" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "BaseQty" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "CartonQty" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Total Unit Cost" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Offer Mode" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Min Bundle Qty" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Allow Line Increase" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Selection Rule" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Min Selections" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Max Selections" TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS "Sort Order" TEXT;
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
    CREATE TABLE IF NOT EXISTS spin_win_events (
      id              SERIAL PRIMARY KEY,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      session_kind    TEXT NOT NULL,
      rep_email       TEXT,
      user_name       TEXT,
      store_name      TEXT,
      mso_group       TEXT,
      mso_store_count INTEGER,
      store_id        TEXT,
      prize_id        TEXT NOT NULL,
      sku             TEXT NOT NULL,
      prize_name      TEXT NOT NULL,
      prize_brand     TEXT NOT NULL
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
  await pool.query(`ALTER TABLE mcash_stores ADD COLUMN IF NOT EXISTS store_id TEXT`);
  await pool.query(`ALTER TABLE mcash_stores ADD COLUMN IF NOT EXISTS store_rank INTEGER`);
  await pool.query(`ALTER TABLE mcash_stores ADD COLUMN IF NOT EXISTS owner_group TEXT`);

  console.log('DB schema ready.');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function padStoreNumber(storeNumber) {
  if (!storeNumber) return null;
  return storeNumber.toString().trim().padStart(6, '0');
}

/** Match Metcash Location ID / store id digits (replaces legacy IHG `stores` lookup by 6-digit no.). */
function numericStoreIdsMatch(storeIdFromRow, paddedSixDigit) {
  const a = parseInt(String(storeIdFromRow ?? '').replace(/\D/g, ''), 10);
  const b = parseInt(String(paddedSixDigit ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(a) && Number.isFinite(b) && a === b;
}

/**
 * Resolve a padded 6-digit store number to a mcash_stores row (DB, else mcash26.csv fallback).
 */
async function findMcashStoreByPaddedStoreNo(paddedNumber) {
  if (!paddedNumber || paddedNumber.length !== 6) return null;
  const n = parseInt(paddedNumber, 10);
  if (!Number.isFinite(n)) return null;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM mcash_stores
       WHERE NULLIF(regexp_replace(COALESCE(store_id::text, ''), '[^0-9]', '', 'g'), '') IS NOT NULL
         AND (NULLIF(regexp_replace(COALESCE(store_id::text, ''), '[^0-9]', '', 'g'), ''))::bigint = $1::bigint
       LIMIT 1`,
      [n]
    );
    if (rows.length > 0) return rows[0];
  } catch (e) {
    console.error('findMcashStoreByPaddedStoreNo (db):', e.message || e);
  }
  const fallbackRows = await loadFallbackMcashStores();
  const hit = fallbackRows.find((r) => numericStoreIdsMatch(r.storeId, paddedNumber));
  return hit || null;
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

/** Read CSV and run each cleaned row through `transform`.
 *  Strips UTF-8 BOM so the first header column parses correctly.
 *  Rows where transform returns null/undefined are skipped. */
function parseCSV(filePath, transform) {
  return new Promise((resolve, reject) => {
    const results = [];
    let raw = fs.readFileSync(filePath, 'utf8');
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    Readable.from([raw])
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

/** In-memory rows from sales25.csv — columns c0..c24 via mapHeaders; item labels from header row. */
let sales25Rows = [];
let sales25ItemNames = [];
/** Single flight — API handlers await this so data exists before responding. */
let sales25CsvLoadPromise = null;
/** In-memory rows from suggest.csv — store-level suggested sell quantities by category. */
let suggestRows = [];
let suggestItemNames = [];
let suggestCsvLoadPromise = null;
/** Offer-id schema columns from suggest.csv: <offer>_sales / <offer>_suggest */
let suggestOfferColumns = {};

function canonicalOfferIdKey(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9_]/g, '');
}

function normalizeSales25StoreId(s) {
  return String(s ?? '')
    .replace(/\D/g, '')
    .trim();
}

/** Aligns with frontend `canonicalSalesCategoryKey` / SALES25_OFFERS_MAP.md */
function normalizeSalesCategoryKey(s) {
  return String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/[^\p{L}\p{N}\s'/\-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .replace(/pre[-\s]?pack/gi, 'prepack')
    .trim();
}

function canonicalSalesCategoryKey(s) {
  let x = normalizeSalesCategoryKey(s);
  const suffixes = [/\s+stock\s+deal$/i, /\s+loose\s+stock$/i, /\s+loose\s+stock\s+deal$/i];
  let prev = '';
  while (prev !== x) {
    prev = x;
    for (let i = 0; i < suffixes.length; i++) {
      x = x.replace(suffixes[i], '').trim();
    }
  }
  return x;
}

/** Map offer line → sales25 column index 0..9, or -1 */
function sales25CategoryIndexForOffer(offerGroup, offerId, headerNames) {
  const names = [];
  for (let i = 0; i < 10; i++) {
    names.push(String(headerNames[5 + i] || '').trim());
  }
  const rawCandidates = [offerGroup, offerId].filter((s) => String(s || '').trim());
  const seen = new Set();
  const candidates = [];
  for (const s of rawCandidates) {
    if (!seen.has(s)) {
      seen.add(s);
      candidates.push(s);
    }
  }
  for (const raw of candidates) {
    const g = canonicalSalesCategoryKey(String(raw));
    for (let i = 0; i < 10; i++) {
      if (canonicalSalesCategoryKey(names[i]) === g) return i;
    }
  }
  for (const raw of candidates) {
    const g = canonicalSalesCategoryKey(String(raw));
    const subs = [];
    for (let i = 0; i < 10; i++) {
      const n = canonicalSalesCategoryKey(names[i]);
      if (n === g) subs.push(i);
      else if (n.includes(g) || g.includes(n)) subs.push(i);
    }
    if (subs.length === 1) return subs[0];
    if (subs.length > 1) {
      subs.sort(
        (a, b) => canonicalSalesCategoryKey(names[b]).length - canonicalSalesCategoryKey(names[a]).length,
      );
      return subs[0];
    }
  }
  return -1;
}

function aggregateSales25CategoryTotals() {
  const qty = Array(10).fill(0);
  const value = Array(10).fill(0);
  for (const row of sales25Rows) {
    for (let i = 0; i < 10; i++) {
      value[i] += parseFloat(String(row[`c${5 + i}`] ?? '').replace(/,/g, '')) || 0;
      qty[i] += parseFloat(String(row[`c${15 + i}`] ?? '').replace(/,/g, '')) || 0;
    }
  }
  return {
    qty: qty.map((q) => Math.round(q * 1000) / 1000),
    value: value.map((v) => Math.round(v * 100) / 100),
  };
}

function resolveSales25CsvPath() {
  const candidates = [
    path.join(__dirname, 'sales25.csv'),
    path.join(process.cwd(), 'backend', 'sales25.csv'),
    path.join(process.cwd(), 'sales25.csv'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function loadSales25Csv() {
  if (sales25CsvLoadPromise) return sales25CsvLoadPromise;
  sales25CsvLoadPromise = new Promise((resolve, reject) => {
    const filePath = resolveSales25CsvPath();
    if (!filePath) {
      console.warn('sales25.csv not found — tried:', [
        path.join(__dirname, 'sales25.csv'),
        path.join(process.cwd(), 'backend', 'sales25.csv'),
        path.join(process.cwd(), 'sales25.csv'),
      ].join(' | '));
      sales25Rows = [];
      sales25ItemNames = [];
      return resolve();
    }
    let raw = fs.readFileSync(filePath, 'utf8');
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const headerNames = [];
    const rows = [];
    Readable.from([raw])
      .pipe(
        csv({
          mapHeaders: ({ header, index }) => {
            headerNames[index] = removeBOM(String(header || '').trim());
            return `c${index}`;
          },
        })
      )
      .on('data', (row) => rows.push(row))
      .on('end', () => {
        sales25Rows = rows;
        // Dense header array (csv-parse can leave sparse slots; .length would be wrong)
        let maxCol = -1;
        for (let i = 0; i < headerNames.length; i++) {
          if (headerNames[i] !== undefined && headerNames[i] !== '') maxCol = i;
        }
        if (rows.length > 0) {
          for (const k of Object.keys(rows[0])) {
            if (k.startsWith('c')) {
              const n = parseInt(k.slice(1), 10);
              if (!Number.isNaN(n)) maxCol = Math.max(maxCol, n);
            }
          }
        }
        const dense = [];
        for (let i = 0; i <= maxCol; i++) dense[i] = headerNames[i] ?? '';
        sales25ItemNames = dense;
        console.log(`Loaded ${rows.length} sales25.csv rows from ${filePath} (${dense.length} columns).`);
        resolve();
      })
      .on('error', (err) => {
        console.error('sales25.csv parse error:', err.message);
        sales25Rows = [];
        sales25ItemNames = [];
        resolve();
      });
  });
  return sales25CsvLoadPromise;
}

function resolveSuggestCsvPath() {
  const candidates = [
    path.join(__dirname, 'suggest.csv'),
    path.join(process.cwd(), 'backend', 'suggest.csv'),
    path.join(process.cwd(), 'suggest.csv'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function loadSuggestCsv() {
  if (suggestCsvLoadPromise) return suggestCsvLoadPromise;
  suggestCsvLoadPromise = new Promise((resolve) => {
    const filePath = resolveSuggestCsvPath();
    if (!filePath) {
      console.warn('suggest.csv not found — suggested sell badges disabled.');
      suggestRows = [];
      suggestItemNames = [];
      suggestOfferColumns = {};
      return resolve();
    }
    let raw = fs.readFileSync(filePath, 'utf8');
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const headerNames = [];
    const rows = [];
    Readable.from([raw])
      .pipe(
        csv({
          mapHeaders: ({ header, index }) => {
            headerNames[index] = removeBOM(String(header || '').trim());
            return `c${index}`;
          },
        }),
      )
      .on('data', (row) => rows.push(row))
      .on('end', () => {
        suggestRows = rows;
        suggestItemNames = Array.from({ length: 10 }, (_, i) =>
          String(headerNames[3 + i] || `Item ${i + 1}`).trim() || `Item ${i + 1}`,
        );
        suggestOfferColumns = {};
        for (let i = 0; i < headerNames.length; i++) {
          const raw = String(headerNames[i] || '').trim();
          if (!raw) continue;
          const m = raw.match(/^(.+?)[_\s]+(sales|suggest)$/i);
          if (!m) continue;
          const offerKey = canonicalOfferIdKey(m[1]);
          if (!offerKey) continue;
          const kind = m[2].toLowerCase();
          if (!suggestOfferColumns[offerKey]) suggestOfferColumns[offerKey] = {};
          if (kind === 'sales') suggestOfferColumns[offerKey].salesCol = i;
          if (kind === 'suggest') suggestOfferColumns[offerKey].suggestCol = i;
        }
        console.log(`Loaded ${rows.length} suggest.csv rows from ${filePath}.`);
        resolve();
      })
      .on('error', (err) => {
        console.error('suggest.csv parse error:', err.message);
        suggestRows = [];
        suggestItemNames = [];
        suggestOfferColumns = {};
        resolve();
      });
  });
  return suggestCsvLoadPromise;
}

function invalidateOffersFallbackCache() {
  fallbackOffersRows = null;
  fallbackOffersPromise = null;
}

/** mcash26.csv sometimes mixes Vic/VIC and Qld/QLD in the State column; canonicalise so one state → one button. (sales25.csv is not used for state.) */
function canonicalAustralianStateCode(raw) {
  const t = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const key = t.toLowerCase();
  const map = {
    nsw: 'NSW', vic: 'VIC', qld: 'QLD', sa: 'SA', wa: 'WA', tas: 'TAS', nt: 'NT', act: 'ACT',
  };
  if (map[key]) return map[key];
  const up = t.toUpperCase();
  if (['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].includes(up)) return up;
  return t;
}

/** Single row from mcash26.csv (cleanKeys already applied). */
function parseMcashRowFromClean(clean) {
  const name = (
    clean.StoreName ||
    clean.Store ||
    clean.store ||
    clean.Name ||
    ''
  ).trim();
  const suburb = (clean.Suburb || clean.suburb || 'Other').trim();
  let state = canonicalAustralianStateCode((clean.State || clean.state || '').trim());
  if (!name || !state) return null;
  /** Metcash numeric store id: prefer Location ID (matches sales25.csv Storeid), then legacy Storeid columns. */
  const fromLocation = String(
    clean['Location ID'] ?? clean.LocationID ?? clean['LocationID'] ?? ''
  )
    .replace(/\D/g, '')
    .trim();
  const fromLegacy = String(
    clean.Storeid ??
      clean.StoreId ??
      clean.storeid ??
      clean['Store id'] ??
      ''
  )
    .replace(/\D/g, '')
    .trim();
  let storeId = fromLocation || fromLegacy || '';
  if (!storeId) {
    const storeIdCol = clean['Store  ID'] ?? clean['Store ID'] ?? '';
    const digits = String(storeIdCol).replace(/\D/g, '').trim();
    if (digits.length >= 4) storeId = digits;
  }
  const postcodeRaw =
    clean.Postcode ?? clean.postcode ?? clean.Pcode ?? clean.pcode ?? '';
  const pcode = String(postcodeRaw).trim();
  const rankRaw = clean.RANK ?? clean.Rank ?? clean.rank ?? '';
  let storeRank = null;
  if (rankRaw !== '' && rankRaw != null && String(rankRaw).trim() !== '') {
    const n = parseInt(String(rankRaw).replace(/\D/g, ''), 10);
    if (Number.isFinite(n)) storeRank = n;
  }
  const g = (clean.Group ?? clean.group ?? '').toString().trim();
  const ownerGroup = g === '-' || g === '' ? '' : g;
  return {
    name,
    storeId,
    address: (clean.Address || clean.address || '').trim(),
    suburb,
    state,
    pcode,
    banner: ((clean.Banner || clean.banner || '-').trim()) || '-',
    storeRank,
    ownerGroup,
  };
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
      offerCode: '',
      offerName: '',
      sku: '',
      baseQty: '',
      cartonQty: '',
      totalUnitCost: '',
      offerMode: '',
      minBundleQty: '',
      allowLineIncrease: '',
      selectionRule: '',
      minSelections: '',
      maxSelections: '',
      sortOrder: '',
    });
  }
  return out;
}

/** New CSV structure with Offer Mode rules (FIXED / SPLIT / MIXED). */
function mapFixedSplitOffersCsv(rawRows) {
  const out = [];
  for (const c of rawRows) {
    const offer = normalizeCsvCell(c.OFFER);
    if (!offer) continue;
    const baseQty = normalizeIntNumber(c.BaseQty, 0);
    const cartonQty = normalizeIntNumber(c.CartonQty, 0);
    const minBundleQty = normalizeIntNumber(c['Min Bundle Qty'], 1);
    const minSelections = normalizeIntNumber(c['Min Selections'], 0);
    const maxSelections = normalizeIntNumber(c['Max Selections'], 0);
    const sortOrder = normalizeIntNumber(c['Sort Order'], 0);
    const rrp = normalizeMoneyNumber(c.RRP);
    const totalUnitCost = normalizeMoneyNumber(c['Total Unit Cost']);
    const expoTotalCost = normalizeMoneyNumber(c['Expo Total Cost']);
    const allowLineIncrease = normalizeYesNoBool(c['Allow Line Increase']);

    out.push({
      offer,
      offerGroup: normalizeCsvCell(c['Offer Group']) || offer,
      offerTier: '',
      dropMonths: '',
      orderDeadline: '',
      minOrderValue: '',
      brand: normalizeCsvCell(c.Brand),
      range: '',
      energizerOrderCode: '',
      hthCode: '',
      code: normalizeCsvCell(c['Offer Code']),
      description: normalizeCsvCell(c.Description),
      regChargeBackCost: totalUnitCost > 0 ? String(totalUnitCost) : '',
      expoChargeBackCost: baseQty > 0 ? String(expoTotalCost / baseQty) : String(expoTotalCost),
      save: '',
      srpPromoRrp: rrp > 0 ? String(rrp) : '',
      gmDollar: '',
      gmPercent: '',
      qtyType: '',
      qty: baseQty > 0 ? String(baseQty) : '',
      regTotalCost: totalUnitCost > 0 ? String(totalUnitCost) : '',
      expoTotalCost: expoTotalCost > 0 ? String(expoTotalCost) : '',
      logo: '',
      productImage: '',
      hero: '',
      category: '',
      message: '',
      other: '',
      offerType: '',
      offerCode: normalizeCsvCell(c['Offer Code']),
      offerName: normalizeCsvCell(c['Offer Name']),
      sku: normalizeCsvCell(c.SKU),
      baseQty: String(baseQty),
      cartonQty: String(cartonQty),
      totalUnitCost: totalUnitCost > 0 ? String(totalUnitCost) : '',
      offerMode: normalizeCsvCell(c['Offer Mode']).toUpperCase(),
      minBundleQty: String(minBundleQty),
      allowLineIncrease: allowLineIncrease ? 'true' : 'false',
      selectionRule: normalizeCsvCell(c['Selection Rule']),
      minSelections: String(minSelections),
      maxSelections: String(maxSelections),
      sortOrder: String(sortOrder),
    });
  }
  return out;
}

/** Blank or "-" → empty string (never null; safe for DB text columns). */
function normalizeCsvCell(v) {
  const t = String(v ?? '')
    // zero-width/format controls frequently appear in spreadsheet exports
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .trim();
  if (!t || t === '-') return '';
  return t;
}

function normalizeMoneyNumber(v) {
  const s = normalizeCsvCell(v);
  if (!s) return 0;
  const cleaned = s.replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeIntNumber(v, fallback = 0) {
  const s = normalizeCsvCell(v);
  if (!s) return fallback;
  const cleaned = s.replace(/[^\d.-]/g, '');
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeYesNoBool(v) {
  const s = normalizeCsvCell(v).toLowerCase();
  return s === 'yes' || s === 'y' || s === 'true' || s === '1';
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
    const sortOrderRaw = normalizeIntNumber(row['Sort Order'], 0);
    const itemSortOrder = sortOrderRaw > 0 ? sortOrderRaw : Number.MAX_SAFE_INTEGER;
    const baseQty = normalizeIntNumber(row.BaseQty, normalizeIntNumber(row.Qty, 0));
    const cartonQty = normalizeIntNumber(row.CartonQty, 0);
    const expoTotalCostNum = normalizeMoneyNumber(row['Expo Total Cost']);
    const totalUnitCostNum = normalizeMoneyNumber(row['Total Unit Cost'] || row['Reg Total Cost']);
    const rrpNum = normalizeMoneyNumber(row.RRP || row['SRP / Promo RRP']);
    const offerMode = normalizeCsvCell(row['Offer Mode']).toUpperCase();
    const minBundleQty = normalizeIntNumber(row['Min Bundle Qty'], 1);
    const allowLineIncrease = normalizeYesNoBool(row['Allow Line Increase']);
    const selectionRule = normalizeCsvCell(row['Selection Rule']);
    const minSelections = normalizeIntNumber(row['Min Selections'], 0);
    const maxSelections = normalizeIntNumber(row['Max Selections'], 0);

    if (!grouped[key]) {
      const meta = buildOfferMetaFromRows([row]);
      grouped[key] = {
        offer: key,
        offerId: key,
        offerCode: normalizeCsvCell(row['Offer Code'] || row.Code),
        offerGroup: row['Offer Group'],
        brand: row.Brand,
        offerName: normalizeCsvCell(row['Offer Name']),
        range: row.Range,
        minOrderValue: row['Min Order Value (ex GST)'],
        save: row.Save || '',
        totalCost: 0, // Will be calculated by summing all rows
        offerTier: row['Offer Tier'] || '',
        descriptions: [],
        expoChargeBackCost: 0,
        rules: {
          offerMode: offerMode || 'FIXED',
          minBundleQty: minBundleQty > 0 ? minBundleQty : 1,
          allowLineIncrease,
          selectionRule,
          minSelections,
          maxSelections,
        },
        items: [],
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
      const expoPrice  = expoTotalCostNum;
      const normCost   = totalUnitCostNum;
      const rrp        = rrpNum;
      const units      = normalizeIntNumber(row.Qty, 1) || 1;
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

      grouped[key].items.push({
        sku: normalizeCsvCell(row.SKU || row.Code),
        description: normalizeCsvCell(row.Description),
        baseQty,
        cartonQty,
        rrp: rrpNum,
        totalUnitCost: totalUnitCostNum,
        expoTotalCost: expoTotalCostNum,
        sortOrder: sortOrderRaw > 0 ? sortOrderRaw : undefined,
        _sortOrder: itemSortOrder,
      });
    }
    // expoChargeBackCost = sum of all Expo Total Cost values across all SKUs in this offer
    grouped[key].expoChargeBackCost += expoTotalCostNum;
    // totalCost = sum of all Expo Total Cost values across all SKUs in this offer
    grouped[key].totalCost += expoTotalCostNum;
  });

  Object.keys(grouped).forEach((k) => {
    grouped[k].expoChargeBackCost = grouped[k].expoChargeBackCost.toFixed(2);
    grouped[k].totalCost = grouped[k].totalCost.toFixed(2);
    grouped[k].items = grouped[k].items
      .sort((a, b) => (a._sortOrder || Number.MAX_SAFE_INTEGER) - (b._sortOrder || Number.MAX_SAFE_INTEGER))
      .map(({ _sortOrder, ...rest }) => rest);
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
    offerCode:          normalizeCsvCell(clean['Offer Code']),
    offerName:          normalizeCsvCell(clean['Offer Name']),
    sku:                normalizeCsvCell(clean.SKU),
    baseQty:            normalizeCsvCell(clean.BaseQty),
    cartonQty:          normalizeCsvCell(clean.CartonQty),
    totalUnitCost:      normalizeCsvCell(clean['Total Unit Cost']),
    offerMode:          normalizeCsvCell(clean['Offer Mode']),
    minBundleQty:       normalizeCsvCell(clean['Min Bundle Qty']),
    allowLineIncrease:  normalizeCsvCell(clean['Allow Line Increase']),
    selectionRule:      normalizeCsvCell(clean['Selection Rule']),
    minSelections:      normalizeCsvCell(clean['Min Selections']),
    maxSelections:      normalizeCsvCell(clean['Max Selections']),
    sortOrder:          normalizeCsvCell(clean['Sort Order']),
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
      offerCode: normalizeCsvCell(c['Offer Code']),
      offerName: normalizeCsvCell(c['Offer Name']),
      sku: normalizeCsvCell(c.SKU),
      baseQty: normalizeCsvCell(c.BaseQty),
      cartonQty: normalizeCsvCell(c.CartonQty),
      totalUnitCost: normalizeCsvCell(c['Total Unit Cost']),
      offerMode: normalizeCsvCell(c['Offer Mode']),
      minBundleQty: normalizeCsvCell(c['Min Bundle Qty']),
      allowLineIncrease: normalizeCsvCell(c['Allow Line Increase']),
      selectionRule: normalizeCsvCell(c['Selection Rule']),
      minSelections: normalizeCsvCell(c['Min Selections']),
      maxSelections: normalizeCsvCell(c['Max Selections']),
      sortOrder: normalizeCsvCell(c['Sort Order']),
    });
  }
  return out;
}

/** Internal insert rows for `offers` table (legacy or new CSV). */
async function loadOffersCsvInternalRows(filePath) {
  const raw = await readOffersCsvRaw(filePath);
  if (raw.length === 0) return [];
  const headers = Object.keys(raw[0]);
  const isFixedSplit =
    headers.includes('OFFER') && headers.includes('Offer Mode') && headers.includes('BaseQty');
  if (isFixedSplit) return mapFixedSplitOffersCsv(raw);
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
    'Offer Code': r.offerCode || '',
    'Offer Name': r.offerName || '',
    SKU: r.sku || '',
    BaseQty: r.baseQty || '',
    CartonQty: r.cartonQty || '',
    'Total Unit Cost': r.totalUnitCost || '',
    'Offer Mode': r.offerMode || '',
    'Min Bundle Qty': r.minBundleQty || '',
    'Allow Line Increase': r.allowLineIncrease || '',
    'Selection Rule': r.selectionRule || '',
    'Min Selections': r.minSelections || '',
    'Max Selections': r.maxSelections || '',
    'Sort Order': r.sortOrder || '',
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
    const parsed = parseMcashRowFromClean(clean);
    if (!parsed) return null;
    return {
      id: `${parsed.state}-${parsed.suburb}-${parsed.name}`,
      ...parsed,
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
async function loadMcashStoresCSV() {
  const filePath = path.resolve(__dirname, 'mcash26.csv');
  if (!fs.existsSync(filePath)) { console.warn('mcash26.csv not found – skipping.'); return; }

  let results;
  try {
    results = await parseCSV(filePath, (clean) => parseMcashRowFromClean(clean));
  } catch (err) {
    console.error('mcash26.csv parse failed:', err.message || err);
    throw err;
  }

  if (results.length === 0) {
    console.warn('mcash26.csv: 0 rows parsed — leaving mcash_stores unchanged.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM mcash_stores');
    await client.query(
      `INSERT INTO mcash_stores (name, address, suburb, state, pcode, banner, store_id, store_rank, owner_group)
       SELECT name, address, suburb, state, pcode, banner, store_id,
              NULLIF(rank_txt, '')::integer,
              owner_group
       FROM unnest(
         $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[],
         $8::text[], $9::text[]
       ) AS t(name, address, suburb, state, pcode, banner, store_id, rank_txt, owner_group)`,
      [
        results.map((r) => r.name),
        results.map((r) => r.address),
        results.map((r) => r.suburb),
        results.map((r) => r.state),
        results.map((r) => r.pcode),
        results.map((r) => r.banner),
        results.map((r) => r.storeId),
        results.map((r) => (r.storeRank == null ? '' : String(r.storeRank))),
        results.map((r) => r.ownerGroup || ''),
      ]
    );
    await client.query('COMMIT');
    console.log(`Loaded ${results.length} mcash stores.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('mcash_stores load failed (rolled back):', err.message || err);
    throw err;
  } finally {
    client.release();
  }
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
        "Logo","Product Image","Hero","Category","Message","Other","Type",
        "Offer Code","Offer Name","SKU","BaseQty","CartonQty","Total Unit Cost",
        "Offer Mode","Min Bundle Qty","Allow Line Increase","Selection Rule",
        "Min Selections","Max Selections","Sort Order")
     SELECT * FROM unnest(
       $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
       $7::text[], $8::text[], $9::text[], $10::text[], $11::text[], $12::text[],
       $13::text[], $14::text[], $15::text[], $16::text[], $17::text[], $18::text[],
       $19::text[], $20::text[], $21::text[], $22::text[], $23::text[], $24::text[],
       $25::text[], $26::text[], $27::text[], $28::text[], $29::text[], $30::text[],
       $31::text[], $32::text[], $33::text[], $34::text[], $35::text[], $36::text[],
       $37::text[], $38::text[], $39::text[], $40::text[], $41::text[], $42::text[]
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
      results.map((r) => r.offerType || ''), results.map((r) => r.offerCode || ''),
      results.map((r) => r.offerName || ''), results.map((r) => r.sku || ''),
      results.map((r) => r.baseQty || ''), results.map((r) => r.cartonQty || ''),
      results.map((r) => r.totalUnitCost || ''), results.map((r) => r.offerMode || ''),
      results.map((r) => r.minBundleQty || ''), results.map((r) => r.allowLineIncrease || ''),
      results.map((r) => r.selectionRule || ''), results.map((r) => r.minSelections || ''),
      results.map((r) => r.maxSelections || ''), results.map((r) => r.sortOrder || ''),
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
    const row = await findMcashStoreByPaddedStoreNo(paddedNumber);
    if (!row) return res.status(404).json({ error: 'Store not found' });
    res.json({
      storeNo:              paddedNumber,
      storeName:            row.name || '',
      banner:               row.banner || '-',
      overall:              '',
      automotive:           '',
      energyStorage:        '',
      lighting:             '',
      specialOrderHardware: '',
      address:              row.address || '',
      suburb:               row.suburb || '',
      state:                row.state || '',
      pcode:                row.pcode || '',
      storeId:              (row.store_id || '').trim(),
      storeRank:            row.store_rank != null ? row.store_rank : null,
      ownerGroup:           (row.owner_group || '').trim(),
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
    const row = await findMcashStoreByPaddedStoreNo(paddedNumber);
    if (!row) {
      return res.json({
        storeNo: paddedNumber,
        storeName: `Store ${paddedNumber}`,
        banner: '-',
        overall: '',
        automotive: '',
        energyStorage: '',
        lighting: '',
        specialOrderHardware: '',
      });
    }
    res.json({
      storeNo:              paddedNumber,
      storeName:            row.name || '',
      banner:               row.banner || '-',
      overall:              '',
      automotive:           '',
      energyStorage:        '',
      lighting:             '',
      specialOrderHardware: '',
    });
  } catch (err) {
    console.error('GET /api/store-data error:', err.message);
    res.status(500).json({ error: 'Failed to fetch store data' });
  }
});

// ---------------------------------------------------------------------------
// API – Metcash store lookup (state → suburb → stores) — mcash_stores / file fallback only.
// sales25.csv is loaded in memory at boot and used only by GET /api/store-sales/:storeId.
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
      `SELECT id, name, address, suburb, state, pcode, banner, store_id, store_rank, owner_group
       FROM mcash_stores WHERE state = $1 AND suburb = $2
       ORDER BY store_rank NULLS LAST, name`,
      [state, suburb]
    );
    if (rows.length > 0) {
      return res.json(rows.map((r) => ({
        id:         r.id,
        name:       r.name,
        storeId:    (r.store_id || '').trim(),
        address:    r.address || '',
        suburb:     r.suburb,
        state:      r.state,
        pcode:      r.pcode || '',
        banner:     r.banner || '-',
        storeRank:  r.store_rank != null ? r.store_rank : null,
        ownerGroup: (r.owner_group || '').trim(),
      })));
    }
    const fallbackRows = await loadFallbackMcashStores();
    const matches = fallbackRows.filter((r) => r.state === state && r.suburb === suburb);
    res.json(
      matches
        .sort((a, b) => {
          const ar = a.storeRank != null ? a.storeRank : 9999999;
          const br = b.storeRank != null ? b.storeRank : 9999999;
          if (ar !== br) return ar - br;
          return (a.name || '').localeCompare(b.name || '');
        })
        .map((r, idx) => ({
          id: idx + 1,
          name: r.name,
          storeId: r.storeId || '',
          address: r.address || '',
          suburb: r.suburb,
          state: r.state,
          pcode: r.pcode || '',
          banner: r.banner || '-',
          storeRank: r.storeRank != null ? r.storeRank : null,
          ownerGroup: (r.ownerGroup || '').trim(),
        }))
    );
  } catch (err) {
    const state  = (req.query.state  || '').trim();
    const suburb = (req.query.suburb || '').trim();
    if (!state || !suburb) return res.status(400).json({ error: 'state and suburb required' });
    const fallbackRows = await loadFallbackMcashStores();
    const matches = fallbackRows.filter((r) => r.state === state && r.suburb === suburb);
    res.json(
      matches
        .sort((a, b) => {
          const ar = a.storeRank != null ? a.storeRank : 9999999;
          const br = b.storeRank != null ? b.storeRank : 9999999;
          if (ar !== br) return ar - br;
          return (a.name || '').localeCompare(b.name || '');
        })
        .map((r, idx) => ({
          id: idx + 1,
          name: r.name,
          storeId: r.storeId || '',
          address: r.address || '',
          suburb: r.suburb,
          state: r.state,
          pcode: r.pcode || '',
          banner: r.banner || '-',
          storeRank: r.storeRank != null ? r.storeRank : null,
          ownerGroup: (r.ownerGroup || '').trim(),
        }))
    );
  }
});

// ---------------------------------------------------------------------------
// API – MSO (group) lookup
// ---------------------------------------------------------------------------
app.get('/api/mcash-groups', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT TRIM(owner_group) AS g
      FROM mcash_stores
      WHERE owner_group IS NOT NULL
        AND TRIM(owner_group) <> ''
        AND TRIM(owner_group) <> '-'
      ORDER BY g
    `);
    if (rows.length > 0) {
      return res.json(rows.map((r) => r.g));
    }
    const fallbackRows = await loadFallbackMcashStores();
    const set = new Set();
    fallbackRows.forEach((r) => {
      const g = (r.ownerGroup || '').trim();
      if (g && g !== '-') set.add(g);
    });
    res.json([...set].sort((a, b) => a.localeCompare(b)));
  } catch (err) {
    const fallbackRows = await loadFallbackMcashStores();
    const set = new Set();
    fallbackRows.forEach((r) => {
      const g = (r.ownerGroup || '').trim();
      if (g && g !== '-') set.add(g);
    });
    res.json([...set].sort((a, b) => a.localeCompare(b)));
  }
});

function mapMcashStoreRowToApi(r, idx) {
  return {
    id: idx != null ? idx : r.id,
    name: r.name,
    storeId: (r.store_id || r.storeId || '').trim(),
    address: r.address || '',
    suburb: r.suburb,
    state: r.state,
    pcode: r.pcode || '',
    banner: r.banner || '-',
    storeRank: r.store_rank != null ? r.store_rank : (r.storeRank != null ? r.storeRank : null),
    ownerGroup: (r.owner_group || r.ownerGroup || '').trim(),
  };
}

app.get('/api/mcash-stores-by-group', async (req, res) => {
  const group = (req.query.group || '').trim();
  if (!group) return res.status(400).json({ error: 'group required' });
  try {
    const { rows } = await pool.query(
      `SELECT id, name, address, suburb, state, pcode, banner, store_id, store_rank, owner_group
       FROM mcash_stores
       WHERE LOWER(TRIM(COALESCE(owner_group, ''))) = LOWER(TRIM($1))
       ORDER BY state, suburb, name`,
      [group]
    );
    if (rows.length > 0) {
      return res.json(rows.map((r) => mapMcashStoreRowToApi(r, r.id)));
    }
    const fallbackRows = await loadFallbackMcashStores();
    const matches = fallbackRows.filter(
      (r) => (r.ownerGroup || '').trim().toLowerCase() === group.toLowerCase()
    );
    res.json(
      matches.map((r, idx) => ({
        ...mapMcashStoreRowToApi(r, idx + 1),
      }))
    );
  } catch (err) {
    const fallbackRows = await loadFallbackMcashStores();
    const matches = fallbackRows.filter(
      (r) => (r.ownerGroup || '').trim().toLowerCase() === group.toLowerCase()
    );
    res.json(
      matches.map((r, idx) => ({
        ...mapMcashStoreRowToApi(r, idx + 1),
      }))
    );
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
             "Logo","Product Image","Hero","Category","Message","Other","Type",
             "Offer Code","Offer Name","SKU","BaseQty","CartonQty","Total Unit Cost",
             "Offer Mode","Min Bundle Qty","Allow Line Increase","Selection Rule",
             "Min Selections","Max Selections","Sort Order"
      FROM offers
      ORDER BY "OFFER","Offer Tier"
    `);
      rows = dbResult.rows;
    } catch {
      rows = await loadFallbackOffersRows();
    }
    if (rows.length === 0) rows = await loadFallbackOffersRows();

    const grouped = applyPosContent(applyOfferContent(groupOffersRows(rows)));
    res.json(Object.values(grouped));
  } catch (err) {
    console.error('GET /api/offers error:', err.message);
    const rows = await loadFallbackOffersRows();
    const grouped = applyPosContent(applyOfferContent(groupOffersRows(rows)));
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
    mergeEditorialIntoMetaByOfferId(meta, offerId);
    mergePosIntoTarget(meta, offerId);
    const rules = {
      offerMode: normalizeCsvCell(first['Offer Mode']).toUpperCase() || 'FIXED',
      minBundleQty: normalizeIntNumber(first['Min Bundle Qty'], 1) || 1,
      allowLineIncrease: normalizeYesNoBool(first['Allow Line Increase']),
      selectionRule: normalizeCsvCell(first['Selection Rule']),
      minSelections: normalizeIntNumber(first['Min Selections'], 0),
      maxSelections: normalizeIntNumber(first['Max Selections'], 0),
    };

    // Enrich each row with computed deal fields
    const enrichRow = (row) => {
      const expoPrice = normalizeMoneyNumber(row['Expo Total Cost']);
      const normCost  = normalizeMoneyNumber(row['Total Unit Cost'] || row['Reg Total Cost']);
      const rrp       = normalizeMoneyNumber(row.RRP || row['SRP / Promo RRP']);
      const units     = normalizeIntNumber(row.Qty, 1) || 1;
      const baseQty = normalizeIntNumber(row.BaseQty, normalizeIntNumber(row.Qty, 0));
      const lineUnitExpoCost = baseQty > 0 ? expoPrice / baseQty : expoPrice;
      return {
        ...row,
        metcashCode: row['HTH Code'] || row.Code || '',
        qty:         row.Qty || '',
        rrp:         row['SRP / Promo RRP'] || '',
        expoPrice:   row['Expo Total Cost'] || '',
        normalCost:  row['Reg Total Cost'] || '',
        discount:    normCost > 0 ? ((normCost - expoPrice) / normCost * 100).toFixed(1) + '%' : (row.Save || ''),
        margin:      rrp > 0 ? ((rrp - expoPrice / units) / rrp * 100).toFixed(1) + '%' : '',
        offerCode: normalizeCsvCell(row['Offer Code'] || row.Code),
        offerName: normalizeCsvCell(row['Offer Name']),
        sku: normalizeCsvCell(row.SKU || row.Code),
        baseQty,
        cartonQty: normalizeIntNumber(row.CartonQty, 0),
        rrpValue: rrp,
        totalUnitCost: normCost,
        expoTotalCostValue: expoPrice,
        lineUnitExpoCost,
        offerMode: normalizeCsvCell(row['Offer Mode']).toUpperCase(),
        minBundleQty: normalizeIntNumber(row['Min Bundle Qty'], 1),
        allowLineIncrease: normalizeYesNoBool(row['Allow Line Increase']),
        selectionRule: normalizeCsvCell(row['Selection Rule']),
        minSelections: normalizeIntNumber(row['Min Selections'], 0),
        maxSelections: normalizeIntNumber(row['Max Selections'], 0),
        sortOrder: normalizeIntNumber(row['Sort Order'], 0),
      };
    };

    const expoChargeBackCost = rows.reduce((s, r) => s + normalizeMoneyNumber(r['Expo Total Cost']), 0).toFixed(2);
    const sortedRows = [...rows].sort((a, b) => {
      const sa = normalizeIntNumber(a['Sort Order'], 0);
      const sb = normalizeIntNumber(b['Sort Order'], 0);
      if (sa > 0 || sb > 0) {
        return (sa || Number.MAX_SAFE_INTEGER) - (sb || Number.MAX_SAFE_INTEGER);
      }
      return 0;
    });

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
        hasTiers: true, tiers, allItems: sortedRows.map(enrichRow), expoChargeBackCost, rules,
        ...meta,
      });
    }
    res.json({
      offerId, offerGroup: first['Offer Group'], brand: first.Brand, range: first.Range,
      hasTiers: false, items: sortedRows.map(enrichRow), expoChargeBackCost, rules,
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
    mergeEditorialIntoMetaByOfferId(meta, offerId);
    mergePosIntoTarget(meta, offerId);
    const rules = {
      offerMode: normalizeCsvCell(first['Offer Mode']).toUpperCase() || 'FIXED',
      minBundleQty: normalizeIntNumber(first['Min Bundle Qty'], 1) || 1,
      allowLineIncrease: normalizeYesNoBool(first['Allow Line Increase']),
      selectionRule: normalizeCsvCell(first['Selection Rule']),
      minSelections: normalizeIntNumber(first['Min Selections'], 0),
      maxSelections: normalizeIntNumber(first['Max Selections'], 0),
    };
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
        hasTiers: true, tiers, allItems: rows, rules,
        ...meta,
      });
    }
    res.json({
      offerId, offerGroup: first['Offer Group'], brand: first.Brand, range: first.Range,
      hasTiers: false, items: rows, rules,
      ...meta,
    });
  }
});

app.post('/api/reload-offers', async (req, res) => {
  try {
    loadOfferContentFromDisk();
    await loadPosCsvFromDisk();
    await loadOffersCSV();
    res.json({ success: true, message: 'Offers, offer-content.json, and pos.csv reloaded.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Persist post-checkout spin wins (retail store vs MSO group context). */
app.post('/api/spin-win', async (req, res) => {
  try {
    const b = req.body || {};
    const clip = (v, n) => {
      const s = v == null ? '' : String(v).trim();
      return s.length > n ? s.slice(0, n) : s;
    };
    const sessionKind = String(b.sessionKind || '').toLowerCase() === 'mso' ? 'mso' : 'retail';
    const userName = clip(b.userName, 200);
    const prizeId = clip(b.prizeId, 64);
    const sku = clip(b.sku, 64);
    const prizeName = clip(b.prizeName, 500);
    const prizeBrand = clip(b.prizeBrand, 200);
    if (!prizeId || !sku || !prizeName) {
      res.status(400).json({ ok: false, error: 'Missing prize fields' });
      return;
    }
    const msc = b.msoStoreCount;
    const msoStoreCount =
      msc === '' || msc === undefined || msc === null
        ? null
        : Number.parseInt(String(msc), 10);
    await pool.query(
      `INSERT INTO spin_win_events (session_kind, rep_email, user_name, store_name, mso_group, mso_store_count, store_id, prize_id, sku, prize_name, prize_brand)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        sessionKind,
        clip(b.repEmail, 320) || null,
        userName || null,
        clip(b.storeName, 500) || null,
        clip(b.msoGroup, 500) || null,
        Number.isFinite(msoStoreCount) ? msoStoreCount : null,
        clip(b.storeId, 64) || null,
        prizeId,
        sku,
        prizeName,
        prizeBrand || null,
      ],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/spin-win:', err.message || err);
    res.status(500).json({ ok: false });
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
        : Array(qty).fill(item.dropMonth || 'September');

      for (let i = 0; i < qty; i++) {
        await client.query(
          `INSERT INTO order_items (order_id,offer_id,offer_tier,quantity,description,cost,drop_month)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [orderId, item.offerId||'', item.offerTier||'', 1,
           item.description||'', parseFloat(item.cost)||0, dropMonths[i]||'September']
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
// Resolve Metcash store_id from display name (when client has storeName but no id)
// ---------------------------------------------------------------------------
app.get('/api/mcash-store-id', async (req, res) => {
  const name = (req.query.name || '').trim();
  const storeNoRaw = (req.query.storeNo || '').trim();
  const padded = padStoreNumber(storeNoRaw);
  const namesToTry = [];
  if (name) namesToTry.push(name);
  if (padded && padded.length === 6) {
    try {
      const m = await findMcashStoreByPaddedStoreNo(padded);
      if (m?.name) {
        const n = String(m.name).trim();
        if (n && !namesToTry.some((x) => x.toLowerCase() === n.toLowerCase())) namesToTry.push(n);
      }
    } catch (e) {
      console.error('GET /api/mcash-store-id (store no → name):', e.message || e);
    }
  }
  if (namesToTry.length === 0) return res.status(400).json({ storeId: '' });

  const tryDb = async (lookupName) => {
    const { rows } = await pool.query(
      `SELECT store_id FROM mcash_stores
       WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
       LIMIT 1`,
      [lookupName],
    );
    if (rows.length > 0 && rows[0].store_id) return String(rows[0].store_id).trim();
    return '';
  };

  try {
    for (const n of namesToTry) {
      const id = await tryDb(n);
      if (id) return res.json({ storeId: id });
    }
  } catch (e) {
    console.error('GET /api/mcash-store-id (db):', e.message || e);
  }

  try {
    const rows = await loadFallbackMcashStores();
    for (const n of namesToTry) {
      const hit = rows.find((r) => (r.name || '').trim().toLowerCase() === n.toLowerCase());
      if (hit?.storeId) return res.json({ storeId: String(hit.storeId).trim() });
    }
    const noise = new Set(['store', 'medium', 'large', 'small', 'metro', 'super']);
    for (const n of namesToTry) {
      const words = String(n).toLowerCase().match(/[a-z]{5,}/g) || [];
      for (const w of words) {
        if (noise.has(w)) continue;
        const loose = rows.filter((r) => (r.name || '').toLowerCase().includes(w));
        if (loose.length === 1) return res.json({ storeId: String(loose[0].storeId).trim() });
      }
    }
  } catch (e) {
    console.error('GET /api/mcash-store-id (fallback):', e.message || e);
  }
  res.json({ storeId: '' });
});

// ---------------------------------------------------------------------------
// Store sales (sales25.csv) — retail store insights after confirm
// ---------------------------------------------------------------------------
app.get('/api/store-sales/:storeId', async (req, res) => {
  try {
    await loadSales25Csv();
    const param = (req.params.storeId || '').trim();
    const idNorm = normalizeSales25StoreId(param);
    if (!param || !idNorm) {
      return res.json({ hasData: false, reason: 'no_store_id' });
    }
    if (!sales25Rows || sales25Rows.length === 0) {
      return res.json({ hasData: false, reason: 'no_csv' });
    }
    const matching = sales25Rows.filter((row) => {
      const raw = removeBOM(String(row.c0 ?? '').trim());
      const rowNorm = normalizeSales25StoreId(raw);
      return rowNorm === idNorm || raw === param;
    });
    if (matching.length === 0) {
      return res.json({ hasData: false });
    }
    let totalSales = 0;
    let storeName = '';
    const itemAgg = Array.from({ length: 10 }, (_, i) => ({
      name: (sales25ItemNames[5 + i] || `Item ${i + 1}`).trim() || `Item ${i + 1}`,
      value: 0,
      qty: 0,
    }));
    for (const row of matching) {
      if (!storeName && row.c1) storeName = String(row.c1).trim();
      for (let i = 0; i < 10; i++) {
        const vKey = `c${5 + i}`;
        const qKey = `c${15 + i}`;
        const itemValue = parseFloat(String(row[vKey] ?? '').replace(/,/g, '')) || 0;
        itemAgg[i].value += itemValue;
        itemAgg[i].qty += parseFloat(String(row[qKey] ?? '').replace(/,/g, '')) || 0;
        totalSales += itemValue;
      }
    }
    const items = itemAgg
      .map((it) => ({
        name: it.name,
        value: Math.round(it.value * 100) / 100,
        qty: Math.round(it.qty * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);
    res.json({
      hasData: true,
      storeName: storeName || String(matching[0].c1 || '').trim(),
      storeId: String(matching[0].c0 ?? '').trim(),
      totalSales: Math.round(totalSales * 100) / 100,
      items,
    });
  } catch (err) {
    console.error('GET /api/store-sales error:', err.message);
    res.status(500).json({ hasData: false, error: 'Failed to load store sales' });
  }
});

app.get('/api/store-suggest/:storeId', async (req, res) => {
  try {
    await loadSuggestCsv();
    const param = (req.params.storeId || '').trim();
    const idNorm = normalizeSales25StoreId(param);
    if (!param || !idNorm) {
      return res.json({ hasData: false, reason: 'no_store_id' });
    }
    if (!suggestRows || suggestRows.length === 0) {
      return res.json({ hasData: false, reason: 'no_csv' });
    }
    const matching = suggestRows.filter((row) => {
      const raw = removeBOM(String(row.c0 ?? '').trim());
      const rowNorm = normalizeSales25StoreId(raw);
      return rowNorm === idNorm || raw === param;
    });
    if (matching.length === 0) return res.json({ hasData: false });

    let storeName = '';
    if (Object.keys(suggestOfferColumns).length > 0) {
      const offers = [];
      for (const offerKey of Object.keys(suggestOfferColumns)) {
        const cols = suggestOfferColumns[offerKey] || {};
        let sales = 0;
        let suggest = 0;
        for (const row of matching) {
          if (!storeName && row.c1) storeName = String(row.c1).trim();
          if (Number.isInteger(cols.salesCol)) {
            sales += parseFloat(String(row[`c${cols.salesCol}`] ?? '').replace(/,/g, '')) || 0;
          }
          if (Number.isInteger(cols.suggestCol)) {
            suggest += parseFloat(String(row[`c${cols.suggestCol}`] ?? '').replace(/,/g, '')) || 0;
          }
        }
        offers.push({
          offerId: offerKey,
          sales: Math.round(sales * 1000) / 1000,
          suggest: Math.round(suggest * 1000) / 1000,
        });
      }
      const hasData = offers.some((x) => x.sales > 0 || x.suggest > 0);
      return res.json({
        hasData,
        storeName: storeName || String(matching[0].c1 || '').trim(),
        storeId: String(matching[0].c0 ?? '').trim(),
        offers,
      });
    }

    const itemAgg = Array.from({ length: 10 }, (_, i) => ({
      name: suggestItemNames[i] || `Item ${i + 1}`,
      qty: 0,
    }));
    for (const row of matching) {
      if (!storeName && row.c1) storeName = String(row.c1).trim();
      for (let i = 0; i < 10; i++) {
        const q = parseFloat(String(row[`c${3 + i}`] ?? '').replace(/,/g, '')) || 0;
        itemAgg[i].qty += q;
      }
    }
    const byName = new Map();
    for (const it of itemAgg) {
      const canon = canonicalSalesCategoryKey(String(it.name || ''));
      if (!canon) continue;
      const cur = byName.get(canon) || { name: String(it.name || '').trim(), qty: 0 };
      cur.qty += it.qty;
      if (!cur.name) cur.name = String(it.name || '').trim();
      byName.set(canon, cur);
    }
    const items = Array.from(byName.values())
      .map((it) => ({ name: it.name, qty: Math.round(it.qty * 1000) / 1000 }))
      .sort((a, b) => b.qty - a.qty);
    return res.json({
      hasData: items.some((x) => x.qty > 0),
      storeName: storeName || String(matching[0].c1 || '').trim(),
      storeId: String(matching[0].c0 ?? '').trim(),
      items,
    });
  } catch (err) {
    console.error('GET /api/store-suggest error:', err.message);
    return res.status(500).json({ hasData: false, error: 'Failed to load store suggested sell' });
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

/** Expo orders vs summed sales25.csv (all stores) by category — qty & value */
app.get('/api/dashboard/sales25-vs-orders', async (req, res) => {
  try {
    await loadSales25Csv();
    if (!sales25ItemNames || sales25ItemNames.length < 15) {
      return res.json({
        categories: [],
        unmapped: { qty: 0, value: 0 },
        totals: {
          currentQty: 0,
          currentValue: 0,
          sales25Qty: 0,
          sales25Value: 0,
        },
        sales25Loaded: false,
      });
    }
    const s25 = aggregateSales25CategoryTotals();
    const { rows: items } = await pool.query(`
      SELECT oi.offer_id, oi.quantity, oi.cost::numeric AS cost
      FROM order_items oi
      WHERE oi.offer_id IS NOT NULL AND TRIM(oi.offer_id) != ''
    `);
    const { rows: offerMapRows } = await pool.query(`
      SELECT "OFFER", MAX("Offer Group") AS og
      FROM offers
      WHERE "OFFER" IS NOT NULL AND TRIM("OFFER") != ''
      GROUP BY "OFFER"
    `);
    const offerToGroup = new Map(offerMapRows.map((r) => [String(r.OFFER).trim(), r.og]));

    const curQty = Array(10).fill(0);
    const curVal = Array(10).fill(0);
    let unmappedQty = 0;
    let unmappedVal = 0;

    for (const row of items) {
      const oid = String(row.offer_id || '').trim();
      const q = parseInt(row.quantity, 10) || 0;
      const unitCost = parseFloat(row.cost) || 0;
      const lineVal = q * unitCost;
      const og = offerToGroup.get(oid) || '';
      const idx = sales25CategoryIndexForOffer(og, oid, sales25ItemNames);
      if (idx < 0) {
        unmappedQty += q;
        unmappedVal += lineVal;
      } else {
        curQty[idx] += q;
        curVal[idx] += lineVal;
      }
    }
    for (let i = 0; i < 10; i++) {
      curQty[i] = Math.round(curQty[i] * 1000) / 1000;
      curVal[i] = Math.round(curVal[i] * 100) / 100;
    }
    unmappedQty = Math.round(unmappedQty * 1000) / 1000;
    unmappedVal = Math.round(unmappedVal * 100) / 100;

    const categories = [];
    for (let i = 0; i < 10; i++) {
      categories.push({
        name: (sales25ItemNames[5 + i] || `Category ${i + 1}`).trim(),
        currentQty: curQty[i],
        currentValue: curVal[i],
        sales25Qty: s25.qty[i],
        sales25Value: s25.value[i],
      });
    }

    const totals = {
      currentQty: Math.round((curQty.reduce((a, b) => a + b, 0) + unmappedQty) * 1000) / 1000,
      currentValue: Math.round((curVal.reduce((a, b) => a + b, 0) + unmappedVal) * 100) / 100,
      sales25Qty: Math.round(s25.qty.reduce((a, b) => a + b, 0) * 1000) / 1000,
      sales25Value: Math.round(s25.value.reduce((a, b) => a + b, 0) * 100) / 100,
    };

    res.json({
      categories,
      unmapped: { qty: unmappedQty, value: unmappedVal },
      totals,
      sales25Loaded: true,
    });
  } catch (err) {
    console.error('GET /api/dashboard/sales25-vs-orders:', err.message);
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
const frontendPublicPath = path.join(__dirname, '..', 'frontend', 'public');
const publicProductsPath = path.join(frontendPublicPath, 'products');
if (buildPath) {
  // Do NOT serve all of frontend/public before build: public/index.html has no JS bundles and
  // would be sent for GET / → blank screen. Only mount /products so new images work without rebuild.
  if (fs.existsSync(publicProductsPath)) {
    console.log('Serving live frontend/public/products at /products (no rebuild for new images):', publicProductsPath);
    app.use('/products', express.static(publicProductsPath));
  }
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
    loadMcashStoresCSV()
      .then(() => loadOffersCSV())
      .then(() => console.log('mcash / offers CSV data loaded.'))
      .catch(err => console.error('CSV load failed:', err.message));
  } catch (err) {
    dbReady = false;
    console.error('Database init failed, retrying in 10s:', err.message || err);
    setTimeout(initDbWithRetry, 10000);
  }
}

app.listen(PORT, async () => {
  console.log(`Metcash API → http://localhost:${PORT}`);
  await loadPosCsvFromDisk().catch((err) => console.error('pos.csv:', err.message));
  loadSales25Csv().catch((err) => console.error('sales25.csv:', err.message));
  loadSuggestCsv().catch((err) => console.error('suggest.csv:', err.message));
  initDbWithRetry();
});

process.on('SIGINT', async () => {
  await pool.end();
  console.log('Pool closed.');
  process.exit(0);
});
