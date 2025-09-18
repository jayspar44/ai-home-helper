# Roscoe - AI Home Helper

## 🏠 Application Overview

**Roscoe** is a smart home helper application that combines AI-powered recipe generation, intelligent pantry management, and collaborative home administration. Built for families and households who want to reduce food waste, discover new recipes, and efficiently manage their kitchen inventory.

### Key Features
- **AI Recipe Generator**: Create personalized recipes based on available pantry ingredients using Google Gemini AI
- **Intelligent Pantry Management**: Track items across pantry, fridge, and freezer with AI-assisted photo recognition
- **Multi-User Home Management**: Invite family members with role-based access (admin/member)
- **Responsive Design**: Mobile-first design that works across all devices

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + Create React App, CSS custom properties, responsive design
- **Backend**: Node.js + Express.js with Firebase Admin SDK
- **Database**: Firebase Firestore (multi-tenant with homes/users collections)
- **Authentication**: Firebase Authentication
- **AI Services**: Google Gemini API for recipe generation and image recognition
- **Deployment**: Railway (with nixpacks)

### Directory Structure
```
├── frontend/          # React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React contexts
│   │   ├── hooks/        # Custom hooks
│   │   └── firebase.js   # Firebase config
│   └── public/
├── backend/           # Node.js API server
│   ├── server.js         # Main server file
│   └── uploads/         # Temporary file uploads
└── nixpacks.toml     # Railway deployment config
```

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+ and npm
- Firebase project with Firestore enabled
- Google Gemini API key

### 1. Environment Configuration

#### Frontend Configuration
1. Copy `frontend/.env.local.template` to `frontend/.env.local`
2. Get Firebase configuration from Firebase Console > Project Settings > General > Your apps
3. Format as single JSON string for `REACT_APP_FIREBASE_CONFIG`:
```bash
REACT_APP_FIREBASE_CONFIG={"apiKey":"your-api-key","authDomain":"project.firebaseapp.com","projectId":"project-id","storageBucket":"project.appspot.com","messagingSenderId":"123456789","appId":"1:123456789:web:abc123"}
```

#### Backend Configuration
1. Copy `backend/.env.example` to `backend/.env`
2. Get Firebase Admin SDK key from Firebase Console > Project Settings > Service Accounts > Generate new private key
3. Get Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
4. Fill in the values:
```bash
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...} # Full JSON from Firebase
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
NODE_ENV=development
```

### 2. Installation & Running

```bash
# Install all dependencies (root, frontend, backend)
npm run install-all

# Run full stack development (opens both frontend and backend)
npm run dev:local

# Or run individually:
# Backend only
cd backend && npm run dev

# Frontend only (in separate terminal)
cd frontend && npm start
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### 3. Database Structure

#### Collections
- `users/` - User profiles and home associations
- `homes/` - Home documents with member roles
- `homes/{homeId}/pantry_items/` - Pantry inventory per home
- `homes/{homeId}/recipes/` - Saved recipes per home

#### Key Data Models
```javascript
// User document
{
  name: "John Doe",
  email: "john@example.com",
  primaryHomeId: "home123",
  homes: { "home123": "admin", "home456": "member" }
}

// Home document
{
  name: "John's Home",
  members: { "userId1": "admin", "userId2": "member" }
}

// Pantry item
{
  name: "Milk",
  location: "fridge", // pantry|fridge|freezer
  quantity: "1 gallon",
  daysUntilExpiry: 7,
  expiresAt: Date,
  createdBy: "userId",
  confidence: 0.9 // AI detection confidence
}
```

## 🔧 Development Workflow

### Key Commands
```bash
# Development
npm run dev:local           # Run full stack locally
npm run build              # Build frontend only
npm run install-all        # Install all dependencies

# Backend specific (from /backend)
npm run dev                # Run with nodemon
npm start                 # Run production mode

# Frontend specific (from /frontend)
npm start                 # Development server
npm run build             # Production build

