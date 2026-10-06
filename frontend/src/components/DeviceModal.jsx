import { useState } from 'react';
import { CATEGORY_VALUES } from '../constants';
import { useLanguage } from '../context/LanguageContext';

const EMPTY_FORM = {
  name: '',
  category: 'ostalo',
  manufacturer: '',
  model: '',
  serial_number: '',
  purchase_date: '',
  price: '',
  store: '',
  warranty_months: 24,
  notes: '',
};

/**
 * Modal form used both for creating a new device and editing an existing one.
 * `device` (optional) pre-fills the form when editing; `onSubmit` receives the payload.
 */
export default function DeviceModal({ device, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [form, setForm] = useState(() =>
    device
      ? {
          name: device.name || '',
          category: device.category || 'ostalo',
          manufacturer: device.manufacturer || '',
          model: device.model || '',
          serial_number: device.serial_number || '',
          purchase_date: device.purchase_date || '',
          price: device.price ?? '',
          store: device.store || '',
          warranty_months: device.warranty_months ?? 24,
          notes: device.notes || '',
        }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const errs = [];
    if (!form.name.trim()) errs.push(t.validationName);
    if (!form.purchase_date) errs.push(t.validationDate);
    if (form.warranty_months === '' || Number(form.warranty_months) < 0) {
      errs.push(t.validationWarranty);
    }
    if (form.price !== '' && isNaN(Number(form.price))) errs.push(t.validationPrice);
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        price: form.price === '' ? null : Number(form.price),
        warranty_months: Number(form.warranty_months),
      });
    } catch (err) {
      setErrors([err.message]);
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{device ? t.modalEditTitle : t.modalAddTitle}</h2>
        <div className="modal-sub">{t.modalSub}</div>

        {errors.length > 0 && (
          <div className="form-error-box">
            {errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field full">
              <label>{t.fieldName}</label>
              <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder={t.fieldNamePlaceholder} />
            </div>

            <div className="field">
              <label>{t.fieldCategory}</label>
              <select value={form.category} onChange={(e) => update('category', e.target.value)}>
                {CATEGORY_VALUES.map((c) => (
                  <option key={c.value} value={c.value}>{c.icon} {t.categories[c.value]}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t.fieldManufacturer}</label>
              <input value={form.manufacturer} onChange={(e) => update('manufacturer', e.target.value)} placeholder={t.fieldManufacturerPlaceholder} />
            </div>

            <div className="field">
              <label>{t.fieldModel}</label>
              <input value={form.model} onChange={(e) => update('model', e.target.value)} placeholder={t.fieldModelPlaceholder} />
            </div>
            <div className="field">
              <label>{t.fieldSerial}</label>
              <input value={form.serial_number} onChange={(e) => update('serial_number', e.target.value)} />
            </div>

            <div className="field">
              <label>{t.fieldPurchaseDate}</label>
              <input type="date" value={form.purchase_date} onChange={(e) => update('purchase_date', e.target.value)} />
            </div>
            <div className="field">
              <label>{t.fieldWarrantyMonths}</label>
              <input type="number" min="0" value={form.warranty_months} onChange={(e) => update('warranty_months', e.target.value)} />
            </div>

            <div className="field">
              <label>{t.fieldPrice}</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => update('price', e.target.value)} />
            </div>
            <div className="field">
              <label>{t.fieldStore}</label>
              <input value={form.store} onChange={(e) => update('store', e.target.value)} placeholder={t.fieldStorePlaceholder} />
            </div>

            <div className="field full">
              <label>{t.fieldNotes}</label>
              <textarea rows="3" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>{t.cancel}</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? t.saving : device ? t.saveChanges : t.addButton}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
