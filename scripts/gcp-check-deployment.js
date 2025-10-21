#!/usr/bin/env node

/**
 * GCP Deployment Readiness Checker
 *
 * This script checks if your GCP project is ready for deployment:
 * - Verifies gcloud CLI setup
 * - Checks App Engine status
 * - Validates secrets exist
 * - Tests IAM permissions
 * - Checks frontend build
 *
 * Usage:
 *   node scripts/gcp-check-deployment.js
 *
 * Or via npm:
 *   npm run gcp:check:ready
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function fail(message) {
  log(`❌ ${message}`, 'red');
}

let checksTotal = 0;
let checksPassed = 0;
let checksFailed = 0;
let checksWarning = 0;

function check(description, testFn) {
  checksTotal++;
  try {
    const result = testFn();
    if (result === 'warning') {
      checksWarning++;
      warning(`${description}`);
    } else if (result === true) {
      checksPassed++;
      success(`${description}`);
    } else {
      checksFailed++;
      fail(`${description}`);
    }
  } catch (err) {
    checksFailed++;
    fail(`${description}`);
    if (err.message) {
      log(`   ${err.message}`, 'red');
    }
  }
}

log(`\n🔍 GCP Deployment Readiness Check`, 'bright');
log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, 'blue');

// Check 1: gcloud CLI
log(`\n📦 Prerequisites`, 'bright');
check('gcloud CLI installed', () => {
  execSync('gcloud version', { stdio: 'ignore' });
  return true;
});

// Check 2: Project configured
let projectId;
check('GCP project configured', () => {
  projectId = execSync('gcloud config get-value project', { encoding: 'utf-8' }).trim();
  if (!projectId || projectId === '(unset)') {
    throw new Error('No project set. Run: gcloud config set project YOUR_PROJECT_ID');
  }
  log(`   Project: ${projectId}`, 'cyan');
  return true;
});

// Check 3: Authenticated
check('gcloud authenticated', () => {
  const account = execSync('gcloud config get-value account', { encoding: 'utf-8' }).trim();
  if (!account || account === '(unset)') {
    throw new Error('Not authenticated. Run: gcloud auth login');
  }
  log(`   Account: ${account}`, 'cyan');
  return true;
});

// Check 4: App Engine
log(`\n🏗️  App Engine`, 'bright');
check('App Engine app exists', () => {
  try {
    const appInfo = execSync(
      `gcloud app describe --project="${projectId}" --format="value(locationId)"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    if (appInfo) {
      log(`   Region: ${appInfo}`, 'cyan');
      return true;
    }
  } catch (err) {
    throw new Error('App Engine app not created. Run: gcloud app create');
  }
});

// Check 5: App Engine APIs enabled
check('App Engine Admin API enabled', () => {
  try {
    execSync(
      `gcloud services list --enabled --filter="name:appengine.googleapis.com" --format="value(name)" --project="${projectId}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    return true;
  } catch (err) {
    throw new Error('Enable it: gcloud services enable appengine.googleapis.com');
  }
});

// Check 6: Cloud Build API enabled
check('Cloud Build API enabled', () => {
  try {
    const result = execSync(
      `gcloud services list --enabled --filter="name:cloudbuild.googleapis.com" --format="value(name)" --project="${projectId}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    if (!result) {
      throw new Error('Enable it: gcloud services enable cloudbuild.googleapis.com');
    }
    return true;
  } catch (err) {
    throw new Error('Enable it: gcloud services enable cloudbuild.googleapis.com');
  }
});

// Check 7: Secret Manager API enabled
check('Secret Manager API enabled', () => {
  try {
    const result = execSync(
      `gcloud services list --enabled --filter="name:secretmanager.googleapis.com" --format="value(name)" --project="${projectId}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    if (!result) {
      throw new Error('Enable it: gcloud services enable secretmanager.googleapis.com');
    }
    return true;
  } catch (err) {
    throw new Error('Enable it: gcloud services enable secretmanager.googleapis.com');
  }
});

// Check 8: Configuration files
log(`\n📄 Configuration Files`, 'bright');
check('app.yaml exists', () => {
  if (!fs.existsSync('app.yaml')) {
    throw new Error('app.yaml not found in project root');
  }
  return true;
});

check('app-dev.yaml exists', () => {
  if (!fs.existsSync('app-dev.yaml')) {
    throw new Error('app-dev.yaml not found in project root');
  }
  return true;
});

check('cloudbuild.yaml exists', () => {
  if (!fs.existsSync('cloudbuild.yaml')) {
    throw new Error('cloudbuild.yaml not found in project root');
  }
  return true;
});

check('.gcloudignore exists', () => {
  if (!fs.existsSync('.gcloudignore')) {
    log('   .gcloudignore missing (optional but recommended)', 'yellow');
    return 'warning';
  }
  return true;
});

// Check 9: Secrets
log(`\n🔐 Secrets (Secret Manager)`, 'bright');
const requiredSecrets = [
  'FIREBASE_SERVICE_ACCOUNT',
  'GEMINI_API_KEY',
  'FRONTEND_URL',
  'REACT_APP_FIREBASE_CONFIG'
];

let existingSecrets = [];
try {
  existingSecrets = execSync(
    `gcloud secrets list --project="${projectId}" --format="value(name)"`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
  ).trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean);
} catch (err) {
  // Secret Manager API might not be enabled
}

for (const secretName of requiredSecrets) {
  check(`${secretName} secret exists`, () => {
    if (!existingSecrets.includes(secretName)) {
      throw new Error(`Create it: npm run gcp:setup:secrets`);
    }
    return true;
  });
}

// Check 10: IAM Permissions
log(`\n🔑 IAM Permissions`, 'bright');
const serviceAccount = `${projectId}@appspot.gserviceaccount.com`;
const backendSecrets = ['FIREBASE_SERVICE_ACCOUNT', 'GEMINI_API_KEY', 'FRONTEND_URL'];

for (const secretName of backendSecrets) {
  if (!existingSecrets.includes(secretName)) continue;

  check(`${secretName} - App Engine has access`, () => {
    try {
      const policy = execSync(
        `gcloud secrets get-iam-policy ${secretName} --project="${projectId}" --format=json`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      const policyObj = JSON.parse(policy);
      const hasAccess = policyObj.bindings?.some(binding =>
        binding.role === 'roles/secretmanager.secretAccessor' &&
        binding.members?.some(m => m.includes(serviceAccount))
      );
      if (!hasAccess) {
        throw new Error('Grant access: npm run gcp:setup:secrets');
      }
      return true;
    } catch (err) {
      throw new Error('Grant access: npm run gcp:setup:secrets');
    }
  });
}

// Check 11: Frontend Build
log(`\n⚛️  Frontend`, 'bright');
check('Frontend build exists', () => {
  const buildPath = path.join('frontend', 'build', 'index.html');
  if (!fs.existsSync(buildPath)) {
    log('   Build missing. Run: npm run build:frontend', 'yellow');
    return 'warning';
  }

  // Check build age
  const stats = fs.statSync(buildPath);
  const ageMinutes = (Date.now() - stats.mtimeMs) / 1000 / 60;
  if (ageMinutes > 60) {
    log(`   Build is ${Math.floor(ageMinutes)} minutes old (consider rebuilding)`, 'yellow');
    return 'warning';
  }

  return true;
});

check('Frontend dependencies installed', () => {
  const nodeModulesPath = path.join('frontend', 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    throw new Error('Run: cd frontend && npm install');
  }
  return true;
});

// Check 12: Backend
log(`\n⚙️  Backend`, 'bright');
check('Backend dependencies installed', () => {
  const nodeModulesPath = path.join('backend', 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    throw new Error('Run: cd backend && npm install');
  }
  return true;
});

check('Backend entry point exists', () => {
  if (!fs.existsSync(path.join('backend', 'server.js'))) {
    throw new Error('backend/server.js not found');
  }
  return true;
});

// Summary
log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'blue');
log(`\n📊 Summary`, 'bright');
log(`   Total checks: ${checksTotal}`);
success(`   Passed: ${checksPassed}`);
if (checksWarning > 0) warning(`   Warnings: ${checksWarning}`);
if (checksFailed > 0) fail(`   Failed: ${checksFailed}`);

log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, 'blue');

if (checksFailed === 0) {
  if (checksWarning === 0) {
    success('🎉 All checks passed! Ready to deploy!');
    log('');
    info('Deploy commands:');
    info('  Dev:  npm run gcp:deploy:dev:secrets');
    info('  Prod: npm run gcp:deploy:prod:secrets');
  } else {
    warning('⚠️  Some warnings found, but deployment should work');
    log('');
    info('Fix warnings (optional) or proceed with deployment:');
    info('  Dev:  npm run gcp:deploy:dev:secrets');
    info('  Prod: npm run gcp:deploy:prod:secrets');
  }
} else {
  fail('❌ Some checks failed. Please fix the issues above before deploying.');
  log('');
  info('Common fixes:');
  info('  • Set up secrets: npm run gcp:setup:secrets');
  info('  • Install dependencies: npm run install-all');
  info('  • Build frontend: npm run build:frontend');
  info('  • Enable APIs: gcloud services enable appengine.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com');
  process.exit(1);
}

log('');
