#!/usr/bin/env node

/**
 * GCP Deployment Helper Script (Cloud Build Method)
 *
 * This script:
 * 1. Generates app.yaml from template (replacing PROJECT_ID only)
 * 2. Triggers Cloud Build deployment (cloudbuild.yaml)
 *    - Cloud Build installs dependencies
 *    - Cloud Build builds frontend with REACT_APP_FIREBASE_CONFIG from Secret Manager
 *    - Cloud Build deploys to App Engine
 * 3. Backend fetches secrets from Secret Manager at runtime (secure!)
 * 4. Handles both dev and prod environments
 *
 * Usage:
 *   node scripts/gcp-deploy.js dev
 *   node scripts/gcp-deploy.js prod
 *
 * Or via npm:
 *   npm run gcp:deploy:dev
 *   npm run gcp:deploy:prod
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for pretty output
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

/**
 * Generate app.yaml from template by replacing PROJECT_ID placeholder
 * @param {string} templateFile - Template file path (e.g., 'app.yaml.template')
 * @param {string} outputFile - Output file path (e.g., 'app.yaml')
 * @param {string} projectId - GCP project ID to inject
 */
function generateConfig(templateFile, outputFile, projectId) {
  const templatePath = path.join(process.cwd(), templateFile);
  const outputPath = path.join(process.cwd(), outputFile);

  // Check if template exists
  if (!fs.existsSync(templatePath)) {
    error(`Template file not found: ${templateFile}`);
  }

  // Read template
  let content;
  try {
    content = fs.readFileSync(templatePath, 'utf-8');
  } catch (err) {
    error(`Failed to read template: ${err.message}`);
  }

  // Replace PROJECT_ID with actual project ID
  const generated = content.replace(/PROJECT_ID/g, projectId);

  // Write generated config (NO SECRETS - backend loads them at runtime!)
  try {
    fs.writeFileSync(outputPath, generated, 'utf-8');
  } catch (err) {
    error(`Failed to write config file: ${err.message}`);
  }
}

// Get environment from command line argument
const environment = process.argv[2];

if (!environment || !['dev', 'prod'].includes(environment)) {
  error('Please specify environment: dev or prod\nUsage: node scripts/gcp-deploy.js [dev|prod]');
}

const isDev = environment === 'dev';
const appYaml = isDev ? 'app-dev.yaml' : 'app.yaml';
const serviceName = isDev ? 'dev' : 'default';

log(`\n🚀 Starting GCP App Engine Deployment`, 'bright');
log(`📦 Environment: ${environment.toUpperCase()}`, 'bright');
log(`📄 Config file: ${appYaml}`, 'bright');
log(`🏷️  Service: ${serviceName}\n`, 'bright');

// Step 1: Check if gcloud CLI is installed
info('Checking gcloud CLI installation...');
try {
  execSync('gcloud version', { stdio: 'ignore' });
  success('gcloud CLI found');
} catch (err) {
  error('gcloud CLI not found. Please install: https://cloud.google.com/sdk/docs/install');
}

// Step 2: Get current project ID
info('Getting GCP project ID...');
let projectId;

// Try to read from .env.gcp first (preferred)
const envGcpPath = path.join(process.cwd(), '.env.gcp');
if (fs.existsSync(envGcpPath)) {
  try {
    const envContent = fs.readFileSync(envGcpPath, 'utf-8');
    const match = envContent.match(/GCP_PROJECT_ID=(.+)/);
    if (match && match[1]) {
      projectId = match[1].trim();
      success(`Project ID from .env.gcp: ${projectId}`);
    }
  } catch (err) {
    // Fall through to gcloud config
  }
}

// Fallback to gcloud config
if (!projectId) {
  try {
    projectId = execSync('gcloud config get-value project', { encoding: 'utf-8' }).trim();
    if (!projectId || projectId === '(unset)') {
      error('No GCP project set.\n' +
            'Either:\n' +
            '  1. Create .env.gcp with GCP_PROJECT_ID=your-project-id\n' +
            '  2. Run: gcloud config set project YOUR_PROJECT_ID');
    }
    success(`Project ID from gcloud config: ${projectId}`);
  } catch (err) {
    error('Failed to get project ID.\n' +
          'Either:\n' +
          '  1. Create .env.gcp with GCP_PROJECT_ID=your-project-id\n' +
          '  2. Run: gcloud config set project YOUR_PROJECT_ID');
  }
}

