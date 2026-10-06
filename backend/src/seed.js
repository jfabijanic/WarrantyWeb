const { getPool, ensureReady } = require('./db');
const { computeWarrantyEndDate } = require('./warranty');

// Nabavni datumi su postavljeni relativno na "danas" tako da seed prikazuje
// realnu raznolikost statusa garancije (aktivna / uskoro ističe / istekla).
const devices = [
  { name: 'iPhone 14 Pro', category: 'mobitel', manufacturer: 'Apple', model: 'A2890', serial_number: 'A1B2C3D4', purchase_date: '2025-06-01', price: 1199, store: 'Mimovrste', warranty_months: 24, notes: '' },
  { name: 'MacBook Air M2', category: 'racunalo', manufacturer: 'Apple', model: 'A2681', serial_number: 'FVFXW1', purchase_date: '2024-10-20', price: 1399, store: 'Links', warranty_months: 24, notes: '' },
  { name: 'QLED TV 55"', category: 'televizor', manufacturer: 'Samsung', model: 'QE55Q6', serial_number: 'QE55Q6-001', purchase_date: '2022-01-20', price: 899, store: 'Emmezeta', warranty_months: 24, notes: '' },
  { name: 'Hladnjak No Frost', category: 'kucanski-aparat', manufacturer: 'Bosch', model: 'KGN39VI', serial_number: 'KGN39-002', purchase_date: '2024-10-15', price: 749, store: 'Pevex', warranty_months: 24, notes: '' },
  { name: 'Slušalice WH-1000XM5', category: 'ostalo', manufacturer: 'Sony', model: 'WH1000XM5', serial_number: 'WHX5-003', purchase_date: '2025-09-02', price: 329, store: 'Sancta Domenica', warranty_months: 24, notes: '' },
  { name: 'Printer LaserJet', category: 'ostalo', manufacturer: 'HP', model: 'LJ-P1102', serial_number: 'LJP-004', purchase_date: '2021-02-10', price: 199, store: 'Instar', warranty_months: 24, notes: '' },
];

(async () => {
  await ensureReady();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const adminId = (await client.query("SELECT id FROM users WHERE lower(username) = 'admin'")).rows[0].id;
    await client.query('DELETE FROM devices WHERE user_id = $1', [adminId]);
    for (const d of devices) {
      const { rows } = await client.query(
        `INSERT INTO devices
          (user_id, name, category, manufacturer, model, serial_number, purchase_date, price, store, warranty_months, warranty_end_date, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [adminId, d.name, d.category, d.manufacturer, d.model, d.serial_number, d.purchase_date, d.price,
          d.store, d.warranty_months, computeWarrantyEndDate(d.purchase_date, d.warranty_months), d.notes],
      );
      await client.query("INSERT INTO device_history (device_id, event_type) VALUES ($1, 'created')", [rows[0].id]);
    }
    await client.query('COMMIT');
    console.log(`Seeded ${devices.length} devices.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await getPool().end();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
