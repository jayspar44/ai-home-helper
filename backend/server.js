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
  logger.info('Initializing Home Helper Backend');

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
    logger.error({ error: error }, 'Failed to initialize services');
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

// CORS will be configured after initialization (see startServer function)

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
      statusCode: res.statusCode,
      responseTime: res.responseTime
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
      req.log.error({ error: error }, 'Token verification failed');
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
    logger.warn({ error: error }, 'Could not read root version.json, using fallback');
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
        logger.warn({ error: error }, 'Could not read root version.json in debug endpoint');
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
    logger.error({ error: error, email: req.body.email }, 'User registration failed');
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
        req.log.error({ error: error, userId: req.user.uid }, 'Error fetching user profile');
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
        logger.error({ error: error, homeId, memberId, adminId }, 'Error removing member');
        res.status(400).json({ error: error.message });
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
    req.log.error({ error: error, homeId: req.body.homeId, userId: req.user.uid }, 'Error fetching recipes');
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
    req.log.error({ error: error, homeId: req.body.homeId, userId: req.user.uid }, 'Error saving recipe');
    res.status(500).json({ error: 'Failed to save recipe' });
  }
});

app.post('/api/generate-recipe', checkAuth, async (req, res) => {
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
        req.log.info({ userId: req.user.uid, ingredientCount: ingredients.length, recipeType, servingSize, generateCount }, 'Generating recipes with AI');

        // If generating multiple recipes, create multiple prompts and run them
        if (generateCount > 1) {
            const promises = [];

            for (let i = 0; i < generateCount; i++) {
                const prompt = createRecipePrompt(ingredients, servingSize, dietaryRestrictions, recipeType, pantryItems, i + 1);
                
                const promise = (async () => {
                    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const generatedText = response.text();
                    return parseRecipeResponse(generatedText, servingSize, pantryItems, ingredients);
                })();
                
                promises.push(promise);
            }
            
            const results = await Promise.all(promises);
            
            // Validate all recipes
            const validRecipes = results.filter(recipe => 
                recipe.title && recipe.ingredients && recipe.instructions
            );
            
            if (validRecipes.length === 0) {
                throw new Error('Failed to generate valid recipes');
            }

            req.log.info({ userId: req.user.uid, recipesGenerated: validRecipes.length, aiResponseTime: Date.now() - startTime }, 'Recipes generated');
            return res.json(validRecipes);
        }

        // Single recipe generation (existing logic enhanced)
        const prompt = createRecipePrompt(ingredients, servingSize, dietaryRestrictions, recipeType, pantryItems);

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const generatedText = response.text();

        const recipe = parseRecipeResponse(generatedText, servingSize, pantryItems, ingredients);

        // Validate recipe structure
        if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
            req.log.error({ generatedText: generatedText.substring(0, 200) }, 'Invalid recipe format from AI');
            throw new Error('Generated recipe has invalid format');
        }

        req.log.info({ userId: req.user.uid, recipeTitle: recipe.title, aiResponseTime: Date.now() - startTime }, 'Recipe generated');
        res.json(recipe);
    } catch (error) {
        req.log.error({ error: error, userId: req.user.uid }, 'Error generating recipe');
        res.status(500).json({
            error: 'Failed to generate recipe',
            details: error.message
        });
    }
});

