/**
 * Secrets Manager Utility
 *
 * Securely loads secrets at runtime:
 * - In GCP: Fetches from Secret Manager
 * - Locally: Uses environment variables (.env file)
 *
 * This prevents secrets from being embedded in configuration files.
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const logger = require('./logger');

// Cache for loaded secrets (in-memory, per instance)
const secretsCache = {};

/**
 * Detect if running in GCP (App Engine, Cloud Run, Cloud Functions)
 * @returns {boolean} True if running in GCP
 */
function isGCP() {
  // Check for GCP-specific environment variables (set automatically by GCP)
  // GAE_ENV is set by App Engine (both prod and dev services)
  // K_SERVICE is set by Cloud Run
  // FUNCTION_TARGET is set by Cloud Functions
  // These are NEVER set in local development
  return !!(process.env.GAE_ENV || process.env.K_SERVICE || process.env.FUNCTION_TARGET);
}

/**
 * Get the GCP project ID
 * @returns {string} Project ID
 */
function getProjectId() {
  // Extract from GAE_APPLICATION (format: s~project-id or e~project-id)
  // This is automatically set by App Engine
  if (process.env.GAE_APPLICATION) {
    const parts = process.env.GAE_APPLICATION.split('~');
    if (parts.length > 1) {
      return parts[1];
    }
  }

  throw new Error('Could not determine GCP project ID. GAE_APPLICATION environment variable not found or invalid format.');
}

/**
 * Fetch a secret from GCP Secret Manager
 * @param {string} secretName - Name of the secret
 * @returns {Promise<string>} Secret value
 */
async function fetchSecretFromGCP(secretName) {
  const client = new SecretManagerServiceClient();
  const projectId = getProjectId();
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  try {
    logger.debug({ secretName }, 'Fetching secret from Secret Manager');
    const [version] = await client.accessSecretVersion({ name });
    const secretValue = version.payload.data.toString('utf8');
    logger.info({ secretName, length: secretValue.length }, 'Successfully loaded secret');
    return secretValue;
  } catch (error) {
    logger.error({ err: error, secretName }, 'Failed to fetch secret');
    throw new Error(`Failed to fetch secret ${secretName}: ${error.message}`);
  }
}

/**
 * Load a secret (from Secret Manager or environment)
 * @param {string} secretName - Name of the secret
 * @param {string} envVarName - Environment variable name (for local dev)
 * @returns {Promise<string>} Secret value
 */
async function loadSecret(secretName, envVarName) {
  // Return cached value if available
  if (secretsCache[secretName]) {
    return secretsCache[secretName];
  }

  let secretValue;

  if (isGCP()) {
    // Production: Fetch from Secret Manager
    secretValue = await fetchSecretFromGCP(secretName);
  } else {
    // Local development: Use environment variable
    secretValue = process.env[envVarName];
    if (!secretValue) {
      throw new Error(`Environment variable ${envVarName} not set. Check your .env file.`);
    }
    logger.debug({ secretName }, 'Loaded secret from local environment variable');
  }

  // Cache the secret
  secretsCache[secretName] = secretValue;
  return secretValue;
}

/**
 * Load all required secrets for the backend
 * @returns {Promise<Object>} Object containing all secrets
 */
async function loadAllSecrets() {
  const environment = isGCP() ? 'GCP' : 'local';
  logger.info({ environment }, 'Loading secrets');

  try {
    const [firebaseServiceAccount, geminiApiKey, frontendUrl] = await Promise.all([
      loadSecret('FIREBASE_SERVICE_ACCOUNT', 'FIREBASE_SERVICE_ACCOUNT'),
      loadSecret('GEMINI_API_KEY', 'GEMINI_API_KEY'),
      loadSecret('FRONTEND_URL', 'FRONTEND_URL')
    ]);

    logger.info('All secrets loaded successfully');

    return {
      firebaseServiceAccount,
      geminiApiKey,
      frontendUrl
    };
  } catch (error) {
    logger.error({ err: error }, 'Failed to load secrets');
    throw error;
  }
}

module.exports = {
  loadAllSecrets,
  isGCP,
  getProjectId
};
