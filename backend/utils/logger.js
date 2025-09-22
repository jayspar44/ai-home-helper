/**
 * Environment-based Logger Utility
 * Provides structured logging for development and production environments
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = {
  /**
   * Debug level logging - only shows in development
   * @param {string} message - Log message
   * @param {any} data - Optional data object
   */
  debug: (message, data) => {
    if (isDevelopment) {
      console.log('🔍 DEBUG:', message, data || '');
    }
    // In production: silent (debug logs are not needed)
  },

  /**
   * Info level logging - formatted differently for dev vs prod
   * @param {string} message - Log message
   * @param {any} data - Optional data object
   */
  info: (message, data) => {
    if (isDevelopment) {
      console.log('ℹ️  INFO:', message, data || '');
    } else {
      // Production: structured JSON logging for Railway
      console.log(JSON.stringify({
        level: 'info',
        message,
        data,
        timestamp: new Date().toISOString()
      }));
    }
  },

  /**
   * Warning level logging
   * @param {string} message - Log message
   * @param {any} data - Optional data object
   */
  warn: (message, data) => {
    if (isDevelopment) {
      console.warn('⚠️  WARN:', message, data || '');
    } else {
      console.warn(JSON.stringify({
        level: 'warn',
        message,
        data,
        timestamp: new Date().toISOString()
      }));
    }
  },

  /**
   * Error level logging - always logged with full details
   * @param {string} message - Error message
   * @param {Error|any} error - Error object or additional data
   */
  error: (message, error) => {
    if (isDevelopment) {
      console.error('❌ ERROR:', message, error);
    } else {
      // Production: structured JSON logging with error details
      console.error(JSON.stringify({
        level: 'error',
        message,
        error: error?.message || error,
        stack: error?.stack,
        timestamp: new Date().toISOString()
      }));
    }
  },

  /**
   * Success level logging - for important positive outcomes
   * @param {string} message - Success message
   * @param {any} data - Optional data object
   */
  success: (message, data) => {
    if (isDevelopment) {
      console.log('✅ SUCCESS:', message, data || '');
    } else {
      console.log(JSON.stringify({
        level: 'success',
        message,
        data,
        timestamp: new Date().toISOString()
      }));
    }
  }
};

module.exports = logger;