// --- Helper Functions ---
function createRecipePrompt(ingredients, servingSize, dietaryRestrictions, recipeType = 'quick', pantryItems = [], variationNumber = 1) {
  const restrictionsText = dietaryRestrictions ? `\n- Follow these dietary restrictions: ${dietaryRestrictions}` : '';
  
  // Build pantry context
  let pantryContext = '';
  if (pantryItems && pantryItems.length > 0) {
    const pantryIngredients = pantryItems.map(item => {
      const expiry = item.daysUntilExpiry ? ` (${item.daysUntilExpiry} days until expiry)` : '';
      return `${item.name}${item.quantity ? ` - ${item.quantity}` : ''}${expiry}`;
    });
    
    pantryContext = `\n\nAVAILABLE PANTRY ITEMS:\n${pantryIngredients.join('\n')}\n- PRIORITIZE using pantry items that expire soon (3 days or less)\n- Mark which ingredients come from pantry vs need to be purchased`;
  }
  
  // Recipe complexity guidance
  const complexityGuidance = recipeType === 'sophisticated' 
    ? `\n- CREATE A SOPHISTICATED RECIPE: Use advanced cooking techniques, complex flavor profiles, multiple cooking methods, longer prep/cook times (45+ minutes total), restaurant-quality presentation`
    : `\n- CREATE A QUICK & EASY RECIPE: Simple techniques, minimal prep, 15-30 minute total time, accessible for home cooks, streamlined process`;
  
  // Variation guidance for multiple recipes
  const variationText = variationNumber > 1 
    ? `\n- This is variation #${variationNumber} - make it DISTINCTLY DIFFERENT from other variations in cooking method, cuisine style, or flavor profile`
    : '';
  
  return `Create a complete recipe using these ingredients: ${ingredients.join(', ')}${pantryContext}

Requirements:
- Serves ${servingSize} people
- Include prep time and cook time
- Rate difficulty as Easy, Medium, or Hard
- Provide a brief description${restrictionsText}${complexityGuidance}${variationText}

Please format your response EXACTLY like this JSON structure:
{
  "title": "Recipe Name",
  "description": "Brief appealing description",
  "prepTime": "X minutes",
  "cookTime": "X minutes", 
  "difficulty": "Easy/Medium/Hard",
  "ingredients": [
    "ingredient with amount",
    "another ingredient with amount"
  ],
  "instructions": [
    "Step 1 instruction",
    "Step 2 instruction"
  ],
  "tips": [
    "Helpful cooking tip",
    "Another useful tip"
  ]
}

Make sure the recipe is practical, delicious, and uses the provided ingredients as the main components. Add common pantry staples as needed.`;
}

function parseRecipeResponse(text, servingSize, pantryItems = [], originalIngredients = []) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonText = jsonMatch[0];
      const parsed = JSON.parse(jsonText);
      
      // Identify which ingredients come from pantry and which are missing
      const recipeIngredients = parsed.ingredients || [];
      const pantryIngredients = [];
      const missingIngredients = [];
      
      if (pantryItems && pantryItems.length > 0) {
        const pantryNames = pantryItems.map(item => item.name.toLowerCase());
        
        recipeIngredients.forEach(ingredient => {
          const ingredientLower = ingredient.toLowerCase();
          const isFromPantry = pantryNames.some(pantryName => 
            ingredientLower.includes(pantryName) || pantryName.includes(ingredientLower)
          );
          
          if (isFromPantry) {
            pantryIngredients.push(ingredient);
          } else {
            // Check if it's not in original ingredients either
            const isOriginal = originalIngredients.some(orig => 
              ingredientLower.includes(orig.toLowerCase()) || orig.toLowerCase().includes(ingredientLower)
            );
            if (!isOriginal) {
              missingIngredients.push(ingredient);
            }
          }
        });
      }
      
      return {
        title: parsed.title || "Delicious Recipe",
        description: parsed.description || "A wonderful meal made with your ingredients",
        prepTime: parsed.prepTime || "15 minutes",
        cookTime: parsed.cookTime || "30 minutes",
        servings: servingSize,
        difficulty: parsed.difficulty || "Medium",
        ingredients: recipeIngredients,
        instructions: parsed.instructions || [],
        tips: parsed.tips || ["Enjoy your meal!"],
        pantryIngredients: pantryIngredients,
        missingIngredients: missingIngredients
      };
    }
  } catch (error) {
    logger.error({ error: error }, 'Error parsing recipe response');
  }
  return {
    title: "Custom Recipe",
    description: "A delicious meal created just for you",
    prepTime: "15 minutes",
    cookTime: "30 minutes",
    servings: servingSize,
    difficulty: "Medium",
    ingredients: ["Check server logs for full response"],
    instructions: ["AI response parsing failed - check logs"],
    tips: ["Recipe generation succeeded but formatting needs adjustment"],
    pantryIngredients: [],
    missingIngredients: []
  };
}

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
    req.log.error({ error: error, homeId: req.params.homeId, email: req.body.email, userId: req.user.uid }, 'Error adding member');
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// --- Pantry API Routes ---

