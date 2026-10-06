const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL;

let pool;
// Created lazily so a missing DATABASE_URL gives a clear API error instead of crashing the whole function.
function getPool() {
  if (pool) return pool;
  if (!connectionString) {
    throw new Error('Baza nije konfigurirana: postavi DATABASE_URL (Postgres connection string).');
  }
  const isLocal = /@(localhost|127\.0\.0\.1)(:|\/)/.test(connectionString);
  // SSL is configured explicitly below, so strip sslmode/channel_binding from the URL.
  const url = connectionString
    .replace(/([?&])(sslmode|channel_binding)=[^&]*&?/g, '$1')
    .replace(/[?&]$/, '');
  pool = new Pool({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: process.env.VERCEL ? 1 : 10,
  });
  return pool;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
  );
  CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (lower(username));
  CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));

  CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'ostalo',
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    purchase_date TEXT NOT NULL,
    price DOUBLE PRECISION,
    store TEXT,
    warranty_months INTEGER NOT NULL DEFAULT 24,
    warranty_end_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS'),
    updated_at TEXT NOT NULL DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
  );
  CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);

  CREATE TABLE IF NOT EXISTS device_history (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    changes TEXT,
    created_at TEXT NOT NULL DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
  );
  CREATE INDEX IF NOT EXISTS idx_device_history_device ON device_history(device_id);
`;

async function init() {
  // Advisory lock keeps concurrent cold starts from racing on schema creation.
  const client = await getPool().connect();
  try {
    await client.query('SELECT pg_advisory_lock(727274)');
    await client.query(SCHEMA);
    const admin = await client.query("SELECT id FROM users WHERE lower(username) = 'admin'");
    if (!admin.rows.length) {
      await client.query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)', [
        'admin',
        'admin@warrantyplus.local',
        bcrypt.hashSync(process.env.ADMIN_PASSWORD || '123', 10),
      ]);
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(727274)').catch(() => {});
    client.release();
  }
}

let ready;
function ensureReady() {
  if (!ready) {
    ready = init().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

const query = (text, params) => getPool().query(text, params);

module.exports = {
  query,
  ensureReady,
  getPool,
  hasConnectionString: () => !!connectionString,
};
