/**
 * Pino Logger Configuration
 * Provides structured logging for development and production environments
 * with automatic sensitive data redaction
 */

const pino = require('pino');

const isDevelopment = process.env.NODE_ENV !== 'production';

// Configure Pino logger
const logger = pino({
  // Log level: debug in development, info in production
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  // Redact sensitive fields from logs
  redact: {
    paths: [
      'token',
      'idToken',
      'authorization',
      'bearer',
      'apiKey',
      'geminiApiKey',
      'serviceAccount',
      'password',
      'req.headers.authorization',
      '*.token',
      '*.idToken',
      '*.authorization',
      '*.password',
      '*.apiKey',
      '*.secret',
      '*.privateKey',
      'req.body.token',
      'req.body.password',
      'req.body.apiKey',
      'req.body.*.token',
      'req.body.*.password',
      'req.body.*.apiKey'
    ],
    remove: true // Completely remove sensitive fields
  },

  // Development: Pretty formatted logs with colors
  // Production: Structured JSON for GCP Cloud Logging
  // Safe transport configuration with fallback
  transport: (() => {
    if (!isDevelopment) return undefined;

    try {
      // Check if pino-pretty is available before using it
      require.resolve('pino-pretty');
      return {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false
        }
      };
    } catch {
      // pino-pretty not available - fallback to JSON logging
      // This prevents crashes if NODE_ENV=development but pino-pretty not installed
      return undefined;
    }
  })(),

  // Map Pino levels to GCP Cloud Logging severity
  formatters: !isDevelopment ? {
    level: (label) => {
      return { severity: label.toUpperCase() };
    }
  } : undefined
});

module.exports = logger;
