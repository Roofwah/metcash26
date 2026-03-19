const path = require('path');
const sqlite3 = require('sqlite3').verbose();

function resolveDbPath() {
  const configured = (process.env.DB_PATH || '').trim();
  if (!configured) {
    return path.resolve(__dirname, 'metcash.db');
  }
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(__dirname, configured);
}

const dbPath = resolveDbPath();
const db = new sqlite3.Database(dbPath);

module.exports = {
  db,
  dbPath,
};
