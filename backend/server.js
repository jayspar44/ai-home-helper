// server.js - Home Helper Backend API

// Load environment variables from .env file (for local development)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const admin = require('firebase-admin');

// --- Firebase Admin SDK Initialization ---
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK:", error.message);
}

const db = admin.firestore();
const app = express();
let port = process.env.PORT || 3001;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fetch = require('node-fetch');  // Add this with other imports at the top
const multer = require('multer');
const fs = require('fs');

// Production optimizations and middleware
if (process.env.NODE_ENV === 'production') {
  // Trust Railway proxy
  app.set('trust proxy', 1);

  // Disable x-powered-by header for security
  app.disable('x-powered-by');
}

// CORS configuration with environment-specific settings
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? (origin, callback) => {
        // Allow any Railway subdomain or localhost for development
        if (!origin ||
            origin.includes('.railway.app') ||
            origin.startsWith('http://localhost') ||
            origin.startsWith('http://127.0.0.1')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Request parsing middleware
app.use(express.json({ limit: '10mb' })); // Increased for image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging for debugging (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// --- Authentication Middleware ---
const checkAuth = async (req, res, next) => {
  console.log(`🔐 CheckAuth: ${req.method} ${req.path}`);

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const idToken = req.headers.authorization.split('Bearer ')[1];
    console.log(`🔐 Token received, length: ${idToken.length}`);

    try {
      console.log(`🔐 Verifying token with Firebase Admin...`);
      req.user = await admin.auth().verifyIdToken(idToken);
      console.log(`✅ Token verified for user: ${req.user.uid}`);
      next();
    } catch (error) {
      console.error(`❌ Token verification failed:`, error.message);
      res.status(401).send('Unauthorized: Invalid token');
    }
  } else {
    console.log(`❌ No authorization header found`);
    res.status(401).send('Unauthorized: No token provided');
  }
};

// --- API Routes ---

// Enhanced health check endpoint for Railway and monitoring
app.get('/api/health', (req, res) => {
  // Read version from root version.json
  let version = '2.6.0'; // fallback
  try {
    const versionPath = path.join(__dirname, '..', 'version.json');
    const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    version = versionData.version;
  } catch (error) {
    console.warn('Could not read root version.json, using fallback version:', error.message);
  }

  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: version,
    services: {
      firebase: admin.apps.length > 0 ? 'connected' : 'disconnected',
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not configured'
    }
  };

  res.status(200).json(healthCheck);
});

// Readiness probe for Railway
app.get('/api/ready', (req, res) => {
  // Check if critical services are ready
  if (admin.apps.length === 0) {
    return res.status(503).json({ status: 'Service Unavailable', reason: 'Firebase not initialized' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ status: 'Service Unavailable', reason: 'Gemini API not configured' });
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
        console.warn('Could not read root version.json in debug endpoint, using fallback version:', error.message);
        return '2.6.0'; // fallback
      }
    })(),
    firebase: {
      adminApps: admin.apps.length,
      serviceAccountConfigured: !!process.env.FIREBASE_SERVICE_ACCOUNT,
      serviceAccountValid: false
    },
    gemini: {
      configured: !!process.env.GEMINI_API_KEY,
      keyLength: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0
    },
    server: {
      port: process.env.PORT || 3001,
      uptime: process.uptime()
    }
  };

  // Test Firebase service account JSON parsing
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
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
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    let errorMessage = 'Failed to create user.';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'This email address is already in use.';
    } else if (error.code === 'auth/invalid-password') {
        errorMessage = 'Password is not valid. It must be at least 6 characters long.';
    }
    res.status(400).json({ error: errorMessage });
  }
});

