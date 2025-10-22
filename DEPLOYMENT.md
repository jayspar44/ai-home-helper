# GCP Deployment Guide - Roscoe AI Home Helper

**Last Updated:** 2025-10-21
**Version:** 2.12.2

## Table of Contents

- [Overview](#overview)
- [Free Tier Protection](#free-tier-protection)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Secrets Setup](#secrets-setup)
- [Deployment](#deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)
- [Cost Management](#cost-management)
- [Architecture](#architecture)

---

## Overview

This guide covers deploying Roscoe AI Home Helper to Google Cloud Platform (GCP) App Engine with:

- ✅ **Free tier optimized** - Automatic scaling to zero when idle
- ✅ **Separate dev/prod environments** - Isolated testing and production
- ✅ **Secure secret management** - All secrets in Secret Manager ONLY
- ✅ **Template-based configuration** - Auto-generated yaml files (never in git)
- ✅ **Automated builds** - Cloud Build integration
- ✅ **Zero-downtime deploys** - No-promote flag for dev
- ✅ **Cost monitoring** - Scripts to track instance usage

### How Secrets Work

**CRITICAL:** Secrets are stored in ONE place only - GCP Secret Manager

**NEW SECURE APPROACH:**
1. **Templates** (`app.yaml.template`, `app-dev.yaml.template`) - Committed to git with only `PROJECT_ID` placeholder (NO secrets!)
2. **Generated configs** (`app.yaml`, `app-dev.yaml`) - Auto-generated during deployment with project ID only (NO secrets!)
3. **Runtime Secret Loading** - Backend fetches secrets directly from Secret Manager at startup
4. **Project ID** - Stored locally in `.env.gcp` (git-ignored)

**Security Benefits:**
- ✅ Zero secrets in configuration files
- ✅ Zero secrets in Cloud Build workspace
- ✅ Secrets only accessed at runtime by authorized service account
- ✅ No risk of accidental secret exposure in logs or git

**You never need to edit `app.yaml` or `app-dev.yaml` manually!** They're auto-generated from templates.

### Tech Stack

- **Runtime:** Node.js 20 (App Engine Standard 2nd gen)
- **Instance Class:** F1 (256MB RAM, 600MHz CPU)
- **Secrets:** GCP Secret Manager (4 secrets)
- **Build:** Cloud Build with automatic secret injection
- **Storage:** Firestore (Firebase)

---

## Free Tier Protection

### Auto-Scaling to Zero ✨

This deployment is configured to **stay within GCP free tier** and minimize costs:

| State | Instances | Cost | Behavior |
|-------|-----------|------|----------|
| **Idle** | 0 | $0/hour | No traffic → instances shut down after ~15 min |
| **Cold Start** | 0→1 | $0 | First request after idle: ~10-30 second startup |
| **Active (Dev)** | 1 | Minimal | Max 1 instance for dev environment |
| **Active (Prod)** | 1 | Minimal | Max 1 instance for prod environment |
| **Peak (Both)** | 2 | Minimal | Dev + Prod active simultaneously |

### Configuration Highlights

```yaml
automatic_scaling:
  min_instances: 0              # Scale to ZERO when no traffic
  max_instances: 1              # Never exceed 1 instance per environment
  min_idle_instances: 0         # No instances kept warm
  max_idle_instances: 0         # Force scale to zero
```

### Free Tier Limits

- ✅ **28 instance hours/day** - We use max 48 hours if both environments run 24/7 (unlikely)
- ✅ **1 GB outbound data/day** - More than enough for typical usage
- ✅ **5 GB Cloud Storage** - Frontend build is ~10MB

**Expected Monthly Cost:** $0 (within free tier) when properly configured

---

## Prerequisites

### 1. Install gcloud CLI

**Windows:**
```powershell
# Download and run installer from:
https://cloud.google.com/sdk/docs/install
```

**macOS:**
```bash
brew install --cask google-cloud-sdk
```

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### 2. Authenticate with GCP

```bash
# Login to your Google account
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Verify
gcloud config get-value project
```

### 3. Configure Local Environment (Optional)

Create a local configuration file for easy reference:

```bash
# Copy the template
cp .env.gcp.template .env.gcp

# Edit .env.gcp and add your project ID
# This file is git-ignored and won't be committed
```

**Note:** `.env.gcp` is automatically ignored by git. It's for local reference only and contains your project ID and URLs.

### 4. Create App Engine Application

**One-time setup** (if not already done):

```bash
# Create App Engine app in us-central1 (Iowa) - Free tier eligible
gcloud app create --region=us-central1

# Confirm
gcloud app describe
```

### 5. Enable Required APIs

```bash
# Enable App Engine Admin API
gcloud services enable appengine.googleapis.com

# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Verify all enabled
gcloud services list --enabled
```

---

## Secrets Setup

### Required Secrets (4 Total)

| Secret Name | Purpose | Type | Used By |
|-------------|---------|------|---------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK credentials | JSON | Backend (runtime) |
| `GEMINI_API_KEY` | Google Gemini AI API key | String | Backend (runtime) |
| `FRONTEND_URL` | Frontend URL for CORS | String | Backend (runtime) |
| `REACT_APP_FIREBASE_CONFIG` | Firebase client config | JSON | Frontend (build-time) |

### Interactive Setup (Recommended)

Use the helper script to create and configure all secrets:

```bash
npm run gcp:setup:secrets
```

This will:
1. Check existing secrets
2. Prompt you to enter/update secret values
3. Validate JSON formats
4. Set up IAM permissions automatically

### Manual Setup

#### Create Secrets

```bash
# 1. Firebase Service Account (Backend)
# Get from Firebase Console → Project Settings → Service Accounts → Generate new private key
cat firebase-service-account.json | gcloud secrets create FIREBASE_SERVICE_ACCOUNT --data-file=-

# 2. Gemini API Key (Backend)
# Get from Google AI Studio: https://makersuite.google.com/app/apikey
echo "YOUR_GEMINI_API_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=-

# 3. Frontend URL (Backend - CORS)
# Use your App Engine URLs
echo "https://YOUR_PROJECT_ID.uc.r.appspot.com" | gcloud secrets create FRONTEND_URL --data-file=-

# 4. Firebase Client Config (Frontend - Build Time)
# Get from Firebase Console → Project Settings → General → Your apps → Firebase SDK snippet
# Example format:
cat <<'EOF' | gcloud secrets create REACT_APP_FIREBASE_CONFIG --data-file=-
{"apiKey":"AIza...","authDomain":"your-project.firebaseapp.com","projectId":"your-project","storageBucket":"your-project.appspot.com","messagingSenderId":"123456789","appId":"1:123456789:web:abc123"}
EOF
```

#### Grant IAM Permissions

App Engine service account needs access to read secrets:

```bash
# Get your service account
SERVICE_ACCOUNT="YOUR_PROJECT_ID@appspot.gserviceaccount.com"

# Grant access to each backend secret
gcloud secrets add-iam-policy-binding FIREBASE_SERVICE_ACCOUNT \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding FRONTEND_URL \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

**Note:** `REACT_APP_FIREBASE_CONFIG` permissions are handled by Cloud Build automatically during builds.

### Verify Secrets

```bash
# List all secrets
gcloud secrets list

# View a secret (for testing)
gcloud secrets versions access latest --secret=GEMINI_API_KEY

# Check IAM permissions
gcloud secrets get-iam-policy FIREBASE_SERVICE_ACCOUNT
```

---

## Deployment

### Pre-Deployment Check

Run the readiness checker to verify everything is configured:

```bash
npm run gcp:check:ready
```

This validates:
- ✅ gcloud CLI installed and authenticated
- ✅ GCP project configured
- ✅ App Engine app created
- ✅ Required APIs enabled
- ✅ All 4 secrets exist
- ✅ IAM permissions configured
- ✅ Frontend build exists
- ✅ Dependencies installed

### Deploy to Development

**Recommended for first deployment:**

```bash
# Deploy to development environment
npm run gcp:deploy:dev
```

**What happens automatically:**
1. 📝 Reads project ID from `.env.gcp` (or gcloud config)
2. 🔨 Generates `app-dev.yaml` from `app-dev.yaml.template` (project ID only, NO secrets!)
3. ☁️ Triggers Cloud Build deployment
4. 🏗️ Cloud Build installs dependencies and builds frontend
5. 🔐 Cloud Build injects REACT_APP_FIREBASE_CONFIG at build time
6. 🚀 Deploys to App Engine dev service
7. 🔐 Backend fetches runtime secrets from Secret Manager at startup
8. 🔒 **NOT promoted** to default (safe testing)

**Alternative (same behavior, different name):**

```bash
# These do the same thing now
npm run gcp:deploy:dev:secrets
```

**Access:** `https://dev-dot-YOUR_PROJECT_ID.uc.r.appspot.com`

### Deploy to Production

**After testing dev environment:**

```bash
# Deploy to production environment
npm run gcp:deploy:prod
```

**What happens automatically:**
1. 📝 Reads project ID from `.env.gcp` (or gcloud config)
2. 🔨 Generates `app.yaml` from `app.yaml.template` (project ID only, NO secrets!)
3. ☁️ Triggers Cloud Build deployment
4. 🏗️ Cloud Build installs dependencies and builds frontend
5. 🔐 Cloud Build injects REACT_APP_FIREBASE_CONFIG at build time
6. 🚀 Deploys to App Engine default service
7. 🔐 Backend fetches runtime secrets from Secret Manager at startup
8. ⭐ **Promoted** to default (becomes primary URL)

**Alternative (same behavior, different name):**

```bash
# These do the same thing now
npm run gcp:deploy:prod:secrets
```

**Access:** `https://YOUR_PROJECT_ID.uc.r.appspot.com`

**Note:** Both `:secrets` and non-`:secrets` commands now do the same thing - the `:secrets` suffix is kept for backwards compatibility.

### Build Process

The deployment uses Cloud Build which:

1. **Installs dependencies** (root, frontend, backend)
2. **Builds frontend** with `REACT_APP_FIREBASE_CONFIG` injected
3. **Deploys to App Engine** with backend secrets configured

**Build time:** ~5-10 minutes (first build may take longer)

---

## Monitoring & Maintenance

### View Logs

**Real-time log streaming:**

```bash
# Development logs
npm run gcp:logs:dev

# Production logs
npm run gcp:logs:prod
```

**Query specific logs:**

```bash
# Last 50 error logs (production)
gcloud app logs read --service=default --limit=50 --level=error

# Last 100 logs (development)
gcloud app logs read --service=dev --limit=100

# Logs from last hour
gcloud app logs read --service=default --limit=100 --freshness=1h
```

### Check Instances

**List active instances:**

```bash
npm run gcp:instances:list
```

**Count instances (should be 0-2):**

```bash
npm run gcp:instances:count
```

**Expected output:**
- **Idle:** 0 instances (both dev and prod scaled to zero)
- **Dev active:** 1 instance (dev service)
- **Prod active:** 1 instance (default service)
- **Both active:** 2 instances total

### Health Checks

**Check if deployment is working:**

```bash
# Development
curl https://dev-dot-YOUR_PROJECT_ID.uc.r.appspot.com/api/health

# Production
curl https://YOUR_PROJECT_ID.uc.r.appspot.com/api/health
```

**Expected response:**

```json
{
  "status": "OK",
  "timestamp": "2025-10-20T12:00:00.000Z",
  "uptime": 123.456,
  "environment": "production",
  "version": "2.11.2",
  "services": {
    "firebase": "connected",
    "gemini": "configured"
  }
}
```

### Update Secrets

**Update an existing secret:**

```bash
# Using helper script (recommended)
npm run gcp:setup:secrets

# Or manually
echo "NEW_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-
```

**Note:** After updating secrets, redeploy for changes to take effect.

### Update Application

**Deploy new code:**

1. Make code changes
2. Commit to git (optional but recommended)
3. Deploy:
   ```bash
   npm run gcp:deploy:dev:secrets  # Test in dev first
   npm run gcp:deploy:prod:secrets # Then production
   ```

**Rollback to previous version:**

```bash
# List versions
gcloud app versions list

# Route traffic to previous version
gcloud app services set-traffic default --splits=VERSION_ID=1
```

---

## Troubleshooting

### Cold Starts (Slow First Load)

**Symptom:** First request after idle takes 10-30 seconds

**Cause:** Instance scaled to zero, needs to start up

**Solutions:**
1. **Accept it** - This is expected behavior for free tier
2. **Keep warm** (costs money):
   ```yaml
   # In app.yaml - WARNING: Costs money!
   automatic_scaling:
     min_instances: 1  # Keep 1 instance always running
   ```

### Deployment Fails with "Secret not found"

**Check secrets exist:**

```bash
gcloud secrets list
```

**Check IAM permissions:**

```bash
gcloud secrets get-iam-policy SECRET_NAME
```

**Fix:**

```bash
npm run gcp:setup:secrets
```

### Frontend Shows Firebase Error

**Symptom:** Browser console shows Firebase initialization errors

**Cause:** `REACT_APP_FIREBASE_CONFIG` not properly injected during build

**Solution:**

1. Verify secret exists:
   ```bash
   gcloud secrets versions access latest --secret=REACT_APP_FIREBASE_CONFIG
   ```

2. Rebuild and redeploy:
   ```bash
   npm run build:frontend
   npm run gcp:deploy:prod:secrets
   ```

### API Endpoints Return 401 Unauthorized

**Cause:** Backend `FIREBASE_SERVICE_ACCOUNT` secret issue

**Check:**

```bash
# View backend logs
npm run gcp:logs:prod

# Test secret
gcloud secrets versions access latest --secret=FIREBASE_SERVICE_ACCOUNT | jq .project_id
```

**Fix:**

1. Verify secret is valid JSON with `project_id` and `private_key`
2. Update if needed:
   ```bash
   npm run gcp:setup:secrets
   ```

3. Redeploy:
   ```bash
   npm run gcp:deploy:prod:secrets
   ```

### "Exceeded Free Tier" Warning

**This should NEVER happen with our config**, but if it does:

1. **Check instance count:**
   ```bash
   npm run gcp:instances:list
   ```

2. **Verify max_instances:**
   - Should be `1` in both `app.yaml` and `app-dev.yaml`

3. **Check for stuck instances:**
   ```bash
   gcloud app versions list
   ```

4. **Stop all traffic to old versions:**
   ```bash
   gcloud app versions stop VERSION_ID
   ```

### Build Timeout

**Symptom:** Deployment fails with timeout after 10 minutes

**Cause:** `npm install` or frontend build taking too long

**Solutions:**

1. **Pre-build locally:**
   ```bash
   npm run build:frontend
   ```

2. **Increase timeout** in `cloudbuild.yaml`:
   ```yaml
   timeout: '1800s'  # 30 minutes
   ```

---

## Cost Management

### Monitor Costs

**GCP Console:**

1. Visit: https://console.cloud.google.com/billing
2. View cost breakdown by service
3. Set up budget alerts

**Check quota usage:**

```bash
# View App Engine quota
gcloud app instances list --format=table
```

### Cost Optimization Checklist

- ✅ `min_instances: 0` (scales to zero)
- ✅ `max_instances: 1` (prevents runaway costs)
- ✅ F1 instance class (smallest available)
- ✅ No idle instances kept warm
- ✅ Static assets cached (30 days)
- ✅ `.gcloudignore` optimized (small deployments)

### Estimated Costs (Free Tier)

| Scenario | Instances | Hours/Day | Cost |
|----------|-----------|-----------|------|
| **Idle** | 0 | 0 | $0 |
| **Light use** | 0-1 | 2-4 | $0 (within free tier) |
| **Moderate use** | 1 | 8-12 | $0 (within free tier) |
| **Heavy use (dev+prod)** | 2 | 24 | $0 (within 28h/day free tier) |
| **Continuous (dev+prod)** | 2 | 48 | ~$0.10/day (~$3/month) |

**Free tier:** 28 instance-hours/day = enough for 1 instance running 24/7 + 4 hours of 2nd instance

---

## Architecture

### Deployment Structure

```
GCP Project
├── App Engine
│   ├── default service (Production)
│   │   ├── app.yaml
│   │   ├── F1 instance (0-1)
│   │   └── Auto-scales to zero
│   │
│   └── dev service (Development)
│       ├── app-dev.yaml
│       ├── F1 instance (0-1)
│       └── Auto-scales to zero
│
├── Cloud Build
│   ├── cloudbuild.yaml
│   ├── Builds frontend with secrets
│   └── Deploys to App Engine
│
└── Secret Manager
    ├── FIREBASE_SERVICE_ACCOUNT (backend)
    ├── GEMINI_API_KEY (backend)
    ├── FRONTEND_URL (backend)
    └── REACT_APP_FIREBASE_CONFIG (frontend build-time)
```

### Request Flow

```
User Request
    ↓
App Engine (us-central1)
    ↓
[No instances?] → Cold Start (10-30s) → Spin up instance
    ↓
[Instance running] → Immediate response (<100ms)
    ↓
Node.js Backend (Express)
    ├── /api/* → Backend API endpoints
    │   ├── Read secrets from env vars
    │   ├── Connect to Firebase
    │   └── Call Gemini API
    │
    └── /* → Serve React frontend
        └── Static files from frontend/build/
```

### Secret Injection Points

1. **Build Time (Frontend):**
   - `REACT_APP_FIREBASE_CONFIG` → Injected during `npm run build` via Cloud Build
   - Baked into React bundle at build time
   - Fetched from Secret Manager by Cloud Build

2. **Runtime (Backend):**
   - `FIREBASE_SERVICE_ACCOUNT` → Fetched from Secret Manager at server startup
   - `GEMINI_API_KEY` → Fetched from Secret Manager at server startup
   - `FRONTEND_URL` → Fetched from Secret Manager at server startup
   - Loaded by `backend/utils/secrets.js` using Secret Manager API
   - **NOT stored in app.yaml or environment variables!**

---

## Additional Resources

### Documentation

- [App Engine Node.js](https://cloud.google.com/appengine/docs/standard/nodejs)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Cloud Build](https://cloud.google.com/build/docs)
- [gcloud CLI Reference](https://cloud.google.com/sdk/gcloud/reference)

### Useful Commands Reference

```bash
# Deployment
npm run gcp:deploy:dev:secrets      # Deploy to dev with secrets
npm run gcp:deploy:prod:secrets     # Deploy to prod with secrets
npm run gcp:check:ready             # Pre-deployment validation

# Monitoring
npm run gcp:logs:dev                # View dev logs (real-time)
npm run gcp:logs:prod               # View prod logs (real-time)
npm run gcp:instances:list          # List all instances
npm run gcp:instances:count         # Count active instances

# Secrets
npm run gcp:setup:secrets           # Interactive secret setup

# Direct gcloud commands
gcloud app browse                   # Open prod in browser
gcloud app browse -s dev            # Open dev in browser
gcloud app versions list            # List all deployed versions
gcloud app services list            # List all services
```

---

## Support

**Issues?** Check the [Troubleshooting](#troubleshooting) section first.

**Still stuck?**
1. Check logs: `npm run gcp:logs:prod`
2. Verify deployment: `npm run gcp:check:ready`
3. Test health: `curl https://YOUR_PROJECT_ID.uc.r.appspot.com/api/health`

**Need help?** Contact your GCP administrator or refer to official GCP documentation.

---

**Last Updated:** 2025-10-21
**Version:** 2.12.2
**Maintained by:** Roscoe Development Team
