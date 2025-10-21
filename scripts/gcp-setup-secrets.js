#!/usr/bin/env node

/**
 * GCP Secret Manager Setup Helper
 *
 * This script helps you set up secrets in GCP Secret Manager
 * and configure IAM permissions for App Engine to access them.
 *
 * Usage:
 *   node scripts/gcp-setup-secrets.js
 *
 * Or via npm:
 *   npm run gcp:setup:secrets
 */

const { execSync } = require('child_process');
const readline = require('readline');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ERROR: ${message}`, 'red');
  process.exit(1);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  log(`\n🔐 GCP Secret Manager Setup`, 'bright');
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, 'blue');

  // Step 1: Check gcloud CLI
  info('Checking gcloud CLI installation...');
  try {
    execSync('gcloud version', { stdio: 'ignore' });
    success('gcloud CLI found');
  } catch (err) {
    error('gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install');
  }

  // Step 2: Get project ID
  info('Getting GCP project ID...');
  let projectId;
  try {
    projectId = execSync('gcloud config get-value project', { encoding: 'utf-8' }).trim();
    if (!projectId || projectId === '(unset)') {
      error('No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID');
    }
    success(`Project ID: ${projectId}\n`);
  } catch (err) {
    error('Failed to get project ID');
  }

  // Step 3: Check existing secrets
  log(`📋 Checking existing secrets in project...`, 'bright');
  const requiredSecrets = [
    {
      name: 'FIREBASE_SERVICE_ACCOUNT',
      description: 'Firebase Admin SDK service account JSON (backend)',
      type: 'JSON'
    },
    {
      name: 'GEMINI_API_KEY',
      description: 'Google Gemini API key (backend)',
      type: 'string'
    },
    {
      name: 'FRONTEND_URL',
      description: 'Frontend URL for CORS (backend)',
      type: 'string'
    },
    {
      name: 'REACT_APP_FIREBASE_CONFIG',
      description: 'Firebase client config JSON (frontend build-time)',
      type: 'JSON'
    }
  ];

  const existingSecrets = new Set();
  try {
    const secretsList = execSync(
      `gcloud secrets list --project="${projectId}" --format="value(name)"`,
      { encoding: 'utf-8' }
    ).trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    secretsList.forEach(s => existingSecrets.add(s));
  } catch (err) {
    warning('Could not list existing secrets. Make sure Secret Manager API is enabled.');
  }

  log('');
  for (const secret of requiredSecrets) {
    if (existingSecrets.has(secret.name)) {
      success(`✓ ${secret.name} exists`);
    } else {
      warning(`✗ ${secret.name} does not exist`);
    }
  }

  log('');
  const answer = await question('Would you like to create/update secrets now? (y/n): ');
  if (answer.toLowerCase() !== 'y') {
    info('Skipping secret creation. Run this script again when ready.');
    rl.close();
    return;
  }

  // Step 4: Create/update secrets
  log(`\n🔧 Setting up secrets...`, 'bright');

  for (const secret of requiredSecrets) {
    log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'blue');
    log(`📝 ${secret.name}`, 'bright');
    info(`   ${secret.description}`);
    info(`   Type: ${secret.type}`);

    if (existingSecrets.has(secret.name)) {
      const update = await question(`   Secret exists. Update it? (y/n): `);
      if (update.toLowerCase() !== 'y') {
        info(`   Skipping ${secret.name}`);
        continue;
      }
    }

    log('');
    info('   Enter the secret value (paste and press Enter):');
    info('   For JSON values, paste the entire JSON object on one line.');

    if (secret.type === 'JSON') {
      info('   Tip: Remove newlines from JSON: cat file.json | jq -c');
    }

    const value = await question('   Value: ');

    if (!value.trim()) {
      warning(`   Skipping empty value for ${secret.name}`);
      continue;
    }

    // Validate JSON if needed
    if (secret.type === 'JSON') {
      try {
        JSON.parse(value);
        success('   ✓ Valid JSON format');
      } catch (err) {
        warning(`   ✗ Invalid JSON format. Skipping ${secret.name}`);
        warning(`     Error: ${err.message}`);
        continue;
      }
    }

    // Create or update secret
    try {
      if (existingSecrets.has(secret.name)) {
        // Update existing secret (add new version)
        info(`   Updating ${secret.name}...`);
        execSync(
          `echo '${value.replace(/'/g, "'\\''")}' | gcloud secrets versions add ${secret.name} --data-file=-`,
          { stdio: 'ignore' }
        );
        success(`   ✓ ${secret.name} updated`);
      } else {
        // Create new secret
        info(`   Creating ${secret.name}...`);
        execSync(
          `echo '${value.replace(/'/g, "'\\''")}' | gcloud secrets create ${secret.name} --data-file=- --replication-policy=automatic`,
          { stdio: 'ignore' }
        );
        success(`   ✓ ${secret.name} created`);
      }

      existingSecrets.add(secret.name);
    } catch (err) {
      warning(`   ✗ Failed to create/update ${secret.name}`);
      warning(`     Error: ${err.message}`);
    }
  }

  // Step 5: Set up IAM permissions
  log(`\n🔐 Setting up IAM permissions...`, 'bright');
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, 'blue');

  const serviceAccount = `${projectId}@appspot.gserviceaccount.com`;
  info(`Service Account: ${serviceAccount}`);

  // Backend runtime secrets (not including REACT_APP_FIREBASE_CONFIG which is build-time only)
  const backendSecrets = ['FIREBASE_SERVICE_ACCOUNT', 'GEMINI_API_KEY', 'FRONTEND_URL'];

  for (const secretName of backendSecrets) {
    if (!existingSecrets.has(secretName)) {
      warning(`Skipping ${secretName} (not created yet)`);
      continue;
    }

    try {
      info(`Granting access to ${secretName}...`);
      execSync(
        `gcloud secrets add-iam-policy-binding ${secretName} ` +
        `--member="serviceAccount:${serviceAccount}" ` +
        `--role="roles/secretmanager.secretAccessor" ` +
        `--project="${projectId}"`,
        { stdio: 'ignore' }
      );
      success(`✓ ${secretName} - IAM permission granted`);
    } catch (err) {
      warning(`✗ Failed to grant access to ${secretName}`);
    }
  }

  // Note about REACT_APP_FIREBASE_CONFIG
  log('');
  info('Note: REACT_APP_FIREBASE_CONFIG is a build-time secret');
  info('      It will be accessed by Cloud Build during deployment');
  info('      IAM permissions for Cloud Build are handled separately');

  // Step 6: Summary
  log(`\n📊 Setup Summary`, 'bright');
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, 'blue');

  success(`Project: ${projectId}`);
  success(`Secrets configured: ${existingSecrets.size}/${requiredSecrets.length}`);
  success(`Service Account: ${serviceAccount}`);

  log(`\n📝 Next Steps:`, 'bright');
  info(`  1. Verify secrets: gcloud secrets list --project=${projectId}`);
  info(`  2. Deploy to dev: npm run gcp:deploy:dev:secrets`);
  info(`  3. Deploy to prod: npm run gcp:deploy:prod:secrets`);

  log(`\n💡 Useful Commands:`, 'bright');
  info(`  List secrets:     gcloud secrets list`);
  info(`  View secret:      gcloud secrets versions access latest --secret=SECRET_NAME`);
  info(`  Update secret:    echo 'new-value' | gcloud secrets versions add SECRET_NAME --data-file=-`);

  log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, 'blue');
  success('Secret setup complete! 🎉\n');

  rl.close();
}

main().catch(err => {
  error(`Unexpected error: ${err.message}`);
  rl.close();
});
