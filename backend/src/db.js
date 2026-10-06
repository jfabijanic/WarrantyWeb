const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

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

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Default admin account (password "123") is created once; devices from before multi-user support belong to it.
if (!db.prepare("SELECT id FROM users WHERE username = 'admin'").get()) {
  db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
    .run('admin', 'admin@warrantyplus.local', bcrypt.hashSync('123', 10));
}

if (!db.prepare('PRAGMA table_info(devices)').all().some((c) => c.name === 'user_id')) {
  db.exec('ALTER TABLE devices ADD COLUMN user_id INTEGER');
}
db.prepare("UPDATE devices SET user_id = (SELECT id FROM users WHERE username = 'admin') WHERE user_id IS NULL").run();
db.exec('CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id)');

module.exports = db;
