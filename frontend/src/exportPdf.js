import { formatDate, formatMoney, formatDateTime } from './format';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function safeName(name) {
  return String(name).replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '') || 'uredaj';
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

// Roboto (bundled with pdfmake) covers Croatian characters; loaded lazily to keep the main bundle small.
async function loadPdfMake() {
  const pdfMake = (await import('pdfmake/build/pdfmake')).default;
  const vfs = (await import('pdfmake/build/vfs_fonts')).default;
  pdfMake.addVirtualFileSystem(vfs);
  return pdfMake;
}

const HEADER_FILL = '#2563eb';

function headerCell(text) {
  return { text, bold: true, color: '#ffffff', fillColor: HEADER_FILL, fontSize: 9 };
}

export async function exportDevicesToPdf(devices, t, language) {
  const pdfMake = await loadPdfMake();
  const body = [
    [t.tableDevice, t.tableManufacturerModel, t.tableSerial, t.tablePurchaseDate, t.fieldPrice, t.tableWarrantyUntil, t.tableStatus].map(headerCell),
    ...devices.map((d) => [
      `${d.name}\n${t.categories[d.category] || d.category}`,
      [d.manufacturer, d.model].filter(Boolean).join(' / ') || '-',
      d.serial_number || '-',
      formatDate(d.purchase_date),
      formatMoney(d.price, language),
      formatDate(d.warranty_end_date),
      statusText(d, t),
    ]),
  ];
  pdfMake
    .createPdf({
      pageOrientation: 'landscape',
      pageMargins: [30, 30, 30, 30],
      defaultStyle: { font: 'Roboto', fontSize: 9 },
      content: [
        { text: t.devicesHeading, fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
        { text: formatDateTime(new Date().toISOString().replace('T', ' ').slice(0, 19), language), color: '#64748b', margin: [0, 0, 0, 12] },
        { table: { headerRows: 1, widths: ['*', '*', 'auto', 'auto', 'auto', 'auto', 'auto'], body }, layout: 'lightHorizontalLines' },
      ],
    })
    .download(`uredaji_${today()}.pdf`);
}

export async function exportDeviceToPdf(device, history, t, language, fieldLabel) {
  const pdfMake = await loadPdfMake();
  const clean = (s) => s.replace(' *', '');
  const rows = [
    [t.fieldCategory, t.categories[device.category] || device.category],
    [t.fieldManufacturer, device.manufacturer || '-'],
    [t.fieldModel, device.model || '-'],
    [t.fieldSerial, device.serial_number || '-'],
    [clean(t.fieldPurchaseDate), formatDate(device.purchase_date)],
    [t.fieldPrice, formatMoney(device.price, language)],
    [t.fieldStore, device.store || '-'],
    [clean(t.fieldWarrantyMonths), t.detailsWarrantyMonths(device.warranty_months)],
    [t.fieldWarrantyEnd, formatDate(device.warranty_end_date)],
    [t.tableStatus, statusText(device, t)],
  ];
  if (device.notes) rows.push([t.fieldNotes, device.notes]);

  const content = [
    { text: device.name, fontSize: 20, bold: true },
    { text: t.detailsTitle, color: '#64748b', margin: [0, 2, 0, 14] },
    {
      table: { widths: [150, '*'], body: rows.map(([k, v]) => [{ text: k, bold: true, color: '#475569' }, String(v)]) },
      layout: 'lightHorizontalLines',
    },
  ];

  if (history && history.length) {
    const hbody = [[t.exportDate, t.exportEvent, t.exportField, t.exportFrom, t.exportTo].map(headerCell)];
    history.forEach((h) => {
      const event = h.event_type === 'created' ? t.historyCreated : t.historyUpdated;
      const date = formatDateTime(h.created_at, language);
      if (!h.changes.length) hbody.push([date, event, '', '', '']);
      h.changes.forEach((c) => hbody.push([date, event, fieldLabel(c.field), String(c.from ?? ''), String(c.to ?? '')]));
    });
    content.push(
      { text: t.detailsHistory, fontSize: 14, bold: true, margin: [0, 20, 0, 8] },
      { table: { headerRows: 1, widths: ['auto', 'auto', 'auto', '*', '*'], body: hbody }, layout: 'lightHorizontalLines' },
    );
  }

  pdfMake
    .createPdf({ pageMargins: [40, 40, 40, 40], defaultStyle: { font: 'Roboto', fontSize: 10 }, content })
    .download(`${safeName(device.name)}_${today()}.pdf`);
}
