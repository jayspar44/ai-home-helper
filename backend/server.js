// server.js - Home Helper Backend API

// Load environment variables from .env file (for local development)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const admin = require('firebase-admin');
const logger = require('./utils/logger');
const pinoHttp = require('pino-http');
const { loadAllSecrets, isGCP, getProjectId } = require('./utils/secrets');
const { parseShoppingListItem } = require('./services/shoppingListAI');
const { generateRecipes, generateRoscoesChoiceRecipe, generateCustomRecipe, matchIngredientsToPantry } = require('./services/recipeAI');
const { suggestPantryItem, getQuickDefaults, detectItemsFromImage } = require('./services/pantryAI');
const { version } = require('../version.json');
const { aiRateLimiter } = require('./middleware/rateLimiter');

// --- Global Variables (initialized after secrets load) ---
let db;
let genAI;
let secrets;
const app = express();
let port = process.env.PORT || 3001;
const multer = require('multer');
const fs = require('fs');

// --- Async Initialization ---
async function initializeServices() {
  logger.info({ version }, 'Initializing Home Helper Backend');

  try {
    // Load secrets (from Secret Manager in GCP, from .env locally)
    secrets = await loadAllSecrets();

    // Initialize Firebase Admin SDK
    logger.info('Initializing Firebase Admin SDK');
    const serviceAccount = JSON.parse(secrets.firebaseServiceAccount);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    logger.info('Firebase Admin SDK initialized successfully');

    // Initialize Gemini AI
    logger.info('Initializing Gemini AI');
    genAI = new GoogleGenerativeAI(secrets.geminiApiKey);
    logger.info('Gemini AI initialized successfully');

  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize services');
    process.exit(1);
  }
}

// Production optimizations and middleware
if (process.env.NODE_ENV === 'production') {
  // Trust Railway proxy
  app.set('trust proxy', 1);

  // Disable x-powered-by header for security
  app.disable('x-powered-by');
}

// Configure CORS early (before routes)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://localhost:3000',
  'https://127.0.0.1:3000',
  'http://localhost:3001',  // Allow proxy origin for development (webpack dev server)
  'http://127.0.0.1:3001'
];

// Add GCP URLs if running on GCP
if (isGCP()) {
  try {
    const projectId = getProjectId();
    allowedOrigins.push(
      `https://${projectId}.uc.r.appspot.com`,           // Production (default service)
      `https://dev-dot-${projectId}.uc.r.appspot.com`    // Dev service
    );
    logger.info({ projectId }, 'CORS configured for GCP project');
  } catch (error) {
    logger.warn({ err: error }, 'Could not determine project ID for CORS');
  }
}

const corsOptions = {
  origin: (origin, callback) => {
    // Normalize origin by removing trailing slash for comparison
    const normalizedOrigin = origin ? origin.replace(/\/$/, '') : origin;

    // Debug logging
    console.log('[CORS Debug]', {
      originalOrigin: origin,
      normalizedOrigin,
      allowedOrigins,
      isAllowed: !origin || allowedOrigins.includes(normalizedOrigin)
    });

    if (!origin || allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      logger.warn({ origin, normalizedOrigin, allowedOrigins }, 'CORS blocked origin');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
logger.info({ originCount: allowedOrigins.length }, 'CORS enabled');

// Request parsing middleware
app.use(express.json({ limit: '10mb' })); // Increased for image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging - minimal one-line format
app.use(pinoHttp({
  logger,
  autoLogging: {
    ignore: req => req.url === '/api/health' || req.url === '/api/ready'
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 400 && res.statusCode < 500) return 'warn'
    if (res.statusCode >= 500 || err) return 'error'
    return 'debug' // Normal requests at DEBUG (hidden in prod)
  },
  customSuccessMessage: (req, _res) => {
    return `${req.method} ${req.url}`
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} - ${err.message}`
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      userId: req.user?.uid
    }),
    res: (res) => ({
      statusCode: res.statusCode
    })
  }
}))

// --- Authentication Middleware ---
const checkAuth = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const idToken = req.headers.authorization.split('Bearer ')[1];

    try {
      req.user = await admin.auth().verifyIdToken(idToken);
      next();
    } catch (error) {
      req.log.error({ err: error }, 'Token verification failed');
      res.status(401).send('Unauthorized: Invalid token');
    }
  } else {
    req.log.warn('No authorization header found');
    res.status(401).send('Unauthorized: No token provided');
  }
};

// --- API Routes ---

// Enhanced health check endpoint for Railway and monitoring
app.get('/api/health', (req, res) => {
  // Read version from root version.json
  let version = 'unknown'; // fallback
  try {
    const versionPath = path.join(__dirname, '..', 'version.json');
    const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    version = versionData.version;
  } catch (error) {
    logger.warn({ err: error }, 'Could not read root version.json, using fallback');
  }

  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: version,
    services: {
      firebase: admin.apps.length > 0 ? 'connected' : 'disconnected',
      gemini: genAI ? 'configured' : 'not configured'
    }
  };

  res.status(200).json(healthCheck);
});

// Readiness probe for App Engine and Railway
app.get('/api/ready', (req, res) => {
  // Check if critical services are ready
  if (admin.apps.length === 0) {
    return res.status(503).json({ status: 'Service Unavailable', reason: 'Firebase not initialized' });
  }

  if (!genAI) {
    return res.status(503).json({ status: 'Service Unavailable', reason: 'Gemini AI not configured' });
  }

  res.status(200).json({ status: 'Ready' });
});

// Debug endpoint to help troubleshoot deployment issues
app.get('/api/debug', (req, res) => {
  const debugInfo = {
    status: 'debug',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    // Read version from root version.json
    version: (() => {
      try {
        const versionPath = path.join(__dirname, '..', 'version.json');
        const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
        return versionData.version;
      } catch (error) {
        logger.warn({ err: error }, 'Could not read root version.json in debug endpoint');
        return 'unknown'; // fallback
      }
    })(),
    firebase: {
      adminApps: admin.apps.length,
      serviceAccountConfigured: !!secrets?.firebaseServiceAccount,
      serviceAccountValid: false
    },
    gemini: {
      configured: !!genAI,
      keyLength: secrets?.geminiApiKey ? secrets.geminiApiKey.length : 0
    },
    server: {
      port: process.env.PORT || 3001,
      uptime: process.uptime()
    }
  };

  // Test Firebase service account JSON parsing
  if (secrets?.firebaseServiceAccount) {
    try {
      const serviceAccount = JSON.parse(secrets.firebaseServiceAccount);
      debugInfo.firebase.serviceAccountValid = !!(serviceAccount.project_id && serviceAccount.private_key);
      debugInfo.firebase.projectId = serviceAccount.project_id;
    } catch (error) {
      debugInfo.firebase.serviceAccountError = error.message;
    }
  }

  res.status(200).json(debugInfo);
});

app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const userRecord = await admin.auth().createUser({ email, password, displayName: name });
    const homeRef = await db.collection('homes').add({
      name: `${name}'s Home`,
      members: { [userRecord.uid]: 'admin' }
    });
    await db.collection('users').doc(userRecord.uid).set({
      name,
      email,
      primaryHomeId: homeRef.id,
      homes: { [homeRef.id]: 'admin' }
    });
    logger.info({ userId: userRecord.uid, email, name, homeId: homeRef.id }, 'User registered');
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    let errorMessage = 'Failed to create user.';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'This email address is already in use.';
    } else if (error.code === 'auth/invalid-password') {
        errorMessage = 'Password is not valid. It must be at least 6 characters long.';
    }
    logger.error({ err: error, email: req.body.email }, 'User registration failed');
    res.status(400).json({ error: errorMessage });
  }
});

