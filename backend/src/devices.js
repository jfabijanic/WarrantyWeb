const express = require('express');
const db = require('./db');
const { computeWarrantyEndDate, getWarrantyStatus } = require('./warranty');

const router = express.Router();

const CATEGORIES = ['mobitel', 'tablet', 'racunalo', 'televizor', 'kucanski-aparat', 'ostalo'];

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
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM devices ORDER BY warranty_end_date ASC').all();
  res.json(rows.map(serializeDevice));
});

// GET /api/devices/summary - dashboard stats
router.get('/summary', (req, res) => {
  const rows = db.prepare('SELECT * FROM devices').all();
  const summary = { total: rows.length, active: 0, soon: 0, expired: 0 };
  for (const row of rows) {
    const { status } = getWarrantyStatus(row.warranty_end_date);
    summary[status] += 1;
  }
  res.json(summary);
});

// GET /api/devices/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Uređaj nije pronađen.' });
  res.json(serializeDevice(row));
});

// POST /api/devices - create new device
router.post('/', (req, res) => {
  const errors = validateDevicePayload(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const {
    name, category = 'ostalo', manufacturer = null, model = null,
    serial_number = null, purchase_date, price = null, store = null,
    warranty_months, notes = null,
  } = req.body;

  const warranty_end_date = computeWarrantyEndDate(purchase_date, warranty_months);

  const stmt = db.prepare(`
    INSERT INTO devices
      (name, category, manufacturer, model, serial_number, purchase_date, price, store, warranty_months, warranty_end_date, notes)
    VALUES (@name, @category, @manufacturer, @model, @serial_number, @purchase_date, @price, @store, @warranty_months, @warranty_end_date, @notes)
  `);
  const info = stmt.run({
    name, category, manufacturer, model, serial_number, purchase_date,
    price: price === '' ? null : price, store, warranty_months, warranty_end_date, notes,
  });

  const row = db.prepare('SELECT * FROM devices WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(serializeDevice(row));
});

// PUT /api/devices/:id - update existing device
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Uređaj nije pronađen.' });

  const errors = validateDevicePayload(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ errors });

  const merged = { ...existing, ...req.body };
  merged.warranty_end_date = computeWarrantyEndDate(merged.purchase_date, merged.warranty_months);
  merged.price = merged.price === '' ? null : merged.price;

  db.prepare(`
    UPDATE devices SET
      name=@name, category=@category, manufacturer=@manufacturer, model=@model,
      serial_number=@serial_number, purchase_date=@purchase_date, price=@price,
      store=@store, warranty_months=@warranty_months, warranty_end_date=@warranty_end_date,
      notes=@notes, updated_at=datetime('now')
    WHERE id=@id
  `).run(merged);

  const row = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  res.json(serializeDevice(row));
});

// DELETE /api/devices/:id
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM devices WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Uređaj nije pronađen.' });
  res.status(204).end();
});

module.exports = { router, CATEGORIES };
