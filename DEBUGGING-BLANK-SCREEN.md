# Debugging Blank Screen Issue

## 🔍 Changes Made for Debugging

I've added comprehensive debugging tools to help identify why you're getting a blank screen:

### 1. **Enhanced Error Handling**
- Added `ErrorBoundary` component that will catch React errors and show helpful error messages
- Added configuration validation on app startup
- Better error messages for missing environment variables

### 2. **Debug Console Logging**
- App now logs debug info to browser console on startup:
  - Environment details
  - Firebase configuration status
  - Authentication status

### 3. **New API Endpoints for Debugging**
- `/api/debug` - Shows server configuration status
- `/api/health` - Enhanced health check
- `/api/ready` - Readiness probe

## 🚨 Most Likely Causes

Based on your setup, the blank screen is likely caused by:

### **1. Missing Firebase Configuration** ⚠️
- **Issue**: `REACT_APP_FIREBASE_CONFIG` environment variable not set in Railway
- **Solution**: Set this variable in Railway dashboard with your Firebase config JSON

### **2. Firebase Configuration Format Error**
- **Issue**: Invalid JSON in the Firebase config
- **Solution**: Ensure proper JSON formatting (no trailing commas, proper escaping)

### **3. Backend API Connection Issues**
- **Issue**: Frontend can't reach backend API endpoints
- **Solution**: Check CORS settings and Railway deployment

## 🔧 Step-by-Step Debugging

### Step 1: Check Railway Environment Variables
1. Go to Railway dashboard → Your project → Variables
2. Ensure these are set:
   ```
   REACT_APP_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
   GEMINI_API_KEY=your_key_here
   ```

### Step 2: Test API Endpoints
Visit these URLs in your browser (replace `your-app.railway.app`):
- `https://your-app.railway.app/api/health` - Should show server status
- `https://your-app.railway.app/api/debug` - Shows configuration details
- `https://your-app.railway.app/api/ready` - Shows readiness status

### Step 3: Check Browser Console
1. Open your deployed app
2. Press F12 → Console tab
3. Look for error messages, especially:
   - "Configuration Error" messages
   - Firebase initialization errors
   - Network errors to `/api/` endpoints

### Step 4: Check Network Requests
1. F12 → Network tab
2. Refresh page
3. Look for failed requests to `/api/user/me`

## 🎯 Expected Debug Output

**Browser Console Should Show:**
```
🔧 App Debug Info:
- Environment: production
- Firebase config exists: true
- Auth object: true
- Firebase project: your-project-id
```

**If you see "Configuration Error":**
- The Firebase config is missing or invalid
- Check Railway environment variables

**If you see Network Errors:**
- Backend is not running properly
- Check Railway logs
- Verify environment variables are set

## 🛠️ Quick Fixes

### Fix 1: Firebase Config Missing
```bash
# In Railway dashboard, set:
REACT_APP_FIREBASE_CONFIG={"apiKey":"YOUR_API_KEY","authDomain":"YOUR_PROJECT.firebaseapp.com","projectId":"YOUR_PROJECT_ID","storageBucket":"YOUR_PROJECT.appspot.com","messagingSenderId":"123456789","appId":"1:123456789:web:abcdef"}
```

### Fix 2: CORS Issue
Update the CORS origin in `backend/server.js` line 42:
```javascript
origin: process.env.NODE_ENV === 'production'
  ? ['https://your-actual-railway-app.railway.app'] // Update this URL
  : ['http://localhost:3000', 'http://127.0.0.1:3000'],
```

### Fix 3: Check Railway Logs
1. Railway dashboard → Your project → Deployments
2. Click latest deployment → View Logs
3. Look for startup errors

## 📞 Next Steps

1. **Deploy the debugging changes** (push to git)
2. **Check the browser console** for error messages
3. **Visit `/api/debug` endpoint** to check server config
4. **Report what you find** - the debug info will help identify the exact issue

The enhanced error handling should now show exactly what's wrong instead of a blank screen!