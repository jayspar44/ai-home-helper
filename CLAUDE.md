# Roscoe - AI Home Helper

## App Context
AI home helper for families - recipe generation, pantry management, meal planning, shopping lists
- AI recipe generator with Gemini 2.5 Flash (multiple recipes, sophistication levels, pantry integration)
- Smart pantry with photo recognition, expiry tracking, consumption logging
- 3-state meal planner (empty→planned→completed) with timezone-independent dates
- Smart shopping list with AI-powered item parsing, search, filters, grouping, and metadata tracking:
  - Natural language parsing (e.g., "2% milk" → preserved qualifiers)
  - Auto-categorization (produce, dairy, meat, pantry, frozen, other)
  - Search by item name
  - Filters: category, status (checked/unchecked), user (multi-user homes), date added
  - Group by: category, date added, user, status, or no grouping
  - Metadata: "2hr ago • Jason" on hover (conditional on multi-user)
  - Responsive padding (12px mobile, 8px desktop) for optimal touch targets
- Multi-user homes with role-based access (admin/member)
- Firebase auth + Firestore multi-tenant architecture

## Tech Stack
- **Frontend**: React 18.3.1, CSS custom properties, Lucide React icons
- **Backend**: Node.js + Express.js, Firebase Admin SDK, Multer file uploads
- **Database**: Firebase Firestore
- **AI**: Google Gemini 2.5 Flash API (@google/generative-ai v0.17.1)
- **Logging**: Pino (backend), Custom lightweight logger (frontend)
- **Development**: ESLint 9.36.0, Concurrently, Nodemon

- **Deployment**:
  - **Local Development**: Runs on localhost:3000 (frontend) and localhost:3001 (backend)
  - **Production**: GCP App Engine (secure runtime secret loading from Secret Manager)
  - **Version Control**: GitHub
  - **CI/CD**: Cloud Build with automated deployments

## Project Structure
```
├── frontend/src/
│   ├── components/           # 28 React components
│   │   ├── pantry/          # Pantry components
│   │   ├── ShoppingListInput.js         # Inline add item input
│   │   ├── ShoppingListItem.js          # Individual item with inline editing & metadata
│   │   ├── ShoppingListCategory.js      # Collapsible group sections (category/date/user/status)
│   │   ├── ShoppingListToolbar.js       # Search, filters, group by, actions
│   │   ├── ShoppingListFilterModal.js   # Filter modal (category, status, user, date)
│   │   ├── ShoppingListEmpty.js         # Empty state
│   │   ├── UnifiedMealModal.js          # 3-state meal modal
│   │   ├── RecipeSelector.js            # Recipe selection
│   │   └── SharedLayout.js              # Main layout
│   ├── pages/               # HomePage, PlannerPage, RecipeGenerator, PantryPage, ShoppingList
│   ├── hooks/               # useShoppingList (with search/filter/grouping), useTheme, useItemManager, usePantryFilters
│   ├── styles/              # ShoppingList.css
│   ├── utils/               # dateUtils.js (with formatRelativeTime)
│   └── contexts/            # ToastContext
├── backend/
│   ├── server.js           # Main server with AI endpoints, shopping list endpoints (timestamp conversion)
│   ├── services/           # shoppingListAI.js (AI parsing service with qualifier preservation)
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
- **PR Validation**: Runs ESLint + build checks on PRs to `develop` or `main`
- **Deploy to Development**: Push to `develop` → auto-deploys to dev environment
- **Deploy to Production**: Push to `main` → requires manual approval → deploys to production
- **Sync develop with main**: After production deployment, automatically merges `main` → `develop` (commits prefixed with "sync:" to skip redundant dev deployment)

**Quick Reference**:
- Dev environment: `https://dev-dot-{project-id}.uc.r.appspot.com`
- Production: `https://{project-id}.uc.r.appspot.com`
- Deployments use Cloud Build with secrets from GCP Secret Manager

For complete deployment details, setup instructions, and troubleshooting, see [DEPLOYMENT.md](DEPLOYMENT.md)

