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
4. **Implementation**: Update version.json + sync to package.json files

## Code Style
- Use functional React components with hooks
- Follow existing CSS custom property patterns
- All API endpoints require Firebase authentication
- Restart backend dev server after Node.js changes