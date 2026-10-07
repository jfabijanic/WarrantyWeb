import { useEffect, useMemo, useState } from 'react';
import { listDevices, getSummary, createDevice, updateDevice, deleteDevice } from '../api/devices';
import StatusBadge from '../components/StatusBadge';
import DeviceModal from '../components/DeviceModal';
import LanguageSwitcher from '../components/LanguageSwitcher';
import DeviceDetailsModal from '../components/DeviceDetailsModal';
import { CATEGORY_VALUES, categoryIcon } from '../constants';
import { useLanguage } from '../context/LanguageContext';
import { formatDate, formatMoney } from '../format';

export default function Dashboard() {
  const { t, language } = useLanguage();
  const [devices, setDevices] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, soon: 0, expired: 0, total_value: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [viewingDevice, setViewingDevice] = useState(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  const STATUS_FILTERS = [
    { value: 'all', label: t.filterAll },
    { value: 'active', label: t.filterActive },
    { value: 'soon', label: t.filterSoon },
    { value: 'expired', label: t.filterExpired },
  ];

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [devicesData, summaryData] = await Promise.all([listDevices(), getSummary()]);
      setDevices(devicesData);
      setSummary(summaryData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAdd(payload) {
    await createDevice(payload);
    setShowAddModal(false);
    loadData();
  }

  async function handleEdit(payload) {
    await updateDevice(editingDevice.id, payload);
    setEditingDevice(null);
    loadData();
  }

  async function handleDelete(device) {
    if (!window.confirm(t.confirmDelete(device.name))) return;
    try {
      await deleteDevice(device.id);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  // Only show chips for categories that actually have devices, to avoid empty filter options.
  const availableCategories = useMemo(() => {
    const present = new Set(devices.map((d) => d.category));
    return CATEGORY_VALUES.filter((c) => present.has(c.value));
  }, [devices]);

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      if (statusFilter !== 'all' && d.warranty_status !== statusFilter) return false;
      if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${d.name} ${d.manufacturer || ''} ${d.model || ''} ${d.serial_number || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [devices, statusFilter, categoryFilter, search]);

  return (
    <div className="main">
      <div className="topbar">
        <div>
          <h1>{t.dashboardTitle}</h1>
          <div className="sub">{t.dashboardSubtitle}</div>
        </div>
        <div className="topbar-actions">
          <LanguageSwitcher />
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>{t.addDevice}</button>
        </div>
      </div>

      {error && <div className="form-error-box" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="stats five">
        <div className={`stat ${statusFilter === 'all' ? 'selected' : ''}`} onClick={() => setStatusFilter('all')}>
          <div className="label">{t.statTotal}</div>
          <div className="value">{summary.total}</div>
        </div>
        <div className={`stat green ${statusFilter === 'active' ? 'selected' : ''}`} onClick={() => setStatusFilter('active')}>
          <div className="label">{t.statActive}</div>
          <div className="value">{summary.active}</div>
        </div>
        <div className={`stat amber ${statusFilter === 'soon' ? 'selected' : ''}`} onClick={() => setStatusFilter('soon')}>
          <div className="label">{t.statSoon}</div>
          <div className="value">{summary.soon}</div>
        </div>
        <div className={`stat red ${statusFilter === 'expired' ? 'selected' : ''}`} onClick={() => setStatusFilter('expired')}>
          <div className="label">{t.statExpired}</div>
          <div className="value">{summary.expired}</div>
        </div>
        <div className="stat" style={{ cursor: 'default' }}>
          <div className="label">{t.statTotalValue}</div>
          <div className="value" style={{ fontSize: 24 }}>{formatMoney(summary.total_value, language)}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>{t.devicesHeading}</h2>
          <input
            className="search-input"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {!loading && devices.length > 0 && (
          <div className="filters">
            <div className="filter-chips">
              {STATUS_FILTERS.map((f) => (
                <div
                  key={f.value}
                  className={`chip ${statusFilter === f.value ? 'active' : ''}`}
                  onClick={() => setStatusFilter(f.value)}
                >
                  {f.label}
                </div>
              ))}
            </div>
            <div className="filter-chips">
              <div
                className={`chip ${categoryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('all')}
              >
                {t.allCategories}
              </div>
              {availableCategories.map((c) => (
                <div
                  key={c.value}
                  className={`chip ${categoryFilter === c.value ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(c.value)}
                >
                  {c.icon} {t.categories[c.value]}
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="empty-state">{t.loading}</div>
        ) : devices.length === 0 ? (
          <div className="empty-state">{t.emptyNoDevices}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">{t.emptyNoMatch}</div>
        ) : (
          <table className="devices-table">
            <thead>
              <tr>
                <th>{t.tableDevice}</th>
                <th>{t.tableManufacturerModel}</th>
                <th>{t.tableSerial}</th>
                <th>{t.tablePurchaseDate}</th>
                <th>{t.tableWarrantyUntil}</th>
                <th>{t.tableStatus}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="clickable" onClick={() => setViewingDevice(d)}>
                  <td className="cell-name">
                    <div className="device">
                      <div className="icon">{categoryIcon(d.category)}</div>
                      <div className="device-text">
                        <span className="device-name">{d.name}</span>
                        <span className="device-sub">{[d.manufacturer, d.model].filter(Boolean).join(' · ')}</span>
                      </div>
                    </div>
                  </td>
                  <td className="cell-mm">{[d.manufacturer, d.model].filter(Boolean).join(' / ') || '-'}</td>
                  <td className="muted cell-serial">{d.serial_number || '-'}</td>
                  <td className="cell-purchase">{formatDate(d.purchase_date)}</td>
                  <td className="cell-warranty" data-label={t.tableWarrantyUntil}>{formatDate(d.warranty_end_date)}</td>
                  <td className="cell-status"><StatusBadge status={d.warranty_status} daysLeft={d.warranty_days_left} /></td>
                  <td className="cell-actions">
                    <div className="actions-cell">
                      <button className="btn-icon" title={t.edit} onClick={(e) => { e.stopPropagation(); setEditingDevice(d); }}>✏️</button>
                      <button className="btn-icon" title={t.delete} onClick={(e) => { e.stopPropagation(); handleDelete(d); }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && <DeviceModal onClose={() => setShowAddModal(false)} onSubmit={handleAdd} />}
      {viewingDevice && (
        <DeviceDetailsModal
          device={viewingDevice}
          onClose={() => setViewingDevice(null)}
          onEdit={(d) => {
            setViewingDevice(null);
            setEditingDevice(d);
          }}
        />
      )}
      {editingDevice && (
        <DeviceModal device={editingDevice} onClose={() => setEditingDevice(null)} onSubmit={handleEdit} />
      )}
    </div>
  );
}
