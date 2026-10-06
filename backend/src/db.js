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

  CREATE TABLE IF NOT EXISTS device_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    changes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_device_history_device ON device_history(device_id);
`);

// Devices that existed before history tracking get a synthetic "created" entry.
db.exec(`
  INSERT INTO device_history (device_id, event_type, created_at)
  SELECT d.id, 'created', d.created_at FROM devices d
  WHERE NOT EXISTS (SELECT 1 FROM device_history h WHERE h.device_id = d.id);
`);

module.exports = db;
