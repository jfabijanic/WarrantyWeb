const SOON_THRESHOLD_DAYS = 30;

/**
 * Computes warranty end date (ISO yyyy-mm-dd) from a purchase date and duration in months.
 */
function computeWarrantyEndDate(purchaseDate, warrantyMonths) {
  const d = new Date(purchaseDate);
  d.setMonth(d.getMonth() + Number(warrantyMonths));
  return d.toISOString().slice(0, 10);
}

/**
 * Returns number of whole days between today and the warranty end date.
 * Positive = days remaining, negative = days since expiry.
 */
function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - today) / (1000 * 60 * 60 * 24));
}

/**
 * Classifies a warranty end date into 'active', 'soon', or 'expired',
 * and attaches the remaining/elapsed day count.
 */
function getWarrantyStatus(warrantyEndDate) {
  const daysLeft = daysUntil(warrantyEndDate);
  let status;
  if (daysLeft < 0) {
    status = 'expired';
  } else if (daysLeft <= SOON_THRESHOLD_DAYS) {
    status = 'soon';
  } else {
    status = 'active';
  }
  return { status, daysLeft };
}

module.exports = { computeWarrantyEndDate, getWarrantyStatus, SOON_THRESHOLD_DAYS };
