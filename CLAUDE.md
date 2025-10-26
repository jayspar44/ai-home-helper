# Roscoe - AI Home Helper

## App Context
AI home helper for families - recipe generation, pantry management, meal planning
- AI recipe generator with Gemini 2.5 Flash (multiple recipes, sophistication levels, pantry integration)
- Smart pantry with photo recognition, expiry tracking, consumption logging
- 3-state meal planner (empty→planned→completed) with timezone-independent dates
- Multi-user homes with role-based access (admin/member)
- Firebase auth + Firestore multi-tenant architecture

## Tech Stack
- **Frontend**: React 18.3.1, CSS custom properties, Lucide React icons
- **Backend**: Node.js + Express.js, Firebase Admin SDK, Multer file uploads
- **Database**: Firebase Firestore
- **AI**: Google Gemini 2.5 Flash API (@google/generative-ai v0.17.1)
- **Development**: ESLint 9.36.0, Concurrently, Nodemon

- **Deployment**:
  - **Local Development**: Runs on localhost:3000 (frontend) and localhost:3001 (backend)
  - **Production**: GCP App Engine (secure runtime secret loading from Secret Manager)
  - **Version Control**: GitHub
  - **CI/CD**: Cloud Build with automated deployments

## Project Structure
```
├── frontend/src/
│   ├── components/           # 22 React components
│   │   ├── pantry/          # Pantry components
│   │   ├── UnifiedMealModal.js  # 3-state meal modal
│   │   ├── RecipeSelector.js    # Recipe selection
│   │   └── SharedLayout.js      # Main layout
│   ├── pages/               # PlannerPage, RecipeGenerator, PantryPage
│   └── contexts/            # ToastContext
├── backend/
│   ├── server.js           # Main server with AI endpoints
│   └── uploads/            # Temp AI image processing
├── version.json            # Single source of truth
└── eslint.config.mjs       # Modern ESLint config
```

## Key Commands
```bash
npm run dev:local           # Run full stack locally
npm run build              # Build frontend only
npm run install-all        # Install all dependencies
```

## Logging Access
- **Local Development**: View logs in terminal where `npm run dev:local` runs
- **GCP Production**: Run `npm run gcp:logs:prod` or view in GCP Console → App Engine → Logs

## CI/CD Workflow (GitHub Actions + GCP)

**Branch Strategy (GitFlow)**:
- `main` = production (stable releases only)
- `develop` = active development (default branch)
- `feature/*` = feature branches

**Automated Workflows**:

1. **PR Validation** (`.github/workflows/pr-validation.yml`)
   - Triggers: PRs to `develop` or `main`
   - Runs: ESLint (code quality) + Frontend build (compilation check)
   - Note: Build step disables ESLint (handled by dedicated lint step)

2. **Deploy to Development** (`.github/workflows/deploy-dev.yml`)
   - Triggers: Push to `develop` branch
   - Skips: Commits with "sync:" prefix (branch alignment, no new code)
   - Action: Deploys to dev service via Cloud Build (optimized pipeline)
   - URL: https://dev-dot-{project-id}.uc.r.appspot.com

3. **Deploy to Production** (`.github/workflows/deploy-prod.yml`)
   - Triggers: Push to `main` branch
   - Requires: Manual approval via GitHub Environment "production"
   - Action: Deploys to default service via Cloud Build
   - URL: https://{project-id}.uc.r.appspot.com

4. **Sync develop with main** (`.github/workflows/sync-develop.yml`)
   - Triggers: After push to `main` (post-production deployment)
   - Action: Automatically merges main → develop
   - Commit: Prefixed with "sync:" to skip redundant dev deployment
   - Purpose: Keeps branches aligned without manual intervention

**Development Workflow**:
```
1. Create feature branch from develop: git checkout -b feature/my-feature
2. Make changes, commit, push
3. Open PR to develop → PR validation runs
4. Merge PR → Auto-deploys to dev environment
5. Test in dev environment
6. Open PR from develop to main → PR validation runs
7. Merge PR → Requires manual approval → Deploys to production
8. sync-develop.yml automatically aligns develop with main
```

**Why sync-develop.yml exists**:
- After production release, develop needs to match main
- Without automation, requires manual git merge + admin bypass
- Sync commits use "sync:" prefix so deploy-dev.yml skips deployment
- Saves ~5-10 minutes Cloud Build time (no redundant deployment)

**Cloud Build Optimizations** (used by both deployments):
- Tar+gzip dependency caching (85% size reduction)
- Parallel cache operations (restore/save)
- E2_HIGHCPU_8 machine type (8 vCPUs)
- Parallel dependency installation (root, frontend, backend)

**Important Notes**:
- All deployments use `cloudbuild.yaml` (optimized pipeline from v2.14.0)
- Project ID fetched from gcloud (not secrets) to display actual URLs
- Frontend build secrets injected at build time from Secret Manager
- Backend secrets loaded at runtime from Secret Manager

## Database Schema
```javascript
// User: { name, email, primaryHomeId, homes: {"homeId": "role"} }
// Home: { name, members: {"userId": "role"} }
// PantryItem: { name, location, quantity, expiresAt, createdBy, confidence?, detectedBy? }
// MealPlan: { date, mealType, planned?: {recipeId, recipeName, ingredients}, actual?: {description, loggedAt} }
// Recipe: { title, ingredients[], instructions[], pantryIngredients[], missingIngredients[] }
```

## Claude Code Version Management Protocol
Version is managed via version.json and mirrored in the root, frontend and backend package.json files. After each set of code changes Claude should evaluate if we need to do a version bump and if it does propose the update to the user. Only apply the version bump if the user agrees.

**When to Update Version**: Automatically propose version updates after completing coding tasks or when explicitly requested.

**Process**:
1. **Analyze changes**: Review what was modified
2. **Classify**: PATCH (bugs/small fixes) | MINOR (new features) | MAJOR (breaking changes)
3. **Propose**: Suggest version with reasoning
4. **Implementation**: Run `npm run version:bump X.Y.Z "description"` which automatically updates version.json (version + changelog entry) and syncs to all 3 package.json files

## Documentation Protocol

**Scope of Each Document**:
- **README.md**: Public-facing overview (features, quick start, architecture overview) - Target audience: Users, new developers, GitHub visitors
- **DEPLOYMENT.md**: GCP deployment operations guide (setup, deployment, monitoring, troubleshooting) - Target audience: Deployers, DevOps
- **CLAUDE.md**: AI agent instructions (project context, protocols, code style) - Target audience: Claude Code

**Guidelines**:
- **DRY Principle**: Link to canonical sources instead of duplicating content
- **No Hardcoded Versions**: Never hardcode version numbers in docs (version lives in version.json only)
- **Cross-linking**: Use relative markdown links (e.g., `[DEPLOYMENT.md](DEPLOYMENT.md)`)
- **Update Triggers**:
  - README.md: New features, major architecture changes
  - DEPLOYMENT.md: Deployment process changes, new GCP features
  - CLAUDE.md: New protocols, code style changes

## Code Style
- Use functional React components with hooks
- Follow existing CSS custom property patterns
- All API endpoints require Firebase authentication
- Restart backend dev server after Node.js changes