app.get('/api/user/me', checkAuth, async (req, res) => {
    try {
        req.log.debug({ userId: req.user.uid }, 'Fetching user profile');

        // First verify the user exists in Firestore
        const userDoc = await db.collection('users').doc(req.user.uid).get();

        if (!userDoc.exists) {
            req.log.info({ userId: req.user.uid }, 'Creating new user document');
            // Create user document if it doesn't exist
            const userData = {
                uid: req.user.uid,
                email: req.user.email,
                name: req.user.displayName || '',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('users').doc(req.user.uid).set(userData);
        }

        // Get user data (either existing or newly created)
        const userData = userDoc.exists ? userDoc.data() : {};

        // Fetch homes where user is a member
        const homesSnapshot = await db.collection('homes')
            .where(`members.${req.user.uid}`, 'in', ['member', 'admin'])
            .get();

        const homes = [];
        homesSnapshot.forEach(doc => {
            homes.push({
                id: doc.id,
                ...doc.data(),
                role: doc.data().members[req.user.uid]
            });
        });

        const response = {
            uid: req.user.uid,
            email: req.user.email,
            name: userData.name || req.user.displayName || '',
            homes: homes,
            primaryHomeId: userData.primaryHomeId || (homes[0]?.id || null)
        };

        req.log.info({ userId: req.user.uid, homeCount: homes.length }, 'Profile fetched successfully');
        res.json(response);

    } catch (error) {
        req.log.error({ err: error, userId: req.user.uid }, 'Error fetching user profile');
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Update user profile (name)
app.put('/api/user/me', checkAuth, async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.uid;

        req.log.debug({ userId, newName: name }, 'Updating user profile');

        // Validate name
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            req.log.warn({ userId }, 'Invalid name provided');
            return res.status(400).json({ error: 'Name is required and must be a non-empty string.' });
        }

        if (name.trim().length > 100) {
            req.log.warn({ userId }, 'Name too long');
            return res.status(400).json({ error: 'Name must be 100 characters or less.' });
        }

        // Update user document in Firestore
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            name: name.trim(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Fetch updated user data
        const updatedUserDoc = await userRef.get();
        const userData = updatedUserDoc.data();

        // Fetch homes where user is a member
        const homesSnapshot = await db.collection('homes')
            .where(`members.${userId}`, 'in', ['member', 'admin'])
            .get();

        const homes = [];
        homesSnapshot.forEach(doc => {
            homes.push({
                id: doc.id,
                ...doc.data(),
                role: doc.data().members[userId]
            });
        });

        const response = {
            uid: userId,
            email: req.user.email,
            name: userData.name,
            homes: homes,
            primaryHomeId: userData.primaryHomeId || (homes[0]?.id || null)
        };

        req.log.info({ userId, newName: name.trim() }, 'User profile updated successfully');
        res.json(response);

    } catch (error) {
        req.log.error({ err: error, userId: req.user.uid }, 'Error updating user profile');
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.post('/api/homes/add-member', checkAuth, async (req, res) => {
    try {
        const { homeId, newUserEmail } = req.body;
        const adminId = req.user.uid;
        const userToAddRecord = await admin.auth().getUserByEmail(newUserEmail);
        const userToAddId = userToAddRecord.uid;
        const homeRef = db.collection('homes').doc(homeId);
        const userToAddRef = db.collection('users').doc(userToAddId);

        await db.runTransaction(async (transaction) => {
            const homeDoc = await transaction.get(homeRef);
            if (!homeDoc.exists) throw new Error("Home not found.");
            const homeData = homeDoc.data();
            if (homeData.members[adminId] !== 'admin') {
                throw new Error("You don't have permission to add members to this home.");
            }
            transaction.update(homeRef, { [`members.${userToAddId}`]: 'member' });
            transaction.update(userToAddRef, { [`homes.${homeId}`]: 'member' });
        });

        res.status(200).json({ message: `User ${newUserEmail} added to home successfully.` });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/homes/:homeId/members', checkAuth, async (req, res) => {
    try {
        const { homeId } = req.params;
        const homeDoc = await db.collection('homes').doc(homeId).get();
        if (!homeDoc.exists) {
            return res.status(404).json({ error: 'Home not found.' });
        }
        const homeData = homeDoc.data();
        const memberIds = Object.keys(homeData.members);
        
        const memberProfiles = [];
        for (const memberId of memberIds) {
            const userDoc = await db.collection('users').doc(memberId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                memberProfiles.push({
                    id: memberId,
                    name: userData.name,
                    email: userData.email,
                    role: homeData.members[memberId]
                });
            }
        }
        res.json(memberProfiles);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch home members.' });
    }
});

app.delete('/api/homes/:homeId/members/:memberId', checkAuth, async (req, res) => {
    const { homeId, memberId } = req.params;
    const adminId = req.user.uid;

    try {
        const homeRef = db.collection('homes').doc(homeId);
        const memberRef = db.collection('users').doc(memberId);

        await db.runTransaction(async (transaction) => {
            const homeDoc = await transaction.get(homeRef);
            if (!homeDoc.exists) throw new Error("Home not found.");

            const homeData = homeDoc.data();
            if (homeData.members[adminId] !== 'admin') {
                throw new Error("You do not have permission to remove members.");
            }
            if (adminId === memberId) {
                throw new Error("Admins cannot remove themselves.");
            }

            transaction.update(homeRef, { [`members.${memberId}`]: admin.firestore.FieldValue.delete() });
            transaction.update(memberRef, { [`homes.${homeId}`]: admin.firestore.FieldValue.delete() });
        });

        logger.info({ homeId, adminId, memberId }, 'Member removed from home');
        res.status(200).json({ message: 'Member removed successfully.' });
    } catch (error) {
        logger.error({ err: error, homeId, memberId, adminId }, 'Error removing member');
        res.status(400).json({ error: error.message });
    }
});

// Update home details (name)
app.put('/api/homes/:homeId', checkAuth, async (req, res) => {
    try {
        const { homeId } = req.params;
        const { name } = req.body;
        const userId = req.user.uid;

        req.log.debug({ homeId, userId, newName: name }, 'Updating home details');

        // Validate name
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            req.log.warn({ homeId, userId }, 'Invalid home name provided');
            return res.status(400).json({ error: 'Name is required and must be a non-empty string.' });
        }

        if (name.trim().length > 100) {
            req.log.warn({ homeId, userId }, 'Home name too long');
            return res.status(400).json({ error: 'Name must be 100 characters or less.' });
        }

        // Check if home exists and user is an admin
        const homeRef = db.collection('homes').doc(homeId);
        const homeDoc = await homeRef.get();

        if (!homeDoc.exists) {
            req.log.warn({ homeId, userId }, 'Home not found');
            return res.status(404).json({ error: 'Home not found.' });
        }

        const homeData = homeDoc.data();

        // Verify user is an admin
        if (homeData.members[userId] !== 'admin') {
            req.log.warn({ homeId, userId }, 'User is not admin - permission denied');
            return res.status(403).json({ error: 'Only admins can update home details.' });
        }

        // Update home name
        await homeRef.update({
            name: name.trim(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Fetch updated home data
        const updatedHomeDoc = await homeRef.get();
        const updatedHomeData = updatedHomeDoc.data();

        const response = {
            id: homeId,
            ...updatedHomeData,
            role: homeData.members[userId]
        };

        req.log.info({ homeId, userId, newName: name.trim() }, 'Home updated successfully');
        res.json(response);

    } catch (error) {
        req.log.error({ err: error, homeId: req.params.homeId, userId: req.user.uid }, 'Error updating home');
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// --- PROTECTED Recipe Routes ---
app.post('/api/recipes/list', checkAuth, async (req, res) => {
  try {
    const { homeId } = req.body;
    req.log.debug({ homeId, userId: req.user.uid }, 'Fetching recipes list');

    if (!homeId) {
      req.log.warn({ userId: req.user.uid }, 'No homeId provided');
      return res.status(400).json({ error: "homeId is required." });
    }

    const recipesSnapshot = await db.collection('homes').doc(homeId).collection('recipes').get();
    const recipeList = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    req.log.info({ homeId, userId: req.user.uid, recipeCount: recipeList.length }, 'Recipes fetched successfully');
    res.json({ recipes: recipeList });
  } catch (error) {
    req.log.error({ err: error, homeId: req.body.homeId, userId: req.user.uid }, 'Error fetching recipes');
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

app.post('/api/recipes/save', checkAuth, async (req, res) => {
  try {
    const { homeId, recipe } = req.body;
    if (!homeId || !recipe) return res.status(400).json({ error: "homeId and recipe are required." });
    const docRef = await db.collection('homes').doc(homeId).collection('recipes').add(recipe);
    req.log.info({ homeId, userId: req.user.uid, recipeTitle: recipe.title, recipeId: docRef.id }, 'Recipe saved');
    res.status(201).json({ id: docRef.id, ...recipe });
  } catch (error) {
    req.log.error({ err: error, homeId: req.body.homeId, userId: req.user.uid }, 'Error saving recipe');
    res.status(500).json({ error: 'Failed to save recipe' });
  }
});

app.post('/api/generate-recipe', checkAuth, aiRateLimiter, async (req, res) => {
    try {
        const {
            ingredients,
            servingSize,
            dietaryRestrictions,
            recipeType = 'quick',
            generateCount = 1,
            pantryItems = []
        } = req.body;

        if (!ingredients || ingredients.length === 0) {
            return res.status(400).json({ error: 'Ingredients are required' });
        }

        const startTime = Date.now();
        req.log.info({ userId: req.user.uid, ingredientCount: ingredients.length, recipeType, servingSize, generateCount }, 'Generating recipes with AI (legacy endpoint)');

        // Generate recipe(s) using AI service
        const result = await generateRecipes({
            ingredients,
            servingSize,
            dietaryRestrictions,
            recipeType,
            pantryItems,
            generateCount
        }, genAI, req.log);

        const aiResponseTime = Date.now() - startTime;

        // Handle multiple recipes
        if (generateCount > 1) {
            req.log.info({ userId: req.user.uid, recipesGenerated: result.length, aiResponseTime }, 'Recipes generated');
            return res.json(result);
        }

        // Handle single recipe
        req.log.info({ userId: req.user.uid, recipeTitle: result.title, aiResponseTime }, 'Recipe generated');
        res.json(result);
    } catch (error) {
        req.log.error({ err: error, userId: req.user.uid }, 'Error generating recipe');
        res.status(500).json({
            error: 'Failed to generate recipe',
            details: error.message
        });
    }
});

// Roscoe's Choice - Pantry-focused recipe generation
app.post('/api/generate-recipe/roscoes-choice', checkAuth, aiRateLimiter, async (req, res) => {
  try {
    const {
      homeId,
      mode,
      numberOfPeople,
      quickMealsOnly,
      prioritizeExpiring,
      numberOfRecipes
    } = req.body;

    const userUid = req.user.uid;

    if (!homeId) {
      return res.status(400).json({ error: 'homeId is required' });
    }

    if (!mode || !['pantry_only', 'pantry_plus_shopping'].includes(mode)) {
      return res.status(400).json({ error: 'mode must be "pantry_only" or "pantry_plus_shopping"' });
    }

    // Fetch ALL pantry items for the home
    const pantrySnapshot = await db.collection('homes')
      .doc(homeId)
      .collection('pantry_items')
      .get();

    const pantryItems = [];
    pantrySnapshot.forEach(doc => {
      const data = doc.data();
      const daysUntilExpiry = data.expiresAt
        ? Math.ceil((data.expiresAt.toDate() - new Date()) / (1000 * 60 * 60 * 24))
        : null;

      pantryItems.push({
        id: doc.id,
        name: data.name,
        quantity: data.quantity,
        location: data.location,
        expiresAt: data.expiresAt,
        daysUntilExpiry
      });
    });

    req.log.info({
      userId: userUid,
      homeId,
      mode,
      pantryItemCount: pantryItems.length,
      numberOfRecipes: numberOfRecipes || 1
    }, 'Generating Roscoe\'s Choice recipe(s)');

    const result = await generateRoscoesChoiceRecipe({
      pantryItems,
      mode,
      numberOfPeople: numberOfPeople || 2,
      quickMealsOnly: quickMealsOnly || false,
      prioritizeExpiring: prioritizeExpiring || false,
      numberOfRecipes: numberOfRecipes || 1
    }, genAI, req.log);

    // Handle refusal
    if (result.success === false) {
      return res.status(400).json({
        error: 'Recipe generation refused',
        reason: result.refusalReason,
        suggestions: result.suggestions
      });
    }

    // Handle multiple recipes
    if (Array.isArray(result)) {
      const { v4: uuidv4 } = require('uuid');
      const variationFamily = uuidv4();

      const recipes = result.map((recipe, index) => ({
        ...recipe,
        createdBy: userUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        homeId,
        generationMode: 'roscoes_choice',
        generationParams: {
          mode,
          numberOfPeople: numberOfPeople || 2,
          quickMealsOnly: quickMealsOnly || false,
          prioritizeExpiring: prioritizeExpiring || false,
          numberOfRecipes: numberOfRecipes || 1
        },
        variationNumber: index + 1,
        variationFamily
      }));

      return res.json(recipes);
    }

    // Single recipe
    const recipe = {
      ...result,
      createdBy: userUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      homeId,
      generationMode: 'roscoes_choice',
      generationParams: {
        mode,
        numberOfPeople: numberOfPeople || 2,
        quickMealsOnly: quickMealsOnly || false,
        prioritizeExpiring: prioritizeExpiring || false
      }
    };

    res.json(recipe);
  } catch (error) {
    req.log.error({ err: error, userId: req.user.uid }, 'Error in Roscoe\'s Choice generation');
    res.status(500).json({ error: 'Failed to generate recipe' });
  }
});

// Customize - User-driven recipe generation with constraints
app.post('/api/generate-recipe/customize', checkAuth, aiRateLimiter, async (req, res) => {
  try {
    const {
      homeId,
      aiPrompt,
      cuisines,
      proteins,
      preferences,
      numberOfRecipes,
      servingSize,
      specificIngredients,
      pantryMode
    } = req.body;

    const userUid = req.user.uid;

    if (!homeId) {
      return res.status(400).json({ error: 'homeId is required' });
    }

    // Default to ignore_pantry if not specified
    const mode = pantryMode || 'ignore_pantry';

    // Fetch pantry items (needed for all modes except ignore_pantry for full isolation)
    let pantryItems = [];

    if (mode !== 'ignore_pantry') {
      const pantrySnapshot = await db.collection('homes')
        .doc(homeId)
        .collection('pantry_items')
        .get();

      pantrySnapshot.forEach(doc => {
        const data = doc.data();
        const daysUntilExpiry = data.expiresAt
          ? Math.ceil((data.expiresAt.toDate() - new Date()) / (1000 * 60 * 60 * 24))
          : null;

        pantryItems.push({
          id: doc.id,
          name: data.name,
          quantity: data.quantity,
          daysUntilExpiry
        });
      });
    }

    req.log.info({
      userId: userUid,
      homeId,
      pantryMode: mode,
      numberOfRecipes: numberOfRecipes || 1,
      aiPrompt: aiPrompt || '(none)',
      hasCuisines: !!(cuisines && cuisines.length > 0),
      hasProteins: !!(proteins && proteins.length > 0)
    }, 'Generating custom recipe(s)');

    const result = await generateCustomRecipe({
      aiPrompt,
      cuisines: cuisines || [],
      proteins: proteins || [],
      preferences: preferences || [],
      numberOfRecipes: numberOfRecipes || 1,
      servingSize: servingSize || 2,
      pantryItems,
      specificIngredients: specificIngredients || [],
      pantryMode: mode
    }, genAI, req.log);

    // Handle refusal
    if (result.success === false) {
      return res.status(400).json({
        error: 'Recipe generation refused',
        reason: result.refusalReason,
        suggestions: result.suggestions
      });
    }

    // Handle multiple recipes (always array for customize)
    const { v4: uuidv4 } = require('uuid');
    const variationFamily = (numberOfRecipes || 1) > 1 ? uuidv4() : null;

    const recipes = Array.isArray(result) ? result : [result];

    const enhancedRecipes = recipes.map((recipe, index) => ({
      ...recipe,
      createdBy: userUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      homeId,
      generationMode: 'customize',
      generationParams: {
        aiPrompt,
        cuisines: cuisines || [],
        proteins: proteins || [],
        preferences: preferences || [],
        numberOfRecipes: numberOfRecipes || 1,
        servingSize: servingSize || 2,
        pantryMode: mode,
        specificIngredients: specificIngredients || []
      },
      ...(variationFamily && {
        variationNumber: index + 1,
        variationFamily
      })
    }));

    res.json(enhancedRecipes);
  } catch (error) {
    req.log.error({ err: error, userId: req.user.uid }, 'Error in Customize generation');
    res.status(500).json({ error: 'Failed to generate recipe' });
  }
});

// Add new member to home
app.post('/api/homes/:homeId/members', checkAuth, async (req, res) => {
  try {
    const { homeId } = req.params;
    const { email } = req.body;
    const requesterUid = req.user.uid;

    // Validate email
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get the home document
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists) {
      return res.status(404).json({ error: 'Home not found' });
    }

    // Check if requester is admin
    const homeData = homeDoc.data();
    if (homeData.members[requesterUid] !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add members' });
    }

    // Find user by email
    const userSnapshot = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newMemberDoc = userSnapshot.docs[0];
    const newMemberId = newMemberDoc.id;

    // Check if already a member
    if (homeData.members[newMemberId]) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // Add member to home
    await homeDoc.ref.update({
      [`members.${newMemberId}`]: 'member'
    });

    // Return the new member info
    res.json({
      id: newMemberId,
      email: newMemberDoc.data().email,
      name: newMemberDoc.data().name,
      role: 'member'
    });

    req.log.info({ homeId, adminId: requesterUid, newMemberEmail: email, newMemberId }, 'Member added to home');

  } catch (error) {
    req.log.error({ err: error, homeId: req.params.homeId, email: req.body.email, userId: req.user.uid }, 'Error adding member');
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// --- Pantry API Routes ---

// Suggest pantry item based on user input
app.post('/api/pantry/suggest-item', checkAuth, aiRateLimiter, async (req, res) => {
  try {
    const { itemName, homeId: _homeId } = req.body;

    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const startTime = Date.now();
    req.log.debug({ userId: req.user.uid, itemName }, 'AI suggestions requested');

    // Call AI service
    const suggestionData = await suggestPantryItem(itemName, genAI, req.log);

    req.log.info({
      userId: req.user.uid,
      itemName,
      confidence: suggestionData.confidence,
      action: suggestionData.action,
      suggestionCount: suggestionData.suggestions?.length,
      aiResponseTime: Date.now() - startTime
    }, 'AI suggestions returned');
    res.json(suggestionData);

  } catch (error) {
    req.log.error({ err: error, userId: req.user.uid, homeId: req.body.homeId, itemName: req.body.itemName }, 'Error in suggest-item');
    res.status(500).json({
      error: 'Failed to generate suggestions',
      details: error.message
    });
  }
});

// Quick defaults for pantry items (fast location + expiry)
app.post('/api/pantry/quick-defaults', checkAuth, aiRateLimiter, async (req, res) => {
  try {
    const { itemName, homeId: _homeId } = req.body;

    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const startTime = Date.now();
    req.log.debug({ userId: req.user.uid, itemName }, 'AI quick defaults requested');

    // Call AI service (includes fallback logic)
    const defaultsData = await getQuickDefaults(itemName, genAI, req.log);

    req.log.info({
      userId: req.user.uid,
      itemName,
      location: defaultsData.location,
      daysUntilExpiry: defaultsData.daysUntilExpiry,
      aiResponseTime: Date.now() - startTime
    }, 'AI defaults returned');
    res.json(defaultsData);

  } catch (error) {
    req.log.warn({ err: error, userId: req.user.uid, homeId: req.body.homeId, itemName: req.body.itemName }, 'Error in quick-defaults, using fallback');
    // Return sensible fallback on error
    res.json({
      location: 'pantry',
      daysUntilExpiry: 7
    });
  }
});

// Get all pantry items for a home
app.get('/api/pantry/:homeId', checkAuth, async (req, res) => {
  try {
    const { homeId } = req.params;
    const userUid = req.user.uid;

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get items from the subcollection
    const itemsSnap = await db.collection('homes')
      .doc(homeId)
      .collection('pantry_items')
      .orderBy('createdAt', 'desc')
      .get();

    const items = [];
    itemsSnap.forEach(doc => {
      items.push({ 
        id: doc.id, 
        ...doc.data(),
        // Ensure location is always present
        location: doc.data().location || 'pantry' 
      });
    });

    // Set explicit JSON content type
    res.setHeader('Content-Type', 'application/json');
    req.log.debug({ homeId, userId: userUid, itemCount: items.length }, 'Pantry items fetched');
    return res.json(items);
  } catch (error) {
    req.log.error({ err: error, homeId: req.params.homeId, userId: req.user.uid }, 'Error fetching pantry items');
    return res.status(500).json({ error: 'Failed to fetch pantry items' });
  }
});

// Add new pantry item
app.post('/api/pantry/:homeId', checkAuth, async (req, res) => {
  try {
    const { homeId } = req.params;
    const { name, location, quantity, expiresAt, daysUntilExpiry, confidence, detectedBy } = req.body;
    const userUid = req.user.uid;

    // Validate location
    if (!['pantry', 'fridge', 'freezer'].includes(location)) {
      return res.status(400).json({ error: 'Invalid location' });
    }

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Handle expiry date - prioritize expiresAt, fallback to daysUntilExpiry
    let calculatedExpiresAt;
    if (expiresAt) {
      calculatedExpiresAt = new Date(expiresAt);
    } else if (daysUntilExpiry !== undefined) {
      calculatedExpiresAt = new Date(Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000);
    }

    const newItem = {
      name,
      location,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: userUid,
      // Add new optional fields
      ...(quantity && { quantity }),
      ...(calculatedExpiresAt && { expiresAt: calculatedExpiresAt }),
      ...(confidence !== undefined && { confidence }),
      ...(detectedBy && { detectedBy })
    };

    // Add to the subcollection
    const itemRef = await db.collection('homes')
      .doc(homeId)
      .collection('pantry_items')
      .add(newItem);

    const resultData = { 
      id: itemRef.id, 
      ...newItem
    };
    // Don't send back server timestamp object
    delete resultData.createdAt;

    req.log.info({
      homeId,
      userId: userUid,
      itemName: name,
      location,
      quantity,
      expiresAt: calculatedExpiresAt
    }, 'Pantry item added');
    res.status(201).json(resultData);

  } catch (error) {
    req.log.error({ err: error, homeId: req.params.homeId, userId: req.user.uid }, 'Error adding pantry item');
    res.status(500).json({ error: 'Failed to add pantry item' });
  }
});

// Update pantry item
app.put('/api/pantry/:homeId/:itemId', checkAuth, async (req, res) => {
  try {
    const { homeId, itemId } = req.params;
    const { name, location, quantity, expiresAt, daysUntilExpiry, confidence, detectedBy } = req.body;
    const userUid = req.user.uid;

    // Validate location
    if (!['pantry', 'fridge', 'freezer'].includes(location)) {
      return res.status(400).json({ error: 'Invalid location' });
    }

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Verify item exists
    const itemRef = db.collection('homes')
      .doc(homeId)
      .collection('pantry_items')
      .doc(itemId);
    
    const item = await itemRef.get();
    if (!item.exists) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Handle expiry date - prioritize expiresAt, fallback to daysUntilExpiry
    let calculatedExpiresAt;
    if (expiresAt) {
      calculatedExpiresAt = new Date(expiresAt);
    } else if (daysUntilExpiry !== undefined) {
      calculatedExpiresAt = new Date(Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000);
    }

    const updatedFields = {
      name,
      location,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Add optional fields
      ...(quantity && { quantity }),
      ...(calculatedExpiresAt && { expiresAt: calculatedExpiresAt }),
      ...(confidence !== undefined && { confidence }),
      ...(detectedBy && { detectedBy })
    };

    await itemRef.update(updatedFields);

    const resultData = { 
      id: itemId,
      ...item.data(),
      ...updatedFields
    };
    // Don't send back server timestamp object
    delete resultData.updatedAt;

    req.log.info({ homeId, userId: userUid, itemId, itemName: name, location }, 'Pantry item updated');
    res.json(resultData);
  } catch (error) {
    req.log.error({ err: error, homeId: req.params.homeId, itemId: req.params.itemId, userId: req.user.uid }, 'Error updating pantry item');
    res.status(500).json({ error: 'Failed to update pantry item' });
  }
});

// Delete pantry item
app.delete('/api/pantry/:homeId/:itemId', checkAuth, async (req, res) => {
  try {
    const { homeId, itemId } = req.params;
    const userUid = req.user.uid;

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Verify item exists before deletion
    const itemRef = db.collection('homes')
      .doc(homeId)
      .collection('pantry_items')
      .doc(itemId);
    
    const item = await itemRef.get();
    if (!item.exists) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const itemName = item.data().name;
    await itemRef.delete();
    req.log.info({ homeId, userId: userUid, itemId, itemName }, 'Pantry item deleted');
    res.json({ message: 'Item deleted' });
  } catch (error) {
    req.log.error({ err: error, homeId: req.params.homeId, itemId: req.params.itemId, userId: req.user.uid }, 'Error deleting pantry item');
    res.status(500).json({ error: 'Failed to delete pantry item' });
  }
});

// --- AI Pantry Detection ---
// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heif', 'image/heic'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and HEIF images are allowed.'));
    }
  }
});

// AI-powered pantry item detection endpoint
app.post('/api/pantry/:homeId/detect-items', checkAuth, aiRateLimiter, upload.single('image'), async (req, res) => {
  let filePath = null;
  
  try {
    const { homeId } = req.params;
    const userUid = req.user.uid;

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const startTime = Date.now();
    filePath = req.file.path;
    req.log.info({
      homeId,
      userId: userUid,
      fileName: req.file.originalname,
      fileSize: req.file.size
    }, 'AI image detection started');

    // Read file and convert to base64
    const imageData = await fs.readFile(filePath);
    const base64Image = imageData.toString('base64');

    // Call AI service
    const formattedItems = await detectItemsFromImage(base64Image, req.file.mimetype, genAI, req.log);

    // Clean up uploaded file
    await fs.unlink(filePath);

    req.log.info({
      homeId: req.params.homeId,
      userId: req.user.uid,
      itemsDetected: formattedItems.length,
      aiResponseTime: Date.now() - startTime
    }, 'AI detected items from image');
    res.json({ items: formattedItems });

  } catch (error) {
    req.log.error({ err: error, homeId: req.params.homeId, userId: req.user.uid }, 'Error in AI detection');

    // Clean up file if it exists
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        req.log.error({ err: unlinkError, filePath: path.basename(filePath) }, 'Error deleting uploaded file');
      }
    }

    res.status(500).json({
      error: 'Failed to process image',
      details: error.message
    });
  }
});

// ===== PLANNER ENDPOINTS =====

// Get meal plans for a home within date range
app.get('/api/planner/:homeId', checkAuth, async (req, res) => {
  try {
    const { homeId } = req.params;
    const { startDate, endDate } = req.query;
    const userUid = req.user.uid;

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Build query
    let query = db.collection('homes')
      .doc(homeId)
      .collection('meal_plans');

    if (startDate) {
      query = query.where('date', '>=', new Date(startDate));
    }
    if (endDate) {
      query = query.where('date', '<=', new Date(endDate));
    }

    const mealPlansSnap = await query.orderBy('date', 'asc').get();

    const mealPlans = [];
    mealPlansSnap.forEach(doc => {
      const data = doc.data();
      mealPlans.push({
        id: doc.id,
        ...data,
        date: data.date.toDate().toISOString(),
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        actual: data.actual ? {
          ...data.actual,
          loggedAt: data.actual.loggedAt?.toDate?.()?.toISOString() || null
        } : null
      });
    });

    req.log.debug({
      homeId,
      userId: userUid,
      mealPlanCount: mealPlans.length,
      dateRange: { startDate, endDate }
    }, 'Meal plans fetched');
    res.json(mealPlans);
  } catch (error) {
    req.log.error({ err: error, homeId: req.params.homeId, userId: req.user.uid }, 'Error fetching meal plans');
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
});

// Create a new meal plan
app.post('/api/planner/:homeId', checkAuth, async (req, res) => {
  try {
    const { homeId } = req.params;
    const { date, mealType, planned } = req.body;
    const userUid = req.user.uid;

    req.log.debug({
      homeId,
      date,
      mealType,
      planned: planned ? { recipeName: planned.recipeName, recipeId: planned.recipeId } : null,
      userUid
    }, 'Planner POST Request');

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      req.log.warn({ userUid, homeId }, 'Authorization failed: User not member of home');
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Validate meal type
    if (!['breakfast', 'lunch', 'dinner', 'snacks'].includes(mealType)) {
      req.log.warn({ mealType, userUid }, 'Invalid meal type provided');
      return res.status(400).json({ error: 'Invalid meal type' });
    }

    // Check if meal plan already exists for this date/meal type
    const queryDate = new Date(date);
    req.log.debug({ date, queryDate, mealType }, 'Checking for existing meal plan');

    const existingQuery = await db.collection('homes')
      .doc(homeId)
      .collection('meal_plans')
      .where('date', '==', queryDate)
      .where('mealType', '==', mealType)
      .get();

    req.log.debug({
      isEmpty: existingQuery.empty,
      size: existingQuery.size,
      docs: existingQuery.docs.map(doc => ({
        id: doc.id,
        date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date,
        mealType: doc.data().mealType
      }))
    }, 'Existing query results');

    if (!existingQuery.empty) {
      req.log.warn({ homeId, date, mealType }, 'Conflict: Meal plan already exists');
      return res.status(409).json({ error: 'Meal plan already exists for this date and meal type' });
    }

    const mealPlan = {
      date: queryDate,
      mealType,
      planned: planned || null,
      actual: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: userUid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    req.log.debug({
      date: queryDate,
      mealType,
      plannedRecipeName: planned?.recipeName
    }, 'Creating meal plan');

    const docRef = await db.collection('homes')
      .doc(homeId)
      .collection('meal_plans')
      .add(mealPlan);

    const createdDoc = await docRef.get();
    const data = createdDoc.data();

    const response = {
      id: docRef.id,
      ...data,
      date: data.date.toDate().toISOString(),
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
    };

    req.log.info({
      id: docRef.id,
      recipeName: data.planned?.recipeName
    }, 'Meal plan created successfully');

    res.status(201).json(response);
  } catch (error) {
    req.log.error({ err: error }, 'Error creating meal plan');
    res.status(500).json({ error: 'Failed to create meal plan' });
  }
});

// Update a meal plan (for logging actual meals)
app.put('/api/planner/:homeId/:planId', checkAuth, async (req, res) => {
  try {
    const { homeId, planId } = req.params;
    const { planned, actual, completed, completedDate, completionType } = req.body;
    const userUid = req.user.uid;

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get current meal plan
    const mealPlanRef = db.collection('homes').doc(homeId).collection('meal_plans').doc(planId);
    const mealPlanDoc = await mealPlanRef.get();

    if (!mealPlanDoc.exists) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (planned !== undefined) {
      updateData.planned = planned;
    }

    if (actual !== undefined) {
      updateData.actual = actual ? {
        ...actual,
        loggedAt: admin.firestore.FieldValue.serverTimestamp()
      } : null;
    }

    // Handle completion fields
    if (completed !== undefined) {
      updateData.completed = completed;
    }

    if (completedDate !== undefined) {
      updateData.completedDate = completedDate;
    }

    if (completionType !== undefined) {
      updateData.completionType = completionType;
    }

    await mealPlanRef.update(updateData);

    const updatedDoc = await mealPlanRef.get();
    const data = updatedDoc.data();

    res.json({
      id: planId,
      ...data,
      date: data.date.toDate().toISOString(),
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      actual: data.actual ? {
        ...data.actual,
        loggedAt: data.actual.loggedAt?.toDate?.()?.toISOString() || null
      } : null
    });
    req.log.info({
      homeId: req.params.homeId,
      userId: req.user.uid,
      planId: req.params.planId,
      hasPlanned: !!planned,
      hasActual: !!actual,
      completed
    }, 'Meal plan updated');
  } catch (error) {
    req.log.error({ err: error, homeId: req.params.homeId, planId: req.params.planId, userId: req.user.uid }, 'Error updating meal plan');
    res.status(500).json({ error: 'Failed to update meal plan' });
  }
});

// Delete a meal plan
app.delete('/api/planner/:homeId/:planId', checkAuth, async (req, res) => {
  try {
    const { homeId, planId } = req.params;
    const userUid = req.user.uid;

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const mealPlanRef = db.collection('homes').doc(homeId).collection('meal_plans').doc(planId);
    const mealPlanDoc = await mealPlanRef.get();

    if (!mealPlanDoc.exists) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    await mealPlanRef.delete();
    req.log.info({ homeId: req.params.homeId, userId: req.user.uid, planId: req.params.planId }, 'Meal plan deleted');
    res.json({ success: true });
  } catch (error) {
    req.log.error({ err: error, homeId: req.params.homeId, planId: req.params.planId, userId: req.user.uid }, 'Error deleting meal plan');
    res.status(500).json({ error: 'Failed to delete meal plan' });
  }
});

// Simple meal logging endpoint
app.post('/api/planner/:homeId/log-meal', checkAuth, async (req, res) => {
  try {
    const { homeId } = req.params;
    const { date, mealType, description, notes } = req.body;
    const userUid = req.user.uid;

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Validate meal type
    if (!['breakfast', 'lunch', 'dinner', 'snacks'].includes(mealType)) {
      return res.status(400).json({ error: 'Invalid meal type' });
    }

    // Check if meal plan already exists for this date/meal type
    const existingQuery = await db.collection('homes')
      .doc(homeId)
      .collection('meal_plans')
      .where('date', '==', new Date(date))
      .where('mealType', '==', mealType)
      .get();

    if (!existingQuery.empty) {
      // Update existing meal plan's actual section
      const existingDoc = existingQuery.docs[0];
      const planId = existingDoc.id;

      await existingDoc.ref.update({
        actual: {
          description,
          notes: notes || '',
          loggedAt: admin.firestore.FieldValue.serverTimestamp(),
          madeAsPlanned: false
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const updatedDoc = await existingDoc.ref.get();
      const data = updatedDoc.data();

      return res.json({
        id: planId,
        ...data,
        date: data.date.toDate().toISOString(),
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        actual: data.actual ? {
          ...data.actual,
          loggedAt: data.actual.loggedAt?.toDate?.()?.toISOString() || null
        } : null
      });
    } else {
      // Create new meal plan with actual meal logged
      const mealPlan = {
        date: new Date(date),
        mealType,
        planned: null,
        actual: {
          description,
          notes: notes || '',
          loggedAt: admin.firestore.FieldValue.serverTimestamp(),
          madeAsPlanned: false
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: userUid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await db.collection('homes')
        .doc(homeId)
        .collection('meal_plans')
        .add(mealPlan);

      const createdDoc = await docRef.get();
      const data = createdDoc.data();

      req.log.info({ homeId: req.params.homeId, userId: req.user.uid, date, mealType, description }, 'Meal logged');

      return res.status(201).json({
        id: docRef.id,
        ...data,
        date: data.date.toDate().toISOString(),
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        actual: data.actual ? {
          ...data.actual,
          loggedAt: data.actual.loggedAt?.toDate?.()?.toISOString() || null
        } : null
      });
    }
  } catch (error) {
    req.log.error({ err: error, homeId: req.params.homeId, userId: req.user.uid }, 'Error logging meal');
    res.status(500).json({ error: 'Failed to log meal' });
  }
});

// Pantry ingredient deduction endpoint
app.post('/api/pantry/:homeId/deduct', checkAuth, async (req, res) => {
  try {
    const { homeId } = req.params;
    const { ingredients, mealPlanId } = req.body;
    const userUid = req.user.uid;

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const batch = db.batch();
    const consumptionLogs = [];

    for (const ingredient of ingredients) {
      const { pantryItemId, portion } = ingredient; // portion: 'all' | 'half' | 'quarter' | 'custom'

      if (!pantryItemId) continue;

      // Get current pantry item
      const itemRef = db.collection('homes').doc(homeId).collection('pantry_items').doc(pantryItemId);
      const itemDoc = await itemRef.get();

      if (!itemDoc.exists) continue;

      const itemData = itemDoc.data();
      const currentQuantity = itemData.quantity || '1 item';

      // For now, we'll just log the consumption without calculating exact deduction
      // This can be enhanced later with quantity parsing logic
      const consumptionLog = {
        pantryItemId,
        originalQuantity: currentQuantity,
        portion,
        mealPlanId,
        consumedAt: admin.firestore.FieldValue.serverTimestamp(),
        consumedBy: userUid
      };

      // Add consumption log
      const logRef = db.collection('homes').doc(homeId).collection('pantry_consumption_log').doc();
      batch.set(logRef, consumptionLog);

      consumptionLogs.push({
        id: logRef.id,
        ...consumptionLog
      });

      // For 'all' portion, we can delete the item
      if (portion === 'all') {
        batch.delete(itemRef);
      }
      // For other portions, we'll keep the item for now
      // In the future, implement quantity reduction logic here
    }

    await batch.commit();

    res.json({
      success: true,
      consumptionLogs: consumptionLogs.map(log => ({
        ...log,
        consumedAt: new Date().toISOString() // Approximate timestamp
      }))
    });
    req.log.info({
      homeId,
      userId: userUid,
      ingredientCount: ingredients.length,
      mealPlanId,
      itemsDeducted: consumptionLogs.length
    }, 'Ingredients deducted from pantry');
  } catch (error) {
    req.log.error({ err: error, homeId: req.params.homeId, userId: req.user.uid }, 'Error deducting pantry ingredients');
    res.status(500).json({ error: 'Failed to deduct ingredients' });
  }
});

// --- Shopping List Endpoints ---

// GET shopping list for a home
app.get('/api/shopping-list/:homeId', checkAuth, async (req, res) => {
  try {
    const userUid = req.user.uid;
    const { homeId } = req.params;

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get shopping list
    const shoppingListDoc = await db.collection('shopping_lists').doc(homeId).get();

    if (!shoppingListDoc.exists) {
      // Return empty list if doesn't exist yet
      return res.json({
        items: [],
        lastUpdated: null
      });
    }

    const shoppingListData = shoppingListDoc.data();

    // Convert Firestore timestamps to ISO strings for all items
    const itemsWithTimestamps = (shoppingListData.items || []).map(item => ({
      ...item,
      addedAt: item.addedAt?.toDate ? item.addedAt.toDate().toISOString() : item.addedAt
    }));

    req.log.info({
      userId: userUid,
      homeId,
      itemCount: itemsWithTimestamps.length
    }, 'Shopping list fetched');

    res.json({
      items: itemsWithTimestamps,
      lastUpdated: shoppingListData.lastUpdated?.toDate().toISOString() || null
    });

  } catch (error) {
    req.log.error({ err: error, userId: req.user.uid }, 'Error fetching shopping list');
    res.status(500).json({ error: 'Failed to fetch shopping list' });
  }
});

// POST - Add item to shopping list with AI parsing
app.post('/api/shopping-list/:homeId/items', checkAuth, aiRateLimiter, async (req, res) => {
  try {
    const userUid = req.user.uid;
    const { homeId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Item text is required' });
    }

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Parse item with AI
    const startTime = Date.now();
    const parsedItem = await parseShoppingListItem(text, genAI, req.log);
    const aiResponseTime = Date.now() - startTime;

    // Create item with metadata
    const { v4: uuidv4 } = require('uuid');
    const newItem = {
      id: uuidv4(),
      name: parsedItem.name,
      quantity: parsedItem.quantity,
      unit: parsedItem.unit,
      category: parsedItem.category,
      checked: false,
      addedBy: userUid,
      addedAt: admin.firestore.Timestamp.now(),
      source: {
        type: 'manual'
      }
    };

    // Get or create shopping list document
    const shoppingListRef = db.collection('shopping_lists').doc(homeId);
    const shoppingListDoc = await shoppingListRef.get();

    if (!shoppingListDoc.exists) {
      // Create new shopping list
      await shoppingListRef.set({
        homeId,
        items: [newItem],
        createdAt: admin.firestore.Timestamp.now(),
        lastUpdated: admin.firestore.Timestamp.now()
      });
    } else {
      // Add to existing list
      await shoppingListRef.update({
        items: admin.firestore.FieldValue.arrayUnion(newItem),
        lastUpdated: admin.firestore.Timestamp.now()
      });
    }

    req.log.info({
      userId: userUid,
      homeId,
      itemName: newItem.name,
      category: newItem.category,
      aiResponseTime
    }, 'Shopping list item added');

    // Return item with ISO date string
    res.json({
      item: {
        ...newItem,
        addedAt: newItem.addedAt.toDate().toISOString()
      }
    });

  } catch (error) {
    req.log.error({ err: error, userId: req.user.uid, homeId: req.params.homeId }, 'Error adding shopping list item');
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// PATCH - Update item fields
app.patch('/api/shopping-list/:homeId/items/:itemId', checkAuth, async (req, res) => {
  try {
    const userUid = req.user.uid;
    const { homeId, itemId } = req.params;
    const { name, quantity, unit, category } = req.body;

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get shopping list
    const shoppingListRef = db.collection('shopping_lists').doc(homeId);
    const shoppingListDoc = await shoppingListRef.get();

    if (!shoppingListDoc.exists) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    const shoppingListData = shoppingListDoc.data();
    const items = shoppingListData.items || [];

    // Find and update item
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Update only provided fields
    if (name !== undefined) items[itemIndex].name = name;
    if (quantity !== undefined) items[itemIndex].quantity = quantity;
    if (unit !== undefined) items[itemIndex].unit = unit;
    if (category !== undefined) items[itemIndex].category = category;

    // Save updated list
    await shoppingListRef.update({
      items,
      lastUpdated: admin.firestore.Timestamp.now()
    });

    req.log.info({
      userId: userUid,
      homeId,
      itemId,
      itemName: items[itemIndex].name
    }, 'Shopping list item updated');

    // Return updated item with ISO date
    const updatedItem = {
      ...items[itemIndex],
      addedAt: items[itemIndex].addedAt?.toDate().toISOString()
    };

    res.json({
      success: true,
      item: updatedItem
    });

  } catch (error) {
    req.log.error({ err: error, userId: req.user.uid, itemId: req.params.itemId }, 'Error updating shopping list item');
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// PATCH - Toggle item checked state
app.patch('/api/shopping-list/:homeId/items/:itemId/check', checkAuth, async (req, res) => {
  try {
    const userUid = req.user.uid;
    const { homeId, itemId } = req.params;
    const { checked } = req.body;

    if (typeof checked !== 'boolean') {
      return res.status(400).json({ error: 'checked field must be boolean' });
    }

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get shopping list
    const shoppingListRef = db.collection('shopping_lists').doc(homeId);
    const shoppingListDoc = await shoppingListRef.get();

    if (!shoppingListDoc.exists) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    const shoppingListData = shoppingListDoc.data();
    const items = shoppingListData.items || [];

    // Find and update item
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    items[itemIndex].checked = checked;

    // Save updated list
    await shoppingListRef.update({
      items,
      lastUpdated: admin.firestore.Timestamp.now()
    });

    req.log.info({
      userId: userUid,
      homeId,
      itemId,
      itemName: items[itemIndex].name,
      checked
    }, 'Shopping list item checked state updated');

    // Return updated item with ISO date
    const updatedItem = {
      ...items[itemIndex],
      addedAt: items[itemIndex].addedAt?.toDate().toISOString()
    };

    res.json({
      success: true,
      item: updatedItem
    });

  } catch (error) {
    req.log.error({ err: error, userId: req.user.uid, itemId: req.params.itemId }, 'Error updating checked state');
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE - Remove item from shopping list
app.delete('/api/shopping-list/:homeId/items/:itemId', checkAuth, async (req, res) => {
  try {
    const userUid = req.user.uid;
    const { homeId, itemId } = req.params;

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get shopping list
    const shoppingListRef = db.collection('shopping_lists').doc(homeId);
    const shoppingListDoc = await shoppingListRef.get();

    if (!shoppingListDoc.exists) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    const shoppingListData = shoppingListDoc.data();
    const items = shoppingListData.items || [];

    // Find item
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const deletedItemName = items[itemIndex].name;

    // Remove item
    items.splice(itemIndex, 1);

    // Save updated list
    await shoppingListRef.update({
      items,
      lastUpdated: admin.firestore.Timestamp.now()
    });

    req.log.info({
      userId: userUid,
      homeId,
      itemId,
      itemName: deletedItemName
    }, 'Shopping list item deleted');

    res.json({
      success: true
    });

  } catch (error) {
    req.log.error({ err: error, userId: req.user.uid, itemId: req.params.itemId }, 'Error deleting shopping list item');
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// DELETE - Clear all checked items
app.delete('/api/shopping-list/:homeId/checked', checkAuth, async (req, res) => {
  try {
    const userUid = req.user.uid;
    const { homeId } = req.params;

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get shopping list
    const shoppingListRef = db.collection('shopping_lists').doc(homeId);
    const shoppingListDoc = await shoppingListRef.get();

    if (!shoppingListDoc.exists) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    const shoppingListData = shoppingListDoc.data();
    const items = shoppingListData.items || [];

    // Count checked items before removal
    const checkedCount = items.filter(item => item.checked).length;

    // Filter out checked items
    const uncheckedItems = items.filter(item => !item.checked);

    // Save updated list
    await shoppingListRef.update({
      items: uncheckedItems,
      lastUpdated: admin.firestore.Timestamp.now()
    });

    req.log.info({
      userId: userUid,
      homeId,
      clearedCount: checkedCount
    }, 'Checked items cleared from shopping list');

    res.json({
      success: true,
      clearedCount: checkedCount
    });

  } catch (error) {
    req.log.error({ err: error, userId: req.user.uid }, 'Error clearing checked items');
    res.status(500).json({ error: 'Failed to clear checked items' });
  }
});


// Global error handler for unhandled errors
app.use((error, req, res, _next) => {
  // Log error if logger is available (may not be for certain requests)
  if (req.log) {
    req.log.error({ err: error }, 'Unhandled error');
  } else {
    console.error('Unhandled error (no logger):', error);
  }

  // Don't expose internal errors in production
  const errorResponse = process.env.NODE_ENV === 'production'
    ? { error: 'Internal server error' }
    : { error: error.message, stack: error.stack };

  res.status(500).json(errorResponse);
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// --- Serve React App ---
const startServer = async () => {
  try {
    // Initialize services first (load secrets, connect to Firebase, etc.)
    await initializeServices();

    // Serve static files AFTER all API routes
    app.use(express.static(path.join(__dirname, '../frontend/build')));

    // Catch-all route for React app - must be last
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
    });

    // Try to start server with port handling
    const server = app.listen(port, () => {
      logger.info({
        version,
        port,
        environment: process.env.NODE_ENV || 'development',
        firebaseStatus: admin.apps.length > 0 ? 'connected' : 'disconnected',
        geminiStatus: genAI ? 'configured' : 'not configured',
        secretsSource: isGCP() ? 'Secret Manager' : 'local .env'
      }, 'Home Helper API started');
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.warn({ port }, 'Port is busy, trying next port');
        port++;
        startServer(); // Retry with a new port
      } else {
        logger.error({ err }, 'Server error');
        process.exit(1);
      }
    });

    // Graceful shutdown handlers for production
    const gracefulShutdown = (signal) => {
      logger.info({ signal }, 'Received shutdown signal, shutting down gracefully');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.warn('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Promise Rejection');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught Exception');
  process.exit(1);
});

// Start the server
startServer();