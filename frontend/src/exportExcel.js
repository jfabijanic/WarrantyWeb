import { formatDateTime } from './format';

function download(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeName(name) {
  return String(name).replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '') || 'uredaj';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function statusText(d, t) {
  const label = { active: t.statusActive, soon: t.statusSoon, expired: t.statusExpired }[d.warranty_status] || d.warranty_status;
  if (d.warranty_status === 'soon') return `${label} · ${d.warranty_days_left} ${t.dayLabel(d.warranty_days_left)}`;
  if (d.warranty_status === 'expired') {
    const n = Math.abs(d.warranty_days_left);
    return `${label} · ${t.daysAgoPrefix} ${n} ${t.dayLabel(n)}`;
  }
  return label;
}

// ISO yyyy-mm-dd -> real Date so Excel treats the cell as a date.
function toDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function styleHeader(sheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
}

function deviceColumns(t) {
  const clean = (s) => s.replace(' *', '');
  return [
    { header: clean(t.fieldName), key: 'name', width: 28 },
    { header: t.fieldCategory, key: 'category', width: 18 },
    { header: t.fieldManufacturer, key: 'manufacturer', width: 18 },
    { header: t.fieldModel, key: 'model', width: 18 },
    { header: t.fieldSerial, key: 'serial', width: 20 },
    { header: clean(t.fieldPurchaseDate), key: 'purchase', width: 14, style: { numFmt: 'dd.mm.yyyy' } },
    { header: t.fieldPrice, key: 'price', width: 12, style: { numFmt: '#,##0.00' } },
    { header: t.fieldStore, key: 'store', width: 18 },
    { header: clean(t.fieldWarrantyMonths), key: 'months', width: 16 },
    { header: t.fieldWarrantyEnd, key: 'end', width: 14, style: { numFmt: 'dd.mm.yyyy' } },
    { header: t.tableStatus, key: 'status', width: 24 },
    { header: t.fieldNotes, key: 'notes', width: 36 },
  ];
}

function deviceRow(d, t) {
  return {
    name: d.name,
    category: t.categories[d.category] || d.category,
    manufacturer: d.manufacturer || '',
    model: d.model || '',
    serial: d.serial_number || '',
    purchase: toDate(d.purchase_date),
    price: d.price ?? null,
    store: d.store || '',
    months: d.warranty_months,
    end: toDate(d.warranty_end_date),
    status: statusText(d, t),
    notes: d.notes || '',
  };
}

async function newWorkbook() {
  const ExcelJS = (await import('exceljs')).default;
  return new ExcelJS.Workbook();
}

export async function exportDevicesToExcel(devices, t) {
  const wb = await newWorkbook();
  const sheet = wb.addWorksheet(t.devicesHeading);
  sheet.columns = deviceColumns(t);
  devices.forEach((d) => sheet.addRow(deviceRow(d, t)));
  styleHeader(sheet);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
  download(await wb.xlsx.writeBuffer(), `uredaji_${today()}.xlsx`);
}

export async function exportDeviceToExcel(device, history, t, language, fieldLabel) {
  const wb = await newWorkbook();
  const sheet = wb.addWorksheet(t.detailsTitle);
  sheet.columns = deviceColumns(t);
  sheet.addRow(deviceRow(device, t));
  styleHeader(sheet);

  if (history && history.length) {
    const hs = wb.addWorksheet(t.detailsHistory);
    hs.columns = [
      { header: t.exportDate, key: 'date', width: 22 },
      { header: t.exportEvent, key: 'event', width: 16 },
      { header: t.exportField, key: 'field', width: 22 },
      { header: t.exportFrom, key: 'from', width: 24 },
      { header: t.exportTo, key: 'to', width: 24 },
    ];
    history.forEach((h) => {
      const event = h.event_type === 'created' ? t.historyCreated : t.historyUpdated;
      const date = formatDateTime(h.created_at, language);
      if (!h.changes.length) hs.addRow({ date, event });
      h.changes.forEach((c) =>
        hs.addRow({
          date,
          event,
          field: fieldLabel(c.field),
          from: c.from ?? '',
          to: c.to ?? '',
        }),
      );
    });
    styleHeader(hs);
  }

  download(await wb.xlsx.writeBuffer(), `${safeName(device.name)}_${today()}.xlsx`);
}
