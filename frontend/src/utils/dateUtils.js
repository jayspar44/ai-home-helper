/**
 * Utility functions for handling expiry dates and calculations
 */
import { AlertTriangle, Clock } from 'lucide-react';

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
      icon: AlertTriangle,
      isExpired: true,
      isExpiringSoon: false,
      remainingDays
    };
  }

  if (remainingDays <= 3) {
    return {
      text: `${remainingDays} day${remainingDays === 1 ? '' : 's'} left`,
      color: 'var(--color-warning)',
      icon: Clock,
      isExpired: false,
      isExpiringSoon: true,
      remainingDays
    };
  }

  if (remainingDays <= 7) {
    return {
      text: `${remainingDays} days left`,
      color: 'var(--color-warning-light)',
      icon: Clock,
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

/**
 * Format a date as relative time (e.g., "2hr ago", "3 days ago")
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted relative time
 */
export const formatRelativeTime = (date) => {
  if (!date || !isValidDate(date)) return 'Unknown';

  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}min ago`;
  if (diffHours < 24) return `${diffHours}hr ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};
/**
 * Format a date for API calls (YYYY-MM-DD)
 * Used for timezone-independent date handling in meal planner
 * @param {Date} date - The date to format
 * @returns {string} - Date string in YYYY-MM-DD format
 */
export const formatDateForAPI = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get suggested meal type based on current time of day
 * Uses time boundaries to intelligently suggest appropriate meal types
 * @returns {string} - One of 'breakfast', 'lunch', 'dinner', or 'snacks'
 */
export const getMealTypeByTime = () => {
  const currentHour = new Date().getHours();
  
  // Import constants inline to avoid circular dependencies
  const BREAKFAST_CUTOFF = 10;
  const LUNCH_CUTOFF = 15;
  const DINNER_CUTOFF = 21;
  
  if (currentHour < BREAKFAST_CUTOFF) return 'breakfast';
  if (currentHour < LUNCH_CUTOFF) return 'lunch';
  if (currentHour < DINNER_CUTOFF) return 'dinner';
  return 'snacks';
};
