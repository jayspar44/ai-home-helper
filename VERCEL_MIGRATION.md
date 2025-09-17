# Vercel Serverless Migration Complete

## 🎉 Migration Summary

Your Express.js backend has been successfully restructured for Vercel serverless deployment. All functionality has been preserved while converting to the serverless architecture.

## 📁 New Project Structure

```
/
├── api/                          # Vercel serverless functions
│   ├── health.js                 # GET /api/health
│   ├── register.js               # POST /api/register
│   ├── generate-recipe.js        # POST /api/generate-recipe
│   ├── user/
│   │   └── me.js                 # GET /api/user/me
│   ├── homes/
│   │   ├── add-member.js         # POST /api/homes/add-member
│   │   └── [homeId].js           # Dynamic routes for homes/{homeId}/members
│   ├── recipes/
│   │   ├── list.js               # POST /api/recipes/list
│   │   └── save.js               # POST /api/recipes/save
│   └── pantry/
│       ├── suggest-item.js       # POST /api/pantry/suggest-item
│       ├── quick-defaults.js     # POST /api/pantry/quick-defaults
│       ├── [homeId].js           # GET/POST /api/pantry/{homeId}
│       └── [homeId]/
│           ├── [itemId].js       # PUT/DELETE /api/pantry/{homeId}/{itemId}
│           └── detect-items.js   # POST /api/pantry/{homeId}/detect-items
├── utils/                        # Shared utilities
│   ├── firebase.js               # Firebase Admin setup
│   ├── gemini.js                 # Gemini AI setup
│   ├── auth.js                   # Authentication middleware
│   ├── cors.js                   # CORS handling
│   └── recipe-helpers.js         # Recipe generation helpers
├── backend/                      # Original Express app (keep for reference)
├── frontend/                     # Your React frontend
├── vercel.json                   # Vercel configuration
└── package.json                  # Updated with new scripts
```

## 🚀 Deployment Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Set Environment Variables in Vercel
You'll need to configure these environment variables in Vercel:

- `FIREBASE_SERVICE_ACCOUNT` - Your Firebase service account JSON (as secret)
- `GEMINI_API_KEY` - Your Gemini API key (as secret)

#### Via Vercel CLI:
```bash
vercel env add FIREBASE_SERVICE_ACCOUNT
vercel env add GEMINI_API_KEY
```

#### Via Vercel Dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add each variable as type "Secret"

### 3. Deploy to Vercel
```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## 🔄 Key Changes Made

### Architecture Changes
- **Serverless Functions**: Each Express route converted to individual serverless function
- **Shared Utilities**: Common code (Firebase, Gemini, auth) moved to `/utils` folder  
- **CORS Handling**: Each function handles CORS independently
- **File Uploads**: Modified for Vercel's serverless environment

### Route Mappings
| Original Express Route | New Serverless Function |
|----------------------|-------------------------|
| `GET /api/health` | `api/health.js` |
| `POST /api/register` | `api/register.js` |
| `GET /api/user/me` | `api/user/me.js` |
| `POST /api/homes/add-member` | `api/homes/add-member.js` |
| `GET /api/homes/:homeId/members` | `api/homes/[homeId].js` |
| `POST /api/recipes/list` | `api/recipes/list.js` |
| `POST /api/generate-recipe` | `api/generate-recipe.js` |
| `GET /api/pantry/:homeId` | `api/pantry/[homeId].js` |
| `POST /api/pantry/:homeId/detect-items` | `api/pantry/[homeId]/detect-items.js` |

### File Upload Changes
- **AI Detection**: Now expects base64 image data instead of multipart form uploads
- **Frontend Update**: You'll need to modify your frontend to send base64 data for image uploads

## 🧪 Local Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
# or
vercel dev
```

The local development server will run on `http://localhost:3000`

## 🔧 Frontend Updates Needed

### 1. Update API Base URL
If your frontend was pointing to `http://localhost:3001`, update to use the new Vercel URLs:
- Development: `http://localhost:3000` (when using `vercel dev`)
- Production: Your Vercel domain

### 2. File Upload Changes
For the AI detection endpoint (`/api/pantry/{homeId}/detect-items`), update your frontend to send base64 data:

```javascript
// Instead of FormData, send JSON with base64
const fileReader = new FileReader();
fileReader.onload = () => {
  const base64 = fileReader.result.split(',')[1]; // Remove data:image/jpeg;base64,
  
  fetch(`/api/pantry/${homeId}/detect-items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType: file.type
    })
  });
};
fileReader.readAsDataURL(file);
```

## ✅ Preserved Features

- ✅ Firebase Admin authentication
- ✅ Gemini AI recipe generation
- ✅ All CRUD operations for recipes and pantry items
- ✅ Home management and member operations
- ✅ AI-powered pantry item detection
- ✅ File upload handling (modified for serverless)
- ✅ Error handling and validation
- ✅ CORS support

## 🗑️ What You Can Remove

After successful deployment and testing, you can safely remove:
- `backend/` folder (original Express app)
- Any Express-specific development dependencies

## 🚨 Important Notes

1. **Cold Starts**: First requests to idle functions may be slower due to cold starts
2. **File Uploads**: Modified to work with serverless limitations
3. **Environment Variables**: Must be set in Vercel dashboard or CLI
4. **Database**: Firebase Firestore works perfectly with serverless functions
5. **Timeouts**: Vercel functions have execution limits (10s on hobby, 15s on pro)

## 🎯 Next Steps

1. Test all endpoints locally with `vercel dev`
2. Update your frontend for the file upload changes
3. Set environment variables in Vercel
4. Deploy to production
5. Update your domain DNS if needed
6. Monitor function performance in Vercel dashboard

Your Express.js backend is now ready for Vercel's serverless platform! 🎉