// Suggest pantry item based on user input
app.post('/api/pantry/suggest-item', checkAuth, async (req, res) => {
  try {
    const { itemName, homeId: _homeId } = req.body;

    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const startTime = Date.now();
    req.log.debug({ userId: req.user.uid, itemName }, 'AI suggestions requested');

    const prompt = `Analyze this food/pantry item name: "${itemName}"

Your goal is to help users create specific, useful pantry entries. Provide suggestions based on confidence level:

HIGH CONFIDENCE (>80%): Item is specific and clearly identifiable
- Return ONE detailed suggestion with exact name, typical quantity, shelf life
- Example: "eggs" → "Large white eggs, dozen, 21-28 days"

MEDIUM CONFIDENCE (40-80%): Item is recognizable but vague/ambiguous  
- Return 3-4 common specific variations
- Include brand examples and common sizes
- Encourage user to be more specific
- Example: "chocolate" → ["Milk chocolate bar 1.5oz", "Dark chocolate chips 12oz", "Chocolate candy assorted 8oz"]

LOW CONFIDENCE (<40%): Item is too vague, unclear, or non-food
- Provide guidance on being more specific
- Give examples of better alternatives
- Suggest photo upload for unclear items
- Example: "stuff" → guidance to be more specific

Focus on:
- Common grocery items and typical household sizes
- Realistic shelf life estimates (in days)
- Encouraging specificity over generic terms
- Educational guidance for better entries

Return JSON format:
{
  "confidence": 0.0-1.0,
  "action": "accept" | "choose" | "specify",
  "suggestions": [
    {
      "name": "Specific item name",
      "quantity": "Amount with unit",
      "shelfLife": "X days",
      "location": "pantry" | "fridge" | "freezer",
      "daysUntilExpiry": number
    }
  ],
  "guidance": {
    "message": "Helpful message",
    "examples": ["example1", "example2"],
    "reasoning": "Why this confidence level"
  }
}`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse AI response
    let suggestionData;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/s);
      if (jsonMatch) {
        suggestionData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      req.log.error({ error: parseError, text: text.substring(0, 200) }, 'Error parsing AI response for suggest-item');
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

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
    req.log.error({ error: error, userId: req.user.uid, itemName: req.body.itemName }, 'Error in suggest-item');
    res.status(500).json({
      error: 'Failed to generate suggestions',
      details: error.message
    });
  }
});

// Quick defaults for pantry items (fast location + expiry)
app.post('/api/pantry/quick-defaults', checkAuth, async (req, res) => {
  try {
    const { itemName, homeId: _homeId } = req.body;

    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const startTime = Date.now();
    req.log.debug({ userId: req.user.uid, itemName }, 'AI quick defaults requested');

    const prompt = `For the food item "${itemName}", provide quick smart defaults for location and expiry days.

Respond with ONLY this JSON format (no other text):
{
  "location": "pantry" | "fridge" | "freezer",
  "daysUntilExpiry": number
}

Use these rules:
- Fresh produce, dairy, meat → "fridge" 
- Frozen items → "freezer"
- Dry goods, canned items, snacks → "pantry"
- Reasonable expiry days (1-3 for fresh, 7-30 for pantry items)`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse AI response
    let defaultsData;
    try {
      const jsonMatch = text.match(/\{[\s\S]*?\}/s);
      if (jsonMatch) {
        defaultsData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      req.log.warn({ error: parseError, itemName }, 'Error parsing quick defaults, using fallback');
      // Return sensible fallback
      defaultsData = {
        location: itemName.toLowerCase().includes('milk') ||
                  itemName.toLowerCase().includes('yogurt') ||
                  itemName.toLowerCase().includes('cheese') ||
                  itemName.toLowerCase().includes('meat') ||
                  itemName.toLowerCase().includes('fish') ? 'fridge' : 'pantry',
        daysUntilExpiry: 7
      };
    }

    req.log.info({
      userId: req.user.uid,
      itemName,
      location: defaultsData.location,
      daysUntilExpiry: defaultsData.daysUntilExpiry,
      aiResponseTime: Date.now() - startTime
    }, 'AI defaults returned');
    res.json(defaultsData);

  } catch (error) {
    req.log.warn({ error: error, itemName: req.body.itemName }, 'Error in quick-defaults, using fallback');
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
    req.log.error({ error: error, homeId: req.params.homeId, userId: req.user.uid }, 'Error fetching pantry items');
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
    req.log.error({ error: error, homeId: req.params.homeId, userId: req.user.uid }, 'Error adding pantry item');
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
    req.log.error({ error: error, homeId: req.params.homeId, itemId: req.params.itemId, userId: req.user.uid }, 'Error updating pantry item');
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
    req.log.error({ error: error, homeId: req.params.homeId, itemId: req.params.itemId, userId: req.user.uid }, 'Error deleting pantry item');
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
app.post('/api/pantry/:homeId/detect-items', checkAuth, upload.single('image'), async (req, res) => {
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

    // Create the AI prompt for food detection
    const prompt = `You are an expert at identifying food items in images. Analyze this image and detect all food items visible.

For each item detected, you MUST provide ALL fields:
1. Name: Be specific (e.g., "Honeycrisp Apples" not just "apples", "Whole Wheat Bread" not just "bread")
2. Quantity: Estimate based on visual cues (e.g., "3 apples", "1 loaf", "2 lbs", "1 carton")
3. Location: ALWAYS determine storage location based on item type:
   - Fresh produce, dairy, meat, leftovers → "fridge"
   - Frozen items → "freezer" 
   - Dry goods, canned items, snacks, spices → "pantry"
4. Days until expiry: ALWAYS estimate realistic shelf life:
   - Fresh produce: 3-10 days
   - Dairy: 5-14 days
   - Meat/fish: 1-5 days
   - Bread: 3-7 days
   - Pantry items: 30-365 days
   - Consider visible freshness cues
5. Confidence: Your confidence level (0.0-1.0) in this detection

CRITICAL: Every item MUST have location and daysUntilExpiry fields filled with realistic values.

Respond ONLY with a JSON array, no other text:
[
  {
    "name": "Item name",
    "quantity": "Amount with unit", 
    "location": "pantry|fridge|freezer",
    "daysUntilExpiry": number,
    "confidence": 0.0-1.0
  }
]

If no food items are detected, return an empty array: []`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: base64Image
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Parse AI response
    let detectedItems = [];
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) {
        detectedItems = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      req.log.error({ error: parseError, text: text.substring(0, 200) }, 'Error parsing AI detection response');
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Validate and format detected items
    const formattedItems = detectedItems.map(item => {
      const daysUntilExpiry = item.daysUntilExpiry || 7;
      const expiresAt = new Date(Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000);

      return {
        name: item.name || 'Unknown Item',
        quantity: item.quantity || '1 item',
        location: ['pantry', 'fridge', 'freezer'].includes(item.location) ? item.location : 'pantry',
        expiresAt,
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.7,
        detectedBy: 'ai'
      };
    });

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
    req.log.error({ error: error, homeId: req.params.homeId, userId: req.user.uid }, 'Error in AI detection');

    // Clean up file if it exists
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        req.log.error({ error: unlinkError, filePath: path.basename(filePath) }, 'Error deleting uploaded file');
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
    req.log.error({ error: error, homeId: req.params.homeId, userId: req.user.uid }, 'Error fetching meal plans');
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
});

// Create a new meal plan
app.post('/api/planner/:homeId', checkAuth, async (req, res) => {
  try {
    const { homeId } = req.params;
    const { date, mealType, planned } = req.body;
    const userUid = req.user.uid;

    logger.debug('Planner POST Request', {
      homeId,
      date,
      mealType,
      planned: planned ? { recipeName: planned.recipeName, recipeId: planned.recipeId } : null,
      userUid
    });

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      logger.warn('Authorization failed: User not member of home', { userUid, homeId });
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Validate meal type
    if (!['breakfast', 'lunch', 'dinner', 'snacks'].includes(mealType)) {
      logger.warn('Invalid meal type provided', { mealType, userUid });
      return res.status(400).json({ error: 'Invalid meal type' });
    }

    // Check if meal plan already exists for this date/meal type
    const queryDate = new Date(date);
    logger.debug('Checking for existing meal plan', { date, queryDate, mealType });

    const existingQuery = await db.collection('homes')
      .doc(homeId)
      .collection('meal_plans')
      .where('date', '==', queryDate)
      .where('mealType', '==', mealType)
      .get();

    logger.debug('Existing query results', {
      isEmpty: existingQuery.empty,
      size: existingQuery.size,
      docs: existingQuery.docs.map(doc => ({
        id: doc.id,
        date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date,
        mealType: doc.data().mealType
      }))
    });

    if (!existingQuery.empty) {
      logger.warn('Conflict: Meal plan already exists', { homeId, date, mealType });
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

    logger.debug('Creating meal plan', {
      date: queryDate,
      mealType,
      plannedRecipeName: planned?.recipeName
    });

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

    logger.success('Meal plan created successfully', {
      id: docRef.id,
      recipeName: data.planned?.recipeName
    });

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating meal plan', error);
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
    req.log.error({ error: error, homeId: req.params.homeId, planId: req.params.planId, userId: req.user.uid }, 'Error updating meal plan');
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
    req.log.error({ error: error, homeId: req.params.homeId, planId: req.params.planId, userId: req.user.uid }, 'Error deleting meal plan');
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
    req.log.error({ error: error, homeId: req.params.homeId, userId: req.user.uid }, 'Error logging meal');
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
    req.log.error({ error: error, homeId: req.params.homeId, userId: req.user.uid }, 'Error deducting pantry ingredients');
    res.status(500).json({ error: 'Failed to deduct ingredients' });
  }
});


// Global error handler for unhandled errors
app.use((error, req, res, _next) => {
  req.log.error({ error: error }, 'Unhandled error');

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

    // Configure CORS with dynamic allowed origins
    logger.info('Configuring CORS');
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://localhost:3000',
      'https://127.0.0.1:3000'
    ];

    // Add GCP URLs if running on GCP (covers both prod and dev services)
    if (isGCP()) {
      try {
        const projectId = getProjectId();
        allowedOrigins.push(
          `https://${projectId}.uc.r.appspot.com`,           // Production (default service)
          `https://dev-dot-${projectId}.uc.r.appspot.com`    // Dev service
        );
        logger.info({ projectId }, 'CORS configured for GCP project');
      } catch (error) {
        logger.warn({ error: error }, 'Could not determine project ID for CORS');
      }
    }

    const corsOptions = {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn({ origin }, 'CORS blocked origin');
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200
    };

    app.use(cors(corsOptions));
    logger.info({ originCount: allowedOrigins.length }, 'CORS enabled');

    // Serve static files AFTER all API routes
    app.use(express.static(path.join(__dirname, '../frontend/build')));

    // Catch-all route for React app - must be last
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
    });

    // Try to start server with port handling
    const server = app.listen(port, () => {
      logger.info({
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
    logger.error({ error: error }, 'Failed to start server');
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
  logger.error({ error: error }, 'Uncaught Exception');
  process.exit(1);
});

// Start the server
startServer();