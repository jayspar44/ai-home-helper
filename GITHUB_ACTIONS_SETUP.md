# GitHub Actions CI/CD Setup Guide

This guide walks you through setting up automated deployments to Google App Engine using GitHub Actions with Workload Identity Federation (keyless authentication).

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step-by-Step Setup](#step-by-step-setup)
- [Testing Your Setup](#testing-your-setup)
- [Using GitHub Actions](#using-github-actions)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Overview

### What You're Setting Up

**Automated CI/CD Pipeline:**
```
Push to develop → Auto-deploy to dev environment
Push to main → Wait for approval → Deploy to production
```

**Key Features:**
- ✅ Keyless authentication (Workload Identity Federation)
- ✅ Auto-deploy to dev on `develop` branch
- ✅ Manual approval required for production
- ✅ PR validation (linting, build checks)
  - ⚠️ Note: No automated tests currently - validation checks code quality and build success only
- ✅ Uses your existing Cloud Build configuration
- ✅ Full deployment history in GitHub Actions

**Architecture:**
```
GitHub Actions → Authenticate via WIF → Trigger Cloud Build → Deploy to App Engine
```

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **GCP Project** with App Engine already configured
- ✅ **gcloud CLI** installed and authenticated
- ✅ **GitHub repository** with your code
- ✅ **Existing Cloud Build** configuration working (`cloudbuild.yaml`)
- ✅ **Git** installed locally
- ✅ **Admin access** to both GCP project and GitHub repository

**Estimated Time:** 30 minutes total (one-time setup)

---

## Step-by-Step Setup

### STEP 1: Configure GCP Workload Identity Federation

**Time:** ~10 minutes

This step creates the Workload Identity Federation pool, provider, and service account using gcloud commands.

#### 1.1 Get Your Repository ID

You need your GitHub repository's numeric ID for security (prevents repository spoofing).

**Method 1 - Via GitHub API:**
Visit: https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO

Look for `"id":` near the top of the JSON. It's a number like `123456789`.

**Method 2 - Via GitHub CLI (if installed):**
```bash
gh api repos/YOUR_USERNAME/YOUR_REPO --jq .id
```

**Copy this number - you'll need it for the commands below.**

#### 1.2 Run These gcloud Commands

Copy and paste each command into PowerShell, Git Bash, or your terminal.

**Enable Required APIs:**
```bash
gcloud services enable iamcredentials.googleapis.com --project=YOUR_PROJECT_ID
gcloud services enable iam.googleapis.com --project=YOUR_PROJECT_ID
gcloud services enable cloudresourcemanager.googleapis.com --project=YOUR_PROJECT_ID
```

**Create Workload Identity Pool:**
```bash
gcloud iam workload-identity-pools create github-actions-pool \
  --location=global \
  --display-name="GitHub Actions Pool" \
  --description="Workload Identity Pool for GitHub Actions authentication" \
  --project=YOUR_PROJECT_ID
```

**Create GitHub OIDC Provider:**

Replace `YOUR_REPO_ID` with your numeric repository ID from step 1.1:

```bash
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github-actions-pool \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_id=assertion.repository_id,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_id == 'YOUR_REPO_ID'" \
  --project=YOUR_PROJECT_ID
```

**Create Service Account:**
```bash
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer" \
  --description="Service account for GitHub Actions to deploy to App Engine" \
  --project=YOUR_PROJECT_ID
```

**Grant IAM Roles (run all 6 commands):**

Replace `YOUR_PROJECT_ID` with your GCP project ID:

```bash
# App Engine Admin
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/appengine.appAdmin"

# Storage Admin
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Cloud Build Editor
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"

# Artifact Registry Reader
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Service Account User
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Secret Manager Secret Accessor
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Bind Workload Identity Pool to Service Account:**

Replace `YOUR_PROJECT_NUMBER`, `YOUR_REPO_ID`, and `YOUR_PROJECT_ID`:

```bash
gcloud iam service-accounts add-iam-policy-binding github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository_id/YOUR_REPO_ID" \
  --project=YOUR_PROJECT_ID
```

**To find your project number:**
```bash
gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)"
```

#### 1.3 Note Your Configuration Values

You'll need these values for GitHub Secrets in Step 2. Save them now:

```
GCP_PROJECT_ID: YOUR_PROJECT_ID
GCP_WORKLOAD_IDENTITY_PROVIDER: projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider
GCP_SERVICE_ACCOUNT: github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

#### 1.4 Wait 5 Minutes

**CRITICAL:** IAM changes take 3-5 minutes to propagate. Don't test immediately!

---

### STEP 2: Add GitHub Secrets

**Time:** ~2 minutes

#### 2.1 Go to your GitHub repository settings

1. Navigate to your repository on GitHub
2. Click **Settings** (top right)
3. In left sidebar: **Secrets and variables** → **Actions**
4. Click **New repository secret**

#### 2.2 Add the secrets

Add each secret from Step 1.4 output:

**Secret 1: GCP_PROJECT_ID**
- Click **New repository secret**
- Name: `GCP_PROJECT_ID`
- Value: Your GCP project ID (e.g., `roscoe-ai-home-helper`)
- Click **Add secret**

**Secret 2: GCP_WORKLOAD_IDENTITY_PROVIDER**
- Click **New repository secret**
- Name: `GCP_WORKLOAD_IDENTITY_PROVIDER`
- Value: The full provider path from script output
- Click **Add secret**

**Secret 3: GCP_SERVICE_ACCOUNT**
- Click **New repository secret**
- Name: `GCP_SERVICE_ACCOUNT`
- Value: The service account email from script output
- Click **Add secret**

#### 2.3 Verify secrets

You should see 3 secrets listed (you won't be able to view their values after creation - that's normal).

---

### STEP 3: Create GitHub Environments

**Time:** ~3 minutes

Environments provide deployment tracking, protection rules, and approval gates.

#### 3.1 Create Development Environment

1. Go to **Settings** → **Environments**
2. Click **New environment**
3. Name: `development` (lowercase, no spaces)
4. Click **Configure environment**
5. **No protection rules needed** for development
6. (Optional) Add environment variable:
   - Name: `ENVIRONMENT_NAME`
   - Value: `dev`
7. Click **Save protection rules**

#### 3.2 Create Production Environment

1. Click **New environment**
2. Name: `production` (lowercase, no spaces)
3. Click **Configure environment**

**Configure protection rules:**

**Required reviewers:**
- ✅ Check **Required reviewers**
- Click **Add users or teams**
- Add yourself (and any teammates)
- At least 1 reviewer required before deployment

**Prevent self-review (optional but recommended):**
- ✅ Check **Prevent self-review**
- This ensures someone else must approve (skip if solo developer)

**Deployment branches:**
- Select **Selected branches and tags**
- Click **Add deployment branch or tag rule**
- Branch name pattern: `main`
- This restricts production deployments to `main` branch only

**Environment variables (optional):**
- Name: `ENVIRONMENT_NAME`
- Value: `prod`

4. Click **Save protection rules**

---

### STEP 4: Create `develop` Branch

**Time:** ~1 minute

#### 4.1 Create the branch locally

```bash
# Make sure you're on main and up to date
git checkout main
git pull origin main

# Create develop branch from current main
git checkout -b develop

# Push to GitHub
git push -u origin develop
```

#### 4.2 (Optional) Set `develop` as default branch

This makes new PRs default to `develop` instead of `main`:

1. Go to **Settings** → **Branches**
2. Under **Default branch**, click the pencil/edit icon
3. Select `develop` from dropdown
4. Click **Update**
5. Confirm the change

**Why this helps:**
- Feature branches will automatically PR to `develop`
- Prevents accidentally PR'ing directly to `main`
- Aligns with the workflow: `feature → develop → main`

---

### STEP 5: Test Dev Auto-Deployment

**Time:** ~5 minutes (including deployment wait)

#### 5.1 Make a test change

```bash
# Make sure you're on develop branch
git checkout develop

# Make a small, harmless change
echo "" >> README.md
echo "Testing GitHub Actions CI/CD" >> README.md

# Commit and push
git add README.md
git commit -m "test: Verify GitHub Actions dev deployment"
git push origin develop
```

#### 5.2 Watch the workflow

1. Go to your GitHub repository
2. Click the **Actions** tab (top navigation)
3. You should see "Deploy to Development" workflow running
4. Click on the workflow run to see live logs

**Expected timeline:**
- ~30 seconds: Authentication and setup
- ~5-10 minutes: Cloud Build deployment
- Total: ~5-10 minutes

#### 5.3 Verify deployment

Once the workflow succeeds:

1. Check the workflow summary (scroll to bottom)
2. Copy the dev URL: `https://dev-dot-YOUR_PROJECT.uc.r.appspot.com`
3. Visit the URL in your browser
4. You should see your application (allow time for cold start)

**Troubleshooting:**
- If workflow fails, check the logs in Actions tab
- Common issue: 5-minute IAM propagation delay - wait and retry
- See [Troubleshooting](#troubleshooting) section below

---

### STEP 6: Test Production Approval Flow

**Time:** ~5 minutes (plus deployment wait)

#### 6.1 Create a Pull Request from `develop` to `main`

**Via GitHub Web Interface:**

1. Go to your repository on GitHub
2. Click **Pull requests** tab
3. Click **New pull request**
4. Base: `main` ← Compare: `develop`
5. Review the changes (should show your test commit)
6. Click **Create pull request**
7. Add title/description
8. Click **Create pull request**

#### 6.2 Merge the Pull Request

1. Review the PR (your test commit should be there)
2. Wait for PR validation to complete (if any checks are running)
3. Click **Merge pull request**
4. Click **Confirm merge**

#### 6.3 Wait for approval prompt

1. Go to **Actions** tab
2. You should see "Deploy to Production" workflow
3. Status will show: **Waiting for review**
4. You'll receive a notification (if enabled)

#### 6.4 Approve the deployment

1. Click on the workflow run
2. You'll see a yellow banner: "This workflow is waiting on approval from a protected environment"
3. Click **Review pending deployments** button
4. Check the box next to **production**
5. (Optional) Add a comment: "Approved for production deployment"
6. Click **Approve and deploy**

#### 6.5 Watch deployment complete

- The workflow will resume and deploy to production
- Monitor the logs
- Wait ~5-10 minutes for deployment

#### 6.6 Verify production deployment

1. Check the workflow summary
2. Copy the production URL: `https://YOUR_PROJECT.uc.r.appspot.com`
3. Visit the URL
4. Verify your changes are live

**Success!** 🎉 Your automated CI/CD is now working!

---

## Using GitHub Actions

### Daily Development Workflow

```bash
# 1. Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/my-awesome-feature

# 2. Make changes, commit, push
git add .
git commit -m "feat: Add awesome feature"
git push origin feature/my-awesome-feature

# 3. Create PR to develop (via GitHub web)
# - Go to GitHub → Pull requests → New PR
# - Base: develop ← Compare: feature/my-awesome-feature
# - Create PR

# 4. Merge PR → Auto-deploys to dev!
# 5. Test on: https://dev-dot-YOUR_PROJECT.uc.r.appspot.com

# 6. When ready for production:
# - Create PR: develop → main
# - Merge PR
# - Approve deployment in Actions tab
# - Deployed to: https://YOUR_PROJECT.uc.r.appspot.com
# - Note: develop automatically syncs with main after production deployment
#   (no manual intervention needed to keep branches aligned)
```

### Viewing Deployment Logs

**GitHub Actions logs:**
1. Go to **Actions** tab
2. Click on a workflow run
3. Expand steps to see logs

**GCP logs (for runtime):**
```bash
# Development
npm run gcp:logs:dev

# Production
npm run gcp:logs:prod
```

### Manual Deployments (Fallback)

Your existing npm scripts still work:

```bash
# Deploy to dev manually
npm run gcp:deploy:dev

# Deploy to prod manually
npm run gcp:deploy:prod
```

Use these for:
- Testing without pushing to GitHub
- Emergency deployments
- Bypassing approval process (if needed)

---

## Troubleshooting

### Issue: Workflow fails with "Failed to generate Google Cloud access token"

**Cause:** IAM propagation delay or incorrect WIF configuration

**Solution:**
1. Wait 5 minutes after running gcloud commands (IAM propagation)
2. Verify GitHub Secrets are correct (Settings → Secrets → Actions)
3. Re-run the workflow (Actions → Re-run failed jobs)
4. If still failing, verify the Workload Identity Pool and Provider exist:
   ```bash
   gcloud iam workload-identity-pools describe github-actions-pool --location=global --project=YOUR_PROJECT_ID
   ```

---

### Issue: Workflow fails with "Permission denied" on Cloud Build

**Cause:** Service account missing IAM roles

**Solution:**
```bash
# Manually grant the missing role
SERVICE_ACCOUNT="github-actions-deployer@YOUR_PROJECT.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudbuild.builds.editor"

# Grant all required roles (run all 6 commands from STEP 1.2)
```

---

### Issue: Approval button doesn't appear

**Cause:** Environment not configured with required reviewers

**Solution:**
1. Go to Settings → Environments → production
2. Ensure "Required reviewers" is checked
3. Ensure you're added as a reviewer
4. Save protection rules
5. Re-run the deployment

---

### Issue: Dev deployment works but prod doesn't

**Cause:** `production` environment protection blocking deployment

**Solution:**
- This is expected! Production requires manual approval
- Go to Actions tab → Click workflow → Click "Review pending deployments"
- If no approval prompt appears, check environment configuration

---

### Issue: "Repository ID mismatch" error

**Cause:** Attribute condition in WIF doesn't match your repository

**Solution:**
```bash
# Get your repository ID
curl -s https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO | grep '"id"'

# Delete and recreate the provider with correct repository ID
gcloud iam workload-identity-pools providers delete github-provider \
  --location=global \
  --workload-identity-pool=github-actions-pool \
  --project=YOUR_PROJECT_ID

# Then re-run the "Create GitHub OIDC Provider" command from STEP 1.2 with correct repo ID
```

---

### Issue: Build succeeds but app shows errors

**Cause:** This is an app issue, not a deployment issue

**Solution:**
1. Check GCP logs: `npm run gcp:logs:dev` or `npm run gcp:logs:prod`
2. Look for runtime errors
3. Check Secret Manager secrets are correct
4. Verify environment variables in `app.yaml` / `app-dev.yaml`

---

## FAQ

### Q: Can I still use `npm run gcp:deploy:*` commands?

**A:** Yes! Both methods work simultaneously. GitHub Actions is just an additional automation layer.

---

### Q: Do I need to approve every production deployment?

**A:** Yes, as configured. This is a safety feature. You can remove required reviewers from the `production` environment if you want auto-deployments.

---

### Q: Can I deploy to production without merging to `main`?

**A:** Yes, use manual deployment:
```bash
npm run gcp:deploy:prod
```

Or temporarily modify the workflow to trigger on your branch.

---

### Q: What if I want to add more approvers?

**A:** Settings → Environments → production → Required reviewers → Add users/teams

---

### Q: Can I test production deployment without affecting live users?

**A:** Yes, use the `--no-promote` flag in the workflow, or manually deploy a specific version without promoting it.

---

### Q: How do I disable GitHub Actions and go back to manual?

**A:** Just don't push to `develop` or `main`. Use npm scripts for manual deployments. The workflows won't trigger unless you push to those branches.

---

### Q: What's the cost of Workload Identity Federation?

**A:** FREE. It's just IAM configuration, no billable services.

---

### Q: What's the cost of GitHub Actions?

**A:**
- Public repos: Unlimited free
- Private repos: 2,000 minutes/month free (each deployment ~5-10 min)

---

### Q: Can I add Slack/Discord notifications?

**A:** Yes! Add a notification step to the workflow files. Many Actions available in GitHub Marketplace.

---

### Q: Can I deploy to multiple GCP projects?

**A:** Yes, but you'll need separate WIF configurations and environments for each project.

---

## Next Steps

Now that your CI/CD is set up:

1. **Update your team** (if applicable) - Share this guide
2. **Set branch protection rules** - Prevent direct pushes to `main`
3. **Add more environments** - Staging, QA, etc.
4. **Enhance PR validation** - Add unit tests, integration tests
5. **Add deployment notifications** - Slack, Discord, email

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workload Identity Federation Guide](https://cloud.google.com/iam/docs/workload-identity-federation)
- [App Engine Deployment](https://cloud.google.com/appengine/docs/standard/nodejs/building-app)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments)

---

**Questions or Issues?**

Check [DEPLOYMENT.md](DEPLOYMENT.md) for general deployment troubleshooting or create an issue in the repository.

---

**Last Updated:** 2025-10-25
**Maintained by:** Roscoe Development Team