# Version Management
npm run version:get        # Get current version
npm run version:bump       # Bump version with description
npm run version:analyze    # Analyze change description for bump type
```

### Claude Code Version Management Protocol

**IMPORTANT**: When Claude Code makes changes to the codebase, it should ALWAYS run the version updater before suggesting commits. This ensures proper semantic versioning and maintains an accurate changelog.

**Required Steps for Claude Code:**
1. After completing any changes to the codebase, analyze what was modified
2. Run: `node scripts/version-manager.js bump "description of changes made"`
3. The system will automatically:
   - Determine if changes are patch/minor/major
   - Update version.json with timestamp and changelog
   - Sync version across all package.json files
   - Generate appropriate semantic version bump

**Examples:**
```bash
# For UI/styling changes, bug fixes
node scripts/version-manager.js bump "Fix layout issues and update dark theme colors"

# For new features
node scripts/version-manager.js bump "Add new recipe sharing feature with social integration"

# For breaking changes
node scripts/version-manager.js bump "Remove deprecated API endpoints and update authentication system"
```

### API Endpoints

#### Authentication (all require Firebase ID token in Authorization header)
- `POST /api/register` - Create new user and home
- `GET /api/user/me` - Get current user profile

#### Home Management
- `GET /api/homes/:homeId/members` - Get home members
- `POST /api/homes/:homeId/members` - Add member by email
- `DELETE /api/homes/:homeId/members/:memberId` - Remove member

#### Pantry Management
- `GET /api/pantry/:homeId` - Get all pantry items
- `POST /api/pantry/:homeId` - Add new item
- `PUT /api/pantry/:homeId/:itemId` - Update item
- `DELETE /api/pantry/:homeId/:itemId` - Delete item
- `POST /api/pantry/:homeId/detect-items` - AI photo detection

#### Recipe Generation
- `POST /api/generate-recipe` - Generate recipes from ingredients
- `POST /api/recipes/save` - Save recipe to home
- `POST /api/recipes/list` - Get saved recipes

## 🚀 Railway Deployment

### Environment Variables (Set in Railway Dashboard)
```bash
# Firebase Configuration (Frontend)
REACT_APP_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}

# Firebase Admin SDK (Backend)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}

# Google Gemini AI
GEMINI_API_KEY=your_production_gemini_key

# Server Configuration
NODE_ENV=production
DISABLE_ESLINT_PLUGIN=true
CI=false
```

### Deployment Process
1. Connect Railway to your GitHub repository
2. Set environment variables in Railway dashboard
3. Railway auto-deploys on git push to main branch
4. Build process defined in `nixpacks.toml`

## 🐛 Common Issues & Troubleshooting

### Firebase Configuration Issues
- **Error**: "Firebase config is missing required fields"
- **Fix**: Ensure `REACT_APP_FIREBASE_CONFIG` is valid JSON with all required fields

### Backend Startup Issues
- **Error**: "Failed to initialize Firebase Admin SDK"
- **Fix**: Check `FIREBASE_SERVICE_ACCOUNT` JSON format and permissions

### AI Features Not Working
- **Error**: Recipe generation or image detection failing
- **Fix**: Verify `GEMINI_API_KEY` is valid and has necessary permissions

### CORS Issues in Development
- **Error**: Frontend can't reach backend API
- **Fix**: Ensure backend is running on port 3001 and frontend on 3000

## 📝 Development Notes

### Code Style
- Use functional React components with hooks
- Follow existing CSS custom property patterns
- Use Firebase security rules for data access control
- Error handling should be user-friendly

### Performance Considerations
- Firestore queries are optimized with indexes
- Large images are automatically resized for AI processing
- Frontend uses lazy loading for better UX

### Security
- All API endpoints require Firebase authentication
- Environment files are gitignored
- Firebase Admin SDK validates all requests
- User access to homes is validated on every request

## 🔄 Recent Updates & TODO

### Current TODO Items (from `/todo` file)
1. Refactor database for expiry date, not days to expire
2. Change user logout to separate page from home admin
3. Allow dietary preferences at user/home level
4. Improve recipe prompt handling and diversity
5. Ensure reliable expiry date setting with AI suggestions
6. Make AI suggestions faster
7. Prevent non-food items in pantry
8. Sort out dark scheme colors
9. Better recipe page layout
10. Review storing additional pantry item metadata

### Version Information
- Current version: 1.0.0
- Last major update: September 2024
- Node.js: 18+
- React: 18.3.1
- Firebase: 9.17.2