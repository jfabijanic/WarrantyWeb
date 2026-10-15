const express = require('express');
const { query, getPool } = require('./db');
const { computeWarrantyEndDate, getWarrantyStatus } = require('./warranty');

const router = express.Router();

const CATEGORIES = ['mobitel', 'tablet', 'racunalo', 'televizor', 'kucanski-aparat', 'ostalo'];

const TRACKED_FIELDS = [
  'name', 'category', 'manufacturer', 'model', 'serial_number', 'purchase_date',
  'price', 'store', 'warranty_months', 'warranty_end_date', 'notes',
];

// Treat null/undefined/'' as equal and compare numbers by value, so no-op edits aren't logged.
function normalize(v) {
  if (v === null || v === undefined || v === '') return '';
  return String(v);
}

function serializeDevice(row) {
  const { status, daysLeft } = getWarrantyStatus(row.warranty_end_date);
  return { ...row, warranty_status: status, warranty_days_left: daysLeft };
}

function validateDevicePayload(body, { partial = false } = {}) {
  const errors = [];
  const required = ['name', 'purchase_date', 'warranty_months'];

  if (!partial) {
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        errors.push(`Polje "${field}" je obavezno.`);
      }
    }
  }

  if (body.category !== undefined && !CATEGORIES.includes(body.category)) {
    errors.push(`Nepoznata kategorija: ${body.category}`);
  }
  if (body.purchase_date !== undefined && isNaN(Date.parse(body.purchase_date))) {
    errors.push('Datum kupnje nije valjan datum.');
  }
  if (body.warranty_months !== undefined && (isNaN(Number(body.warranty_months)) || Number(body.warranty_months) < 0)) {
    errors.push('Trajanje garancije (mjeseci) mora biti pozitivan broj.');
  }
  if (body.price !== undefined && body.price !== null && body.price !== '' && isNaN(Number(body.price))) {
    errors.push('Cijena mora biti broj.');
  }

  return errors;
}

// GET /api/devices - list all devices (with computed warranty status)
router.get('/', async (req, res) => {
  const { rows } = await query('SELECT * FROM devices WHERE user_id = $1 ORDER BY warranty_end_date ASC', [req.user.id]);
  res.json(rows.map(serializeDevice));
});

// GET /api/devices/summary - dashboard stats
router.get('/summary', async (req, res) => {
  const { rows } = await query('SELECT * FROM devices WHERE user_id = $1', [req.user.id]);
  const summary = { total: rows.length, active: 0, soon: 0, expired: 0, total_value: 0 };
  for (const row of rows) {
    const { status } = getWarrantyStatus(row.warranty_end_date);
    summary[status] += 1;
    summary.total_value += row.price || 0;
  }
  summary.total_value = Math.round(summary.total_value * 100) / 100;
  res.json(summary);
});

// Express params are strings; reject non-numeric ids before they reach Postgres.
function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
    res.status(404).json({ error: 'Uređaj nije pronađen.' });
    return null;
  }
  return id;
}

async function findOwned(id, userId) {
  const { rows } = await query('SELECT * FROM devices WHERE id = $1 AND user_id = $2', [id, userId]);
  return rows[0];
}

// GET /api/devices/:id/history
router.get('/:id/history', async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  if (!(await findOwned(id, req.user.id))) return res.status(404).json({ error: 'Uređaj nije pronađen.' });
  const { rows } = await query('SELECT * FROM device_history WHERE device_id = $1 ORDER BY created_at DESC, id DESC', [id]);
  res.json(rows.map((r) => ({ ...r, changes: r.changes ? JSON.parse(r.changes) : [] })));
});

// GET /api/devices/:id
router.get('/:id', async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const row = await findOwned(id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Uređaj nije pronađen.' });
  res.json(serializeDevice(row));
});

// POST /api/devices - create new device
router.post('/', async (req, res) => {
  const errors = validateDevicePayload(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const {
    name, category = 'ostalo', manufacturer = null, model = null,
    serial_number = null, purchase_date, price = null, store = null,
    warranty_months, notes = null,
  } = req.body;

  const warranty_end_date = computeWarrantyEndDate(purchase_date, warranty_months);

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO devices
        (user_id, name, category, manufacturer, model, serial_number, purchase_date, price, store, warranty_months, warranty_end_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.user.id, name, category, manufacturer, model, serial_number, purchase_date,
        price === '' ? null : price, store, warranty_months, warranty_end_date, notes],
    );
    await client.query("INSERT INTO device_history (device_id, event_type) VALUES ($1, 'created')", [rows[0].id]);
    await client.query('COMMIT');
    res.status(201).json(serializeDevice(rows[0]));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
});

