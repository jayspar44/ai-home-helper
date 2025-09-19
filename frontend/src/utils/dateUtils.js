/**
 * Utility functions for handling expiry dates and calculations
 */

/**
 * Check if a date is valid
 * @param {any} date - The date to check
 * @returns {boolean} - True if valid date
 */
export const isValidDate = (date) => {
  if (!date) return false;
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

/**
 * Safely convert a date to ISO string format for date inputs
 * @param {string|Date} date - The date to convert
 * @returns {string} - ISO date string or empty string if invalid
 */
export const safeToDateInputValue = (date) => {
  if (!date || !isValidDate(date)) return '';
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch (error) {
    return '';
  }
};

/**
 * Calculate remaining days until expiry from an expiry date
 * @param {string|Date} expiresAt - The expiry date
 * @returns {number|null} - Days remaining (negative if expired), null if invalid
 */
export const calculateRemainingDays = (expiresAt) => {
  if (!expiresAt || !isValidDate(expiresAt)) return null;

  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get expiry information for display
 * @param {Object} item - The pantry item
 * @returns {Object} - Expiry info with text, color, status flags
 */
export const getExpiryInfo = (item) => {
  // Handle both missing expiresAt and empty string case, but also check for daysUntilExpiry as fallback
  if (!item.expiresAt && !item.daysUntilExpiry) {
    return {
      text: 'No expiry date',
      color: 'var(--text-muted)',
      icon: null,
      isExpired: false,
      isExpiringSoon: false,
      remainingDays: null
    };
  }

  // Use expiresAt if available, otherwise fall back to daysUntilExpiry
  const expiryDate = item.expiresAt || (item.daysUntilExpiry ? daysToExpiryDate(item.daysUntilExpiry) : null);
  const remainingDays = calculateRemainingDays(expiryDate);

  // Handle invalid dates
  if (remainingDays === null) {
    return {
      text: 'Invalid expiry date',
      color: 'var(--text-muted)',
      icon: null,
      isExpired: false,
      isExpiringSoon: false,
      remainingDays: null
    };
  }

  if (remainingDays <= 0) {
    return {
      text: 'Expired!',
      color: 'var(--color-error)',
      icon: 'AlertTriangle',
      isExpired: true,
      isExpiringSoon: false,
      remainingDays
    };
  }

  if (remainingDays <= 3) {
    return {
      text: `${remainingDays} day${remainingDays === 1 ? '' : 's'} left`,
      color: 'var(--color-warning)',
      icon: 'Clock',
      isExpired: false,
      isExpiringSoon: true,
      remainingDays
    };
  }

  if (remainingDays <= 7) {
    return {
      text: `${remainingDays} days left`,
      color: 'var(--color-warning-light)',
      icon: 'Clock',
      isExpired: false,
      isExpiringSoon: true,
      remainingDays
    };
  }

  return {
    text: `${remainingDays} days left`,
    color: 'var(--text-secondary)',
    icon: null,
    isExpired: false,
    isExpiringSoon: false,
    remainingDays
  };
};

/**
 * Get expiry status for filtering
 * @param {Object} item - The pantry item
 * @returns {string} - 'expired', 'expiring-soon', 'fresh', or 'unknown'
 */
export const getExpiryStatus = (item) => {
  if (!item.expiresAt && !item.daysUntilExpiry) {
    return 'unknown';
  }

  // Use expiresAt if available, otherwise fall back to daysUntilExpiry
  const expiryDate = item.expiresAt || (item.daysUntilExpiry ? daysToExpiryDate(item.daysUntilExpiry) : null);
  const remainingDays = calculateRemainingDays(expiryDate);

  if (remainingDays === null) return 'unknown';
  if (remainingDays <= 0) return 'expired';
  if (remainingDays <= 7) return 'expiring-soon';
  return 'fresh';
};

/**
 * Convert days to future expiry date
 * @param {number} daysFromNow - Number of days from now
 * @returns {Date} - Future date
 */
export const daysToExpiryDate = (daysFromNow) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

/**
 * Convert expiry date to days from now
 * @param {string|Date} expiresAt - The expiry date
 * @returns {number} - Days from now
 */
export const expiryDateToDays = (expiresAt) => {
  return calculateRemainingDays(expiresAt);
};