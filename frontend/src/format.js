export function formatDate(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}.`;
}

export function formatMoney(value, language) {
  if (value === null || value === undefined || value === '') return '-';
  return new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'hr-HR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

// SQLite datetime('now') is UTC without a timezone marker.
export function formatDateTime(sqliteUtc, language) {
  if (!sqliteUtc) return '-';
  const d = new Date(sqliteUtc.replace(' ', 'T') + 'Z');
  return d.toLocaleString(language === 'en' ? 'en-GB' : 'hr-HR');
}
