import { useEffect, useState } from 'react';
import { getDeviceHistory } from '../api/devices';
import { useLanguage } from '../context/LanguageContext';
import { categoryIcon } from '../constants';
import { formatDate, formatMoney, formatDateTime } from '../format';
import StatusBadge from './StatusBadge';

export default function DeviceDetailsModal({ device, onClose, onEdit }) {
  const { t, language } = useLanguage();
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getDeviceHistory(device.id)
      .then((data) => !cancelled && setHistory(data))
      .catch((err) => !cancelled && setHistoryError(err.message));
    return () => {
      cancelled = true;
    };
  }, [device.id]);

  function formatValue(field, value) {
    if (value === null || value === undefined || value === '') return t.empty;
    if (field === 'purchase_date' || field === 'warranty_end_date') return formatDate(value);
    if (field === 'price') return formatMoney(value, language);
    if (field === 'category') return t.categories[value] || value;
    if (field === 'warranty_months') return t.detailsWarrantyMonths(value);
    return String(value);
  }

  function fieldLabel(field) {
    const labels = {
      name: t.fieldName,
      category: t.fieldCategory,
      manufacturer: t.fieldManufacturer,
      model: t.fieldModel,
      serial_number: t.fieldSerial,
      purchase_date: t.fieldPurchaseDate,
      price: t.fieldPrice,
      store: t.fieldStore,
      warranty_months: t.fieldWarrantyMonths,
      warranty_end_date: t.fieldWarrantyEnd,
      notes: t.fieldNotes,
    };
    return (labels[field] || field).replace(' *', '');
  }

  const rows = [
    [t.fieldCategory, `${categoryIcon(device.category)} ${t.categories[device.category] || device.category}`],
    [t.fieldManufacturer, device.manufacturer || '-'],
    [t.fieldModel, device.model || '-'],
    [t.fieldSerial, device.serial_number || '-'],
    [t.fieldPurchaseDate.replace(' *', ''), formatDate(device.purchase_date)],
    [t.fieldPrice, formatMoney(device.price, language)],
    [t.fieldStore, device.store || '-'],
    [t.fieldWarrantyMonths.replace(' *', ''), t.detailsWarrantyMonths(device.warranty_months)],
    [t.fieldWarrantyEnd, formatDate(device.warranty_end_date)],
  ];

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h2>{device.name}</h2>
            <div className="modal-sub">{t.detailsTitle}</div>
          </div>
          <StatusBadge status={device.warranty_status} daysLeft={device.warranty_days_left} />
        </div>

        <div className="details-grid">
          {rows.map(([label, value]) => (
            <div key={label} className="detail-item">
              <div className="detail-label">{label}</div>
              <div className="detail-value">{value}</div>
            </div>
          ))}
          {device.notes && (
            <div className="detail-item full">
              <div className="detail-label">{t.fieldNotes}</div>
              <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{device.notes}</div>
            </div>
          )}
        </div>

        <h3 style={{ fontSize: 15, margin: '24px 0 10px' }}>{t.detailsHistory}</h3>
        {historyError ? (
          <div className="form-error-box">{historyError}</div>
        ) : history === null ? (
          <div className="muted">{t.historyLoading}</div>
        ) : history.length === 0 ? (
          <div className="muted">{t.historyEmpty}</div>
        ) : (
          <ul className="timeline">
            {history.map((h) => (
              <li key={h.id}>
                <div className="timeline-head">
                  <strong>{h.event_type === 'created' ? t.historyCreated : t.historyUpdated}</strong>
                  <span className="muted">{formatDateTime(h.created_at, language)}</span>
                </div>
                {h.changes.map((c) => (
                  <div key={c.field} className="timeline-change">
                    {fieldLabel(c.field)}: <span className="muted">{formatValue(c.field, c.from)}</span> → {formatValue(c.field, c.to)}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>{t.close}</button>
          <button type="button" className="btn-primary" onClick={() => onEdit(device)}>✏️ {t.edit}</button>
        </div>
      </div>
    </div>
  );
}
