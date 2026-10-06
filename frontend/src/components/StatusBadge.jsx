import { useLanguage } from '../context/LanguageContext';

/**
 * Renders a colored badge for a device's warranty status, with an optional
 * day-count suffix (e.g. "Expiring soon · 5 days"), translated via LanguageContext.
 */
export default function StatusBadge({ status, daysLeft }) {
  const { t } = useLanguage();

  const LABELS = {
    active: t.statusActive,
    soon: t.statusSoon,
    expired: t.statusExpired,
  };

  let detail = '';
  if (status === 'soon') detail = ` · ${daysLeft} ${t.dayLabel(daysLeft)}`;
  if (status === 'expired') {
    const prefix = t.daysAgoPrefix ? `${t.daysAgoPrefix} ` : '';
    detail = ` · ${prefix}${Math.abs(daysLeft)} ${t.dayLabel(Math.abs(daysLeft))}`;
  }

  return <span className={`badge ${status}`}>{LABELS[status] || status}{detail}</span>;
}
