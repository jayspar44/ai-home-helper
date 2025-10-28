/**
 * Frontend Logger Utility
 *
 * Simple environment-aware logger for browser console:
 * - Development: All logs visible (debug, info, warn, error)
 * - Production: Only errors visible (reduces noise)
 *
 * Zero dependencies - keeps frontend bundle small
 */

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  /**
   * Debug level - only shows in development
   * Use for detailed debugging info
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Info level - only shows in development
   * Use for general information
   */
  info: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Warning level - only shows in development
   * Use for potential issues
   */
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Error level - always shows (dev and prod)
   * Use for actual errors that need debugging
   */
  error: (...args) => {
    console.error(...args);
  }
};

export default logger;