// PUT /api/devices/:id - update existing device
router.put('/:id', async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const existing = await findOwned(id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Uređaj nije pronađen.' });

  const errors = validateDevicePayload(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ errors });

  const merged = { ...existing, ...req.body };
  merged.warranty_end_date = computeWarrantyEndDate(merged.purchase_date, merged.warranty_months);
  merged.price = merged.price === '' ? null : merged.price;

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE devices SET
        name=$1, category=$2, manufacturer=$3, model=$4, serial_number=$5, purchase_date=$6, price=$7,
        store=$8, warranty_months=$9, warranty_end_date=$10, notes=$11,
        updated_at=to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')
       WHERE id=$12 AND user_id=$13 RETURNING *`,
      [merged.name, merged.category, merged.manufacturer, merged.model, merged.serial_number,
        merged.purchase_date, merged.price, merged.store, merged.warranty_months,
        merged.warranty_end_date, merged.notes, id, req.user.id],
    );
    const row = rows[0];

    const changes = TRACKED_FIELDS
      .filter((f) => normalize(existing[f]) !== normalize(row[f]))
      .map((f) => ({ field: f, from: existing[f] ?? null, to: row[f] ?? null }));
    if (changes.length) {
      await client.query(
        "INSERT INTO device_history (device_id, event_type, changes) VALUES ($1, 'updated', $2)",
        [row.id, JSON.stringify(changes)],
      );
    }
    await client.query('COMMIT');
    res.json(serializeDevice(row));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
});

// DELETE /api/devices/:id (history rows are removed via ON DELETE CASCADE)
router.delete('/:id', async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const { rowCount } = await query('DELETE FROM devices WHERE id = $1 AND user_id = $2', [id, req.user.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Uređaj nije pronađen.' });
  res.status(204).end();
});

const DOC_KINDS = ['receipt', 'warranty'];
const MAX_DOC_BYTES = 4 * 1024 * 1024; // Vercel serverless request bodies are capped at ~4.5 MB.
const MAX_DOCS_PER_DEVICE = 20;

// Detect the real type from magic bytes instead of trusting the client-supplied Content-Type.
function sniffMime(buf) {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 4).toString('latin1') === '%PDF') return 'application/pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (buf.subarray(0, 3).toString('latin1') === 'GIF') return 'image/gif';
  return null;
}

const DOC_COLUMNS = 'id, device_id, kind, filename, mime_type, size, created_at';

function parseDocId(req) {
  const docId = Number(req.params.docId);
  return Number.isInteger(docId) && docId > 0 && docId <= 2147483647 ? docId : null;
}

// GET /api/devices/:id/documents
router.get('/:id/documents', async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  if (!(await findOwned(id, req.user.id))) return res.status(404).json({ error: 'Uređaj nije pronađen.' });
  const { rows } = await query(`SELECT ${DOC_COLUMNS} FROM device_documents WHERE device_id = $1 ORDER BY created_at DESC, id DESC`, [id]);
  res.json(rows);
});

// POST /api/devices/:id/documents?kind=receipt|warranty&filename=... (raw file bytes in the body)
router.post('/:id/documents', express.raw({ type: () => true, limit: MAX_DOC_BYTES }), async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  if (!(await findOwned(id, req.user.id))) return res.status(404).json({ error: 'Uređaj nije pronađen.' });

  const kind = req.query.kind;
  if (!DOC_KINDS.includes(kind)) return res.status(400).json({ error: 'Nepoznata vrsta dokumenta.' });
  const body = req.body;
  if (!Buffer.isBuffer(body) || body.length === 0) return res.status(400).json({ error: 'Datoteka je prazna.' });
  const mime = sniffMime(body);
  if (!mime) return res.status(400).json({ error: 'Dopuštene su samo slike (JPG, PNG, WEBP, GIF) i PDF datoteke.' });

  const count = await query('SELECT COUNT(*)::int AS n FROM device_documents WHERE device_id = $1', [id]);
  if (count.rows[0].n >= MAX_DOCS_PER_DEVICE) {
    return res.status(400).json({ error: `Najviše ${MAX_DOCS_PER_DEVICE} dokumenata po uređaju.` });
  }

  const filename = String(req.query.filename || 'dokument').replace(/[\\/\r\n"]/g, '_').slice(0, 150) || 'dokument';
  const { rows } = await query(
    `INSERT INTO device_documents (device_id, kind, filename, mime_type, size, data)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${DOC_COLUMNS}`,
    [id, kind, filename, mime, body.length, body],
  );
  res.status(201).json(rows[0]);
});

// GET /api/devices/:id/documents/:docId/file
router.get('/:id/documents/:docId/file', async (req, res) => {
  const id = parseId(req, res);
  const docId = parseDocId(req);
  if (id === null) return;
  if (docId === null) return res.status(404).json({ error: 'Dokument nije pronađen.' });
  const { rows } = await query(
    `SELECT d.filename, d.mime_type, d.data FROM device_documents d
     JOIN devices v ON v.id = d.device_id
     WHERE d.id = $1 AND d.device_id = $2 AND v.user_id = $3`,
    [docId, id, req.user.id],
  );
  const doc = rows[0];
  if (!doc) return res.status(404).json({ error: 'Dokument nije pronađen.' });
  res.set({
    'Content-Type': doc.mime_type,
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, max-age=300',
  });
  res.send(doc.data);
});

// DELETE /api/devices/:id/documents/:docId
router.delete('/:id/documents/:docId', async (req, res) => {
  const id = parseId(req, res);
  const docId = parseDocId(req);
  if (id === null) return;
  if (docId === null) return res.status(404).json({ error: 'Dokument nije pronađen.' });
  const { rowCount } = await query(
    `DELETE FROM device_documents WHERE id = $1 AND device_id = $2
       AND device_id IN (SELECT id FROM devices WHERE id = $2 AND user_id = $3)`,
    [docId, id, req.user.id],
  );
  if (rowCount === 0) return res.status(404).json({ error: 'Dokument nije pronađen.' });
  res.status(204).end();
});

module.exports = { router, CATEGORIES };