// Step 2.5: Generate app.yaml from template (PROJECT_ID only, NO SECRETS!)
log(`\n📝 Generating configuration from template...`, 'bright');
const templateFile = isDev ? 'app-dev.yaml.template' : 'app.yaml.template';
info(`Reading template: ${templateFile}`);
info(`Injecting project ID: ${projectId}`);
generateConfig(templateFile, appYaml, projectId);
success(`Generated ${appYaml} with project ID\n`);

info('🔐 NOTE: Secrets are NOT in app.yaml (secure!)');
info('   Backend fetches them from Secret Manager at runtime\n');



// Step 4: Verify generated app.yaml exists
const appYamlPath = path.join(process.cwd(), appYaml);
if (!fs.existsSync(appYamlPath)) {
  error(`${appYaml} not found - generation may have failed`);
}

success(`Verified ${appYaml} exists`);

// Step 4: Verify cloudbuild.yaml exists
info('Verifying cloudbuild.yaml...');
const cloudbuildPath = path.join(process.cwd(), 'cloudbuild.yaml');
if (!fs.existsSync(cloudbuildPath)) {
  error('cloudbuild.yaml not found. Cannot proceed with Cloud Build deployment.');
}
success('cloudbuild.yaml found');

// Step 5: Deploy using Cloud Build
log(`\n🚀 Starting Cloud Build deployment (${environment})...`, 'bright');
info('Cloud Build will:');
info('  1. Install all dependencies (root, frontend, backend)');
info('  2. Build frontend with REACT_APP_FIREBASE_CONFIG from Secret Manager');
info('  3. Deploy to App Engine');
info('');
info('Secret handling:');
info('  • Frontend: REACT_APP_FIREBASE_CONFIG injected at build time');
info('  • Backend: Fetches secrets from Secret Manager at runtime (secure!)');
info('');
info('This may take 5-15 minutes...\n');

const buildCommand = `gcloud builds submit ` +
  `--config=cloudbuild.yaml ` +
  `--project="${projectId}" ` +
  `--substitutions=_ENV=${environment},_SERVICE_NAME=${serviceName}`;

try {
  execSync(buildCommand, { stdio: 'inherit' });
  success(`\n✅ Cloud Build deployment successful!`);
} catch (err) {
  error('Cloud Build deployment failed. Check the output above for details.');
}

// Step 8: Show deployment info
log(`\n📊 Deployment Information`, 'bright');
log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'blue');

const url = isDev
  ? `https://dev-dot-${projectId}.uc.r.appspot.com`
  : `https://${projectId}.uc.r.appspot.com`;

success(`Service: ${serviceName}`);
success(`URL: ${url}`);
success(`Project: ${projectId}`);

log(`\n📝 Next Steps:`, 'bright');
info(`  1. Test the deployment: curl ${url}/api/health`);
info(`  2. View logs: npm run gcp:logs:${environment}`);
info(`  3. Check instances: npm run gcp:instances:list`);
info(`  4. Monitor at: https://console.cloud.google.com/appengine?project=${projectId}`);

log(`\n💡 Useful Commands:`, 'bright');
info(`  View logs:         npm run gcp:logs:${environment}`);
info(`  List instances:    npm run gcp:instances:list`);
info(`  Check health:      curl ${url}/api/health`);
info(`  View build logs:   https://console.cloud.google.com/cloud-build/builds?project=${projectId}`);

log(`\n⏱️  Expected Behavior:`, 'bright');
info(`  • Cold start: ~10-30 seconds on first request`);
info(`  • Idle: Scales to 0 instances after ~15 minutes`);
info(`  • Active: Max 1 instance when handling requests`);
info(`  • Cost when idle: $0/hour ✨`);

log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, 'blue');

success('Deployment complete! 🎉\n');
