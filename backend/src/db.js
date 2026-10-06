const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'warranty.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'ostalo',
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    purchase_date TEXT NOT NULL,
    price REAL,
    store TEXT,
    warranty_months INTEGER NOT NULL DEFAULT 24,
    warranty_end_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