app.get('/api/user/me', checkAuth, async (req, res) => {
    try {
        console.log('👤 Fetching profile for user:', req.user.uid);

        // First verify the user exists in Firestore
        console.log('👤 Querying users collection...');
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        console.log('👤 User doc exists:', userDoc.exists);

        if (!userDoc.exists) {
            console.log('👤 Creating new user document...');
            // Create user document if it doesn't exist
            const userData = {
                uid: req.user.uid,
                email: req.user.email,
                name: req.user.displayName || '',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('users').doc(req.user.uid).set(userData);
            console.log('👤 User document created');
        }

        // Get user data (either existing or newly created)
        const userData = userDoc.exists ? userDoc.data() : {};
        console.log('👤 User data retrieved');

        // Fetch homes where user is a member
        console.log('👤 Querying homes collection...');
        const homesSnapshot = await db.collection('homes')
            .where(`members.${req.user.uid}`, 'in', ['member', 'admin'])
            .get();
        console.log('👤 Found', homesSnapshot.size, 'homes');

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

        console.log('👤 Sending profile response with', homes.length, 'homes');
        res.json(response);

    } catch (error) {
        console.error('❌ Server error in /api/user/me:', error);
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
    try {
        const { homeId, memberId } = req.params;
        const adminId = req.user.uid;

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
        
        res.status(200).json({ message: 'Member removed successfully.' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// --- PROTECTED Recipe Routes ---
app.post('/api/recipes/list', checkAuth, async (req, res) => {
  try {
    const { homeId } = req.body;
    console.log('🍽️ Recipes List Request:', { homeId, userId: req.user.uid });

    if (!homeId) {
      console.log('❌ No homeId provided in request body');
      return res.status(400).json({ error: "homeId is required." });
    }

    const collectionPath = `homes/${homeId}/recipes`;
    console.log('📍 Querying Firestore collection:', collectionPath);

    const recipesSnapshot = await db.collection('homes').doc(homeId).collection('recipes').get();
    console.log('📊 Query results:', {
      isEmpty: recipesSnapshot.empty,
      size: recipesSnapshot.size,
      docCount: recipesSnapshot.docs.length
    });

    const recipeList = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('📦 Returning recipes:', { count: recipeList.length, firstRecipe: recipeList[0]?.title || 'None' });

    res.json({ recipes: recipeList });
  } catch (error) {
    console.error('❌ Error in recipes/list:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

app.post('/api/recipes/save', checkAuth, async (req, res) => {
  try {
    const { homeId, recipe } = req.body;
    if (!homeId || !recipe) return res.status(400).json({ error: "homeId and recipe are required." });
    const docRef = await db.collection('homes').doc(homeId).collection('recipes').add(recipe);
    res.status(201).json({ id: docRef.id, ...recipe });
  } catch (error) {
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

        // If generating multiple recipes, create multiple prompts and run them
        if (generateCount > 1) {
            const recipes = [];
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
            console.error('Invalid recipe format:', generatedText);
            throw new Error('Generated recipe has invalid format');
        }

        res.json(recipe);
    } catch (error) {
        console.error('Error generating recipe:', error);
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
    console.error('Error parsing recipe response:', error);
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

  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// --- Pantry API Routes ---

// Suggest pantry item based on user input
app.post('/api/pantry/suggest-item', checkAuth, async (req, res) => {
  try {
    const { itemName, homeId } = req.body;
    
    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

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
      console.error('Error parsing AI response:', parseError);
      console.error('Raw AI response:', text);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    res.json(suggestionData);

  } catch (error) {
    console.error('Error in suggest-item:', error);
    res.status(500).json({ 
      error: 'Failed to generate suggestions', 
      details: error.message 
    });
  }
});

// Quick defaults for pantry items (fast location + expiry)
app.post('/api/pantry/quick-defaults', checkAuth, async (req, res) => {
  try {
    const { itemName, homeId } = req.body;
    
    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

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
      console.error('Error parsing quick defaults response:', parseError);
      console.error('Raw AI response:', text);
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

    res.json(defaultsData);

  } catch (error) {
    console.error('Error in quick-defaults:', error);
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
    if (!homeDoc.exists || !homeDoc.data().members[userUid] === undefined) {
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
    return res.json(items);
  } catch (error) {
    console.error('Error fetching pantry items:', error);
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
    if (!homeDoc.exists || !homeDoc.data().members[userUid] === undefined) {
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

    res.status(201).json(resultData);

  } catch (error) {
    console.error('Error adding pantry item:', error);
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
    if (!homeDoc.exists || !homeDoc.data().members[userUid] === undefined) {
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

    res.json(resultData);
  } catch (error) {
    console.error('Error updating pantry item:', error);
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
    if (!homeDoc.exists || !homeDoc.data().members[userUid] === undefined) {
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

    await itemRef.delete();
    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Error deleting pantry item:', error);
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
    if (!homeDoc.exists || !homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    filePath = req.file.path;

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
      console.error('Error parsing AI response:', parseError);
      console.error('Raw AI response:', text);
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

    res.json({ items: formattedItems });

  } catch (error) {
    console.error('Error in AI detection:', error);
    
    // Clean up file if it exists
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
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

    res.json(mealPlans);
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
});

// Create a new meal plan
app.post('/api/planner/:homeId', checkAuth, async (req, res) => {
  try {
    const { homeId } = req.params;
    const { date, mealType, planned } = req.body;
    const userUid = req.user.uid;

    console.log('📅 Planner POST Request:', {
      homeId,
      date,
      mealType,
      planned: planned ? { recipeName: planned.recipeName, recipeId: planned.recipeId } : null,
      userUid
    });

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || homeDoc.data().members[userUid] === undefined) {
      console.log('❌ Authorization failed: User not member of home');
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Validate meal type
    if (!['breakfast', 'lunch', 'dinner', 'snacks'].includes(mealType)) {
      console.log('❌ Invalid meal type:', mealType);
      return res.status(400).json({ error: 'Invalid meal type' });
    }

    // Check if meal plan already exists for this date/meal type
    const queryDate = new Date(date);
    console.log('🔍 Checking for existing meal plan:', { date, queryDate, mealType });

    const existingQuery = await db.collection('homes')
      .doc(homeId)
      .collection('meal_plans')
      .where('date', '==', queryDate)
      .where('mealType', '==', mealType)
      .get();

    console.log('📊 Existing query results:', {
      isEmpty: existingQuery.empty,
      size: existingQuery.size,
      docs: existingQuery.docs.map(doc => ({
        id: doc.id,
        date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date,
        mealType: doc.data().mealType
      }))
    });

    if (!existingQuery.empty) {
      console.log('⚠️ Conflict: Meal plan already exists');
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

    console.log('💾 Creating meal plan:', {
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

    console.log('✅ Meal plan created successfully:', {
      id: docRef.id,
      recipeName: data.planned?.recipeName
    });

    res.status(201).json(response);
  } catch (error) {
    console.error('❌ Error creating meal plan:', error);
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
  } catch (error) {
    console.error('Error updating meal plan:', error);
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
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting meal plan:', error);
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
    console.error('Error logging meal:', error);
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
  } catch (error) {
    console.error('Error deducting pantry ingredients:', error);
    res.status(500).json({ error: 'Failed to deduct ingredients' });
  }
});


// Global error handler for unhandled errors
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);

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
    // Serve static files AFTER all API routes
    app.use(express.static(path.join(__dirname, '../frontend/build')));

    // Catch-all route for React app - must be last
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
    });

    // Try to start server with port handling
    const server = app.listen(port, () => {
      console.log(`🚀 Home Helper API running on port ${port}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔥 Firebase Admin: ${admin.apps.length > 0 ? 'Connected' : 'Disconnected'}`);
      console.log(`🤖 Gemini AI: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured'}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy, trying a new one...`);
        port++;
        startServer(); // Retry with a new port
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });

    // Graceful shutdown handlers for production
    const gracefulShutdown = (signal) => {
      console.log(`\n📴 Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('⚠️ Forced shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();