## Database Schema
```javascript
// User: { name, email, primaryHomeId, homes: {"homeId": "role"} }
// Home: { name, members: {"userId": "role"} }
// PantryItem: { name, location, quantity, expiresAt, createdBy, confidence?, detectedBy? }
// MealPlan: { date, mealType, planned?: {recipeId, recipeName, ingredients}, actual?: {description, loggedAt} }
// Recipe: { title, ingredients[], instructions[], pantryIngredients[], missingIngredients[] }
// ShoppingList: { homeId, items: [{id, name, quantity, unit, category, checked, addedBy, addedAt, source}], lastUpdated, createdAt }
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

## Development Workflow Protocol

**MANDATORY: Always follow the GitFlow branching model**:

1. **Never commit directly to `develop` or `main`**
2. **Always create a feature branch**: `git checkout -b feature/descriptive-name`
3. **Work on feature branch**: Make changes, commit
4. **Version bump**: Run `npm run version:bump X.Y.Z "description"` (after user approval)
5. **Push and submit PR to `develop`**: Triggers PR validation (ESLint + build)
6. **After merge**: Auto-deploys to dev environment for testing
7. **Production release**: Create PR from `develop` to `main`
8. **After production merge**: `sync-develop.yml` auto-syncs branches

**Reasoning**: This workflow ensures:
- All changes are validated before deployment
- Version history is tracked before PR submission
- Dev environment mirrors production deployment process
- Production requires manual approval
- Branches stay synchronized automatically

## Logging Protocol

**Backend: Pino Structured Logging**
- **Logger**: Pino with pino-http middleware ([backend/utils/logger.js](backend/utils/logger.js))
- **Dependencies**: `pino`, `pino-http`, `pino-pretty` (dev transport)
- **Log Levels**: DEBUG (dev only), INFO (prod), WARN, ERROR (always visible)
- **Environment Behavior**:
  - Development: Colored console output via pino-pretty, DEBUG level
  - Production: JSON structured logs, INFO level, integrates with GCP Cloud Logging

**HTTP Request Logging**:
- One-line format at DEBUG level (silent in production)
- Only logs: method, url, statusCode, responseTime, userId
- Health check endpoints skipped
- Pattern: `GET /api/pantry/items 200 45ms`

**Business Context Logging**:
- All features have application-level logs showing user actions
- Include relevant context: userId, homeId, item names, AI metrics
- Examples:
  - `req.log.info({ userId, homeId, itemName, location }, 'Pantry item added');`
  - `req.log.info({ userId, recipeCount, aiResponseTime }, 'Recipes generated');`
  - `req.log.error({ err, userId }, 'Failed to save recipe');`

**Sensitive Data Redaction**:
- Automatically redacts: token, idToken, authorization, apiKey, serviceAccount, password
- Safe to log: userId, uid, homeId (essential for debugging)
- Never log: API keys, Firebase tokens, service account JSON

**Frontend: Custom Lightweight Logger**
- **Logger**: Custom environment-aware logger ([frontend/src/utils/logger.js](frontend/src/utils/logger.js))
- **Zero Dependencies**: 50-line implementation to avoid bundle bloat
- **Methods**: `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`
- **Environment Behavior**:
  - Development: All logs visible in browser console
  - Production: Only errors visible (debug/info/warn silent)

**Usage Patterns**:
```javascript
// Backend - Business logging
req.log.info({ userId: req.user.uid, itemName, quantity }, 'Item added to pantry');
req.log.error({ err: error, userId: req.user.uid }, 'Failed to fetch pantry items');

// Frontend - Environment-aware
logger.debug('Fetching user profile'); // Silent in prod
logger.error('Failed to load recipes:', error); // Always visible
```

**Important**: Always use `err` as the key name for error objects in Pino logs (not `error`). This triggers Pino's built-in error serializer which includes stack traces and proper error formatting.

**Configuration**:
- Set `LOG_LEVEL` environment variable to override (debug|info|warn|error)
- GCP automatically maps Pino severity levels to Cloud Logging
- View logs: `npm run gcp:logs:prod` or GCP Console → App Engine → Logs

## Code Style
- Use functional React components with hooks
- Follow existing CSS custom property patterns
- All API endpoints require Firebase authentication
- Restart backend dev server after Node.js changes
- Use structured logging with Pino (backend) and custom logger (frontend)