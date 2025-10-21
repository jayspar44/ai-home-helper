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

// Cache for loaded secrets (in-memory, per instance)
const secretsCache = {};

/**
 * Detect if running in GCP App Engine
 * @returns {boolean} True if running in GCP
 */
function isGCP() {
  return process.env.NODE_ENV === 'production' &&
         (process.env.GAE_ENV || process.env.K_SERVICE || process.env.FUNCTION_TARGET);
}

/**
 * Get the GCP project ID
 * @returns {string} Project ID
 */
function getProjectId() {
  // Try environment variable first (set in app.yaml)
  if (process.env.GCP_PROJECT_ID) {
    return process.env.GCP_PROJECT_ID;
  }

  // Fallback: Try to extract from GAE_APPLICATION (format: s~project-id or e~project-id)
  if (process.env.GAE_APPLICATION) {
    const parts = process.env.GAE_APPLICATION.split('~');
    if (parts.length > 1) {
      return parts[1];
    }
  }

  throw new Error('Could not determine GCP project ID. Set GCP_PROJECT_ID environment variable.');
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
    console.log(`🔐 Fetching secret: ${secretName} from Secret Manager...`);
    const [version] = await client.accessSecretVersion({ name });
    const secretValue = version.payload.data.toString('utf8');
    console.log(`✅ Successfully loaded secret: ${secretName} (${secretValue.length} characters)`);
    return secretValue;
  } catch (error) {
    console.error(`❌ Failed to fetch secret ${secretName}:`, error.message);
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
    console.log(`🔓 Loaded ${secretName} from local environment variable`);
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
  console.log(`\n🔐 Loading secrets (environment: ${isGCP() ? 'GCP' : 'local'})...`);

  try {
    const [firebaseServiceAccount, geminiApiKey, frontendUrl] = await Promise.all([
      loadSecret('FIREBASE_SERVICE_ACCOUNT', 'FIREBASE_SERVICE_ACCOUNT'),
      loadSecret('GEMINI_API_KEY', 'GEMINI_API_KEY'),
      loadSecret('FRONTEND_URL', 'FRONTEND_URL')
    ]);

    console.log('✅ All secrets loaded successfully\n');

    return {
      firebaseServiceAccount,
      geminiApiKey,
      frontendUrl
    };
  } catch (error) {
    console.error('❌ Failed to load secrets:', error.message);
    throw error;
  }
}

module.exports = {
  loadAllSecrets,
  isGCP
};
