const db = require('./db');
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

const insert = db.prepare(`
  INSERT INTO devices
    (name, category, manufacturer, model, serial_number, purchase_date, price, store, warranty_months, warranty_end_date, notes)
  VALUES (@name, @category, @manufacturer, @model, @serial_number, @purchase_date, @price, @store, @warranty_months, @warranty_end_date, @notes)
`);

const clear = db.prepare('DELETE FROM devices');

db.transaction(() => {
  clear.run();
  for (const d of devices) {
    insert.run({ ...d, warranty_end_date: computeWarrantyEndDate(d.purchase_date, d.warranty_months) });
  }
})();

console.log(`Seeded ${devices.length} devices.`);
