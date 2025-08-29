// server.js - Home Helper Backend API
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
const fs = require('fs').promises;

// Move ALL middleware to the top
app.use(cors());
app.use(express.json());

// --- Authentication Middleware ---
const checkAuth = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const idToken = req.headers.authorization.split('Bearer ')[1];
    try {
      req.user = await admin.auth().verifyIdToken(idToken);
      next();
    } catch (error) {
      res.status(401).send('Unauthorized: Invalid token');
    }
  } else {
    res.status(401).send('Unauthorized: No token provided');
  }
};

// --- API Routes ---

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

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
        console.log('Fetching profile for user:', req.user.uid); // Debug logging

        // First verify the user exists in Firestore
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        
        if (!userDoc.exists) {
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

        console.log('Sending profile response:', response); // Debug logging
        res.json(response);

    } catch (error) {
        console.error('Server error in /api/user/me:', error); // Debug logging
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
    if (!homeId) return res.status(400).json({ error: "homeId is required." });
    const recipesSnapshot = await db.collection('homes').doc(homeId).collection('recipes').get();
    const recipeList = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(recipeList);
  } catch (error) {
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

    const newItem = {
      name,
      location,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: userUid,
      // Add new optional fields
      ...(quantity && { quantity }),
      ...(expiresAt && { expiresAt: new Date(expiresAt) }),
      ...(daysUntilExpiry !== undefined && { daysUntilExpiry }),
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

For each item detected, provide:
1. Name: Be specific (e.g., "Honeycrisp Apples" not just "apples", "Whole Wheat Bread" not just "bread")
2. Quantity: Estimate based on visual cues (e.g., "3 apples", "1 loaf", "2 lbs", "1 carton")
3. Location: Determine if this should go in pantry, fridge, or freezer based on the item type
4. Days until expiry: Estimate based on typical shelf life and visual freshness
5. Confidence: Your confidence level (0.0-1.0) in this detection

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
    const formattedItems = detectedItems.map(item => ({
      name: item.name || 'Unknown Item',
      quantity: item.quantity || '1 item',
      location: ['pantry', 'fridge', 'freezer'].includes(item.location) ? item.location : 'pantry',
      expiresAt: new Date(Date.now() + (item.daysUntilExpiry || 7) * 24 * 60 * 60 * 1000),
      daysUntilExpiry: item.daysUntilExpiry || 7,
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.7,
      detectedBy: 'ai'
    }));

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
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy, trying a new one...`);
        port++;
        startServer(); // Retry with a new port
      } else {
        console.error('Server error:', err);
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();