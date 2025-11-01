# Recipe Generation System - Implementation Guide

## Context
We're implementing a recipe generation system for an AI Home Helper app called Roscoe. The system has two main modes: "Roscoe's Choice" (AI-driven, pantry-focused) and "Customize Selections" (user-driven with constraints). The goal is to create delicious, practical recipes while intelligently managing pantry inventory and shopping lists.

## Core Principles
1. **Quality over quantity** - Generate GOOD meals, not just meals that use ingredients
2. **Smart pantry management** - Use AI to match ingredients intelligently
3. **Practical cooking** - Assume salt, pepper, and water are always available
4. **User flexibility** - Multiple modes for different use cases (eat now vs. plan ahead)
5. **Refuse gracefully** - Don't create weird combinations just to use ingredients

---

## Task 1: Database Schema Updates

### File: Add documentation in `backend/README.md` or create `backend/schemas/recipe.schema.js`

Update the recipe document schema to include:

```javascript
{
  // Existing fields
  id: string,
  title: string,
  description: string,
  prepTime: string,
  cookTime: string,
  servings: number,
  difficulty: string,
  ingredients: string[],
  instructions: string[],
  tips: string[],
  
  // NEW: User tracking
  createdBy: string,              // User UID who generated the recipe
  createdAt: Timestamp,
  homeId: string,
  
  // NEW: Generation metadata
  generationMode: string,          // "roscoes_choice" | "customize" | "legacy"
  generationParams: {
    // Roscoe's Choice params
    mode?: string,                 // "pantry_only" | "pantry_plus_shopping"
    numberOfPeople?: number,
    quickMealsOnly?: boolean,
    prioritizeExpiring?: boolean,
    numberOfRecipes?: number,      // NEW: Allow multiple recipes in Roscoe's Choice
    
    // Customize params
    aiPrompt?: string,
    cuisines?: string[],
    proteins?: string[],
    preferences?: string[],
    numberOfRecipes?: number,
    servingSize?: number,
    ignorePantry?: boolean,        // NEW: Ignore pantry completely
    specificIngredients?: string[],
    
    // Common
    recipeType?: string             // "quick" | "sophisticated"
  },
  
  // NEW: AI-matched pantry tracking
  pantryItemsUsed: [
    {
      itemId: string,              // Firestore pantry item ID
      itemName: string,            // Display name
      quantity: string,            // "2 cups", "3 cloves", etc.
      matchConfidence: number,     // 0-1, AI's confidence in the match
      expiresAt?: Date,
      daysUntilExpiry?: number
    }
  ],
  
  // NEW: Shopping list items
  shoppingListItems: [
    {
      name: string,
      quantity: string,
      category: string,            // "produce", "dairy", "meat", "pantry", etc.
      estimatedCost?: string,
      priority?: string            // "essential" | "optional" | "substitute"
    }
  ],
  
  // NEW: Recipe quality indicators
  qualityScore: number,            // 0-100, AI's assessment of recipe quality
  refusalReason?: string,          // If AI refused to generate, why?
  
  // For multi-recipe generation
  variationNumber?: number,        // 1, 2, 3, etc.
  variationFamily?: string         // UUID linking related recipes
}
```

---

## Task 2: AI Service - Recipe Generation Functions

### File: `backend/services/recipeAI.js`

Create three new functions with sophisticated AI prompts:

### Function 1: `generateRoscoesChoice()`

```javascript
/**
 * Generates 1-N recipes using Roscoe's Choice mode
 * Focuses on creating delicious meals with available pantry items
 * 
 * @param {Object} options
 * @param {Object[]} options.pantryItems - All pantry items with expiry info
 * @param {string} options.mode - "pantry_only" or "pantry_plus_shopping"
 * @param {number} options.numberOfPeople - 1-6+
 * @param {boolean} options.quickMealsOnly - Under 30 min constraint
 * @param {boolean} options.prioritizeExpiring - Use expiring items first
 * @param {number} options.numberOfRecipes - 1-5 recipes to generate
 * @param {Object} genAI - Google Generative AI instance
 * @param {Object} logger - Pino logger
 * @returns {Promise<Object|Object[]>} Recipe(s) or refusal
 */
async function generateRoscoesChoice(options, genAI, logger) {
  // Implementation with detailed AI prompt
}
```

**AI Prompt Requirements for Roscoe's Choice:**

```
You are Roscoe, an expert home chef AI. Your goal is to create DELICIOUS, PRACTICAL meals.

CORE PRINCIPLES:
1. Quality First: Only generate recipes that would taste good. If ingredients don't work together, REFUSE politely.
2. Smart Selection: Don't use pantry items just to use them. Pick ingredients that complement each other.
3. Culinary Logic: Follow established flavor profiles and cooking techniques.
4. Single Meal: Generate ONE meal (not "meal + side + dessert"). Focus on a complete dish.
5. Weird Combinations: REFUSE if ingredients don't make culinary sense (e.g., bananas + beef + sugar).
6. Common Staples: You can assume salt, pepper, and water are always available.

PANTRY ANALYSIS:
[List all pantry items with quantities and expiry dates]

MODE: {pantry_only | pantry_plus_shopping}
- pantry_only: ONLY use pantry items. Refuse if no good meal is possible.
- pantry_plus_shopping: Use pantry as base, add 2-5 items to shopping list for a complete meal.

CONSTRAINTS:
- Serves: {numberOfPeople}
- Time: {quickMealsOnly ? "Under 30 minutes total" : "Flexible"}
- Expiring Priority: {prioritizeExpiring ? "MUST use items expiring in ≤3 days" : "No priority"}
- Variations: {numberOfRecipes > 1 ? `Generate ${numberOfRecipes} DIFFERENT recipes with distinct cooking methods/cuisines` : "Single recipe"}

REFUSAL CRITERIA:
- Not enough ingredients for a tasty meal (pantry_only mode)
- Ingredients don't combine well (e.g., sweet + savory mismatch)
- Missing key ingredients that can't be substituted
- Would create an unappetizing dish

RESPONSE FORMAT:
If generating recipe:
{
  "success": true,
  "title": "Recipe Name",
  "description": "One appealing sentence",
  "prepTime": "X minutes",
  "cookTime": "X minutes",
  "difficulty": "Easy/Medium/Hard",
  "qualityScore": 85,  // 0-100, your honest assessment
  "ingredients": [
    "2 cups ingredient [FROM PANTRY: pantry_item_id]",
    "1 tbsp ingredient [NEED TO BUY]"
  ],
  "pantryItemsUsed": [
    {
      "itemId": "firestore_id",
      "itemName": "Chicken Breast",
      "quantity": "1 lb",
      "matchConfidence": 0.95
    }
  ],
  "shoppingListItems": [
    {
      "name": "Heavy Cream",
      "quantity": "1 cup",
      "category": "dairy",
      "priority": "essential"
    }
  ],
  "instructions": ["Step 1", "Step 2"],
  "tips": ["Tip 1", "Tip 2"]
}

If refusing:
{
  "success": false,
  "refusalReason": "Not enough compatible ingredients for a quality meal. Need: [list missing essentials]",
  "suggestions": ["Add chicken", "Add pasta", "Add tomatoes"]
}
```

### Function 2: `generateCustomRecipe()`

```javascript
/**
 * Generates recipes based on user's custom constraints
 * Can ignore pantry completely or use it as reference
 * 
 * @param {Object} options
 * @param {string} options.aiPrompt - Natural language request
 * @param {string[]} options.cuisines - Selected cuisines
 * @param {string[]} options.proteins - Selected proteins
 * @param {string[]} options.preferences - Quick/Healthy/Comfort/Easy
 * @param {number} options.numberOfRecipes - 1-5
 * @param {number} options.servingSize - 1-6+
 * @param {Object[]} options.pantryItems - Available pantry (may be ignored)
 * @param {string[]} options.specificIngredients - Must-use ingredients
 * @param {boolean} options.ignorePantry - If true, build recipe from scratch
 * @param {Object} genAI
 * @param {Object} logger
 * @returns {Promise<Object[]>} Array of recipes
 */
async function generateCustomRecipe(options, genAI, logger) {
  // Implementation with detailed AI prompt
}
```

**AI Prompt Requirements for Customize:**

```
You are Roscoe, an expert chef AI creating custom recipes.

USER REQUEST: "{aiPrompt}"

SELECTED CONSTRAINTS:
- Cuisines: {cuisines.join(', ') || "Any"}
- Proteins: {proteins.join(', ') || "Any"}
- Preferences: {preferences.join(', ')}
- Must Include: {specificIngredients.join(', ') || "None"}
- Serving Size: {servingSize}
- Recipe Count: {numberOfRecipes}

PANTRY MODE: {ignorePantry ? "IGNORE_PANTRY" : "USE_PANTRY_IF_HELPFUL"}
{!ignorePantry ? `Available Pantry:\n${pantryItems.map(item => `- ${item.name} (${item.quantity})`).join('\n')}` : ''}

CORE PRINCIPLES (same as Roscoe's Choice):
1. Create DELICIOUS recipes that make culinary sense
2. If user's constraints conflict (e.g., "vegan chicken recipe"), explain politely in refusalReason
3. Single meal per recipe (not multiple courses)
4. Assume salt, pepper, water are available
5. Quality score must be honest (70+ only)

PANTRY LOGIC:
- If ignorePantry=true: Build complete shopping list, don't reference pantry
- If ignorePantry=false: Use pantry items where they fit, add shopping items as needed

RESPONSE FORMAT: (same JSON as Roscoe's Choice)
```

### Function 3: `matchIngredientsToPantry()` - AI-Powered Matching

```javascript
/**
 * Uses AI to match recipe ingredients to pantry items
 * More sophisticated than string matching
 * 
 * @param {string[]} recipeIngredients - From AI recipe generation
 * @param {Object[]} pantryItems - Available pantry items
 * @param {Object} genAI
 * @param {Object} logger
 * @returns {Promise<Object>} { pantryMatches, shoppingItems }
 */
async function matchIngredientsToPantry(recipeIngredients, pantryItems, genAI, logger) {
  const prompt = `You are a culinary assistant matching recipe ingredients to pantry items.

RECIPE INGREDIENTS:
${recipeIngredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}

AVAILABLE PANTRY:
${pantryItems.map((item, i) => `${i + 1}. [ID: ${item.id}] ${item.name} - ${item.quantity || 'unknown quantity'}`).join('\n')}

TASK: For each recipe ingredient, determine if it matches a pantry item.

MATCHING RULES:
- "2 cups rice" matches pantry item "White Rice" (ID: abc123)
- "1 lb chicken breast" matches "Chicken Breast" but NOT "Chicken Thighs"
- "3 cloves garlic" matches "Garlic" even if pantry says "1 bulb"
- "Fresh basil" matches "Basil" (assume pantry names are simplified)
- Be intelligent: "Cherry tomatoes" can match "Tomatoes" with medium confidence
- "Heavy cream" does NOT match "Milk" (different ingredients)

RESPONSE FORMAT:
{
  "matches": [
    {
      "recipeIngredient": "2 cups white rice",
      "pantryItemId": "abc123",
      "pantryItemName": "White Rice",
      "matchConfidence": 0.98,
      "quantityExtracted": "2 cups"
    }
  ],
  "needToBuy": [
    {
      "ingredient": "1 cup heavy cream",
      "reason": "Not in pantry",
      "category": "dairy",
      "quantity": "1 cup"
    }
  ]
}`;

  // Call AI and parse response
}
```

---

## Task 3: Backend API Endpoints

### File: `backend/server.js`

Add two new endpoints:

```javascript
// POST /api/generate-recipe/roscoes-choice
// Body: { homeId, mode, numberOfPeople, quickMealsOnly, prioritizeExpiring, numberOfRecipes }
// Returns: Single recipe or array of recipes

// POST /api/generate-recipe/customize  
// Body: { homeId, aiPrompt, cuisines, proteins, preferences, numberOfRecipes, servingSize, specificIngredients, ignorePantry }
// Returns: Array of recipes
```

**Implementation requirements:**
1. Fetch all pantry items for the home (with expiry calculations)
2. Call appropriate generation function
3. If AI refuses, return 400 with refusalReason
4. Save `createdBy: req.user.uid` in all recipes
5. Handle multi-recipe generation (assign variationFamily UUID)
6. Log generation params for debugging

**Example Implementation:**

```javascript
app.post('/api/generate-recipe/roscoes-choice', checkAuth, aiRateLimiter, async (req, res) => {
  try {
    const { 
      homeId, 
      mode,                    // "pantry_only" | "pantry_plus_shopping"
      numberOfPeople, 
      quickMealsOnly, 
      prioritizeExpiring, 
      numberOfRecipes 
    } = req.body;
    
    const userUid = req.user.uid;
    
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
      numberOfRecipes 
    }, 'Generating Roscoe\'s Choice recipe(s)');

    const result = await generateRoscoesChoice({
      pantryItems,
      mode,
      numberOfPeople,
      quickMealsOnly,
      prioritizeExpiring,
      numberOfRecipes
    }, genAI, req.log);

    // Handle refusal
    if (!result.success) {
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
        homeId,
        generationMode: 'roscoes_choice',
        generationParams: {
          mode,
          numberOfPeople,
          quickMealsOnly,
          prioritizeExpiring,
          numberOfRecipes
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
      homeId,
      generationMode: 'roscoes_choice',
      generationParams: {
        mode,
        numberOfPeople,
        quickMealsOnly,
        prioritizeExpiring
      }
    };

    res.json(recipe);
  } catch (error) {
    req.log.error({ err: error, userId: req.user.uid }, 'Error in Roscoe\'s Choice generation');
    res.status(500).json({ error: 'Failed to generate recipe' });
  }
});

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
      ignorePantry
    } = req.body;

    const userUid = req.user.uid;

    // Fetch pantry items (may be ignored based on ignorePantry flag)
    const pantrySnapshot = await db.collection('homes')
      .doc(homeId)
      .collection('pantry_items')
      .get();
    
    const pantryItems = [];
    if (!ignorePantry) {
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
      ignorePantry,
      numberOfRecipes,
      hasAiPrompt: !!aiPrompt 
    }, 'Generating custom recipe(s)');

    const result = await generateCustomRecipe({
      aiPrompt,
      cuisines,
      proteins,
      preferences,
      numberOfRecipes,
      servingSize,
      pantryItems,
      specificIngredients,
      ignorePantry
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
    const variationFamily = numberOfRecipes > 1 ? uuidv4() : null;
    
    const recipes = Array.isArray(result) ? result : [result];
    
    const enhancedRecipes = recipes.map((recipe, index) => ({
      ...recipe,
      createdBy: userUid,
      homeId,
      generationMode: 'customize',
      generationParams: {
        aiPrompt,
        cuisines,
        proteins,
        preferences,
        numberOfRecipes,
        servingSize,
        ignorePantry,
        specificIngredients
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
```

---

## Task 4: Frontend Components

### File: `frontend/src/pages/RecipeGenerator.js`

**Changes needed:**

1. **Roscoe's Choice Section:**
   - Add radio buttons: "Use only pantry" vs "Pantry + shopping list"
   - Add "Number of recipes" selector (1, 3, 5)
   - Update API call to use new endpoint `/api/generate-recipe/roscoes-choice`

2. **Customize Section:**
   - Add checkbox: "Ignore pantry (build from scratch)"
   - When checked, disable pantry item selection
   - Update API call to pass `ignorePantry` flag to `/api/generate-recipe/customize`

3. **Recipe Display:**
   - Show shopping list items prominently when mode is "pantry_plus_shopping" or "customize with shopping"
   - Display "Pantry items used" vs "Need to buy" in different colors
   - If recipe was refused, show refusal reason with suggestions

4. **Multi-Recipe Navigation:**
   - Already exists, ensure it works with new endpoints
   - Show variation indicators (1/3, 2/3, 3/3)

**Example UI Updates:**

```javascript
// Roscoe's Choice - Add mode selector
<div className="preference-group">
  <label className="preference-label">🥫 Pantry Mode</label>
  <div className="option-chips">
    <div 
      className={`option-chip ${roscoesMode === 'pantry_only' ? 'selected' : ''}`}
      onClick={() => setRoscoesMode('pantry_only')}
    >
      Use only what I have
    </div>
    <div 
      className={`option-chip ${roscoesMode === 'pantry_plus_shopping' ? 'selected' : ''}`}
      onClick={() => setRoscoesMode('pantry_plus_shopping')}
    >
      Pantry + shopping list
    </div>
  </div>
</div>

// Customize - Add ignore pantry checkbox
<div className="preference-group">
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={ignorePantry}
      onChange={(e) => setIgnorePantry(e.target.checked)}
      className="rounded focus-ring"
    />
    <span className="text-sm font-medium">
      Ignore pantry (build recipe from scratch)
    </span>
  </label>
  {ignorePantry && (
    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
      Recipe will be created without considering pantry items
    </p>
  )}
</div>

// Recipe Display - Show refusal
{error && error.refusalReason && (
  <div className="card p-6" style={{ 
    backgroundColor: 'var(--color-warning-light)',
    borderLeft: '4px solid var(--color-warning)'
  }}>
    <h3 className="font-semibold mb-2" style={{ color: 'var(--color-warning)' }}>
      Unable to Generate Recipe
    </h3>
    <p className="mb-3" style={{ color: 'var(--text-secondary)' }}>
      {error.refusalReason}
    </p>
    {error.suggestions && error.suggestions.length > 0 && (
      <div>
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Suggestions:
        </p>
        <ul className="list-disc list-inside text-sm" style={{ color: 'var(--text-muted)' }}>
          {error.suggestions.map((suggestion, i) => (
            <li key={i}>{suggestion}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}

// Recipe Display - Enhanced shopping list
{generatedRecipe && generatedRecipe.shoppingListItems?.length > 0 && (
  <div className="mt-6 p-4 rounded-lg" style={{ 
    backgroundColor: 'var(--color-accent-light)',
    border: '2px solid var(--color-accent)'
  }}>
    <h4 className="font-semibold mb-3" style={{ color: 'var(--color-accent)' }}>
      🛒 Shopping List ({generatedRecipe.shoppingListItems.length} items)
    </h4>
    <div className="grid grid-cols-2 gap-2">
      {generatedRecipe.shoppingListItems.map((item, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <span style={{ color: 'var(--text-primary)' }}>
            {item.name}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {item.quantity}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
```

---

## Task 5: Testing & Validation

Create test scenarios:

### 1. **Roscoe's Choice - Pantry Only**
   
**Test Case A: Good Ingredients**
```
Pantry: Chicken breast, Rice, Tomatoes, Garlic, Onion, Olive oil
Expected: Generate 1-3 quality recipes (score 75+)
```

**Test Case B: Incompatible Ingredients**
```
Pantry: Bananas, Ground beef, Sugar, Pickles
Expected: Refuse with reason "Ingredients don't combine well"
```

**Test Case C: Expiring Items Priority**
```
Pantry: Eggs (2d), Milk (1d), Cheese (5d), Bread (7d)
Expected: Recipe uses eggs and milk prominently
```

### 2. **Roscoe's Choice - Pantry + Shopping**

**Test Case A: Supplement Pantry**
```
Pantry: Pasta, Garlic, Tomatoes
Expected: Suggest 2-4 items (e.g., ground beef, parmesan, basil)
```

**Test Case B: Quality Meal**
```
Pantry: Limited items (3-4)
Expected: Recipe uses 3-4 pantry items + 3-5 shopping items, score 75+
```

### 3. **Customize - Ignore Pantry**

**Test Case A: Complete Shopping List**
```
Request: "Italian pasta dish for 4 people"
Ignore Pantry: true
Expected: Full shopping list with all ingredients
```

**Test Case B: No Pantry References**
```
Request: "Healthy chicken salad"
Ignore Pantry: true
Pantry: (has chicken, lettuce)
Expected: Recipe doesn't mention pantry items
```

### 4. **Customize - Use Pantry**

**Test Case A: Intelligent Matching**
```
Request: "Quick stir fry"
Pantry: Rice, Soy sauce, Vegetables
Expected: Recipe uses pantry items + suggests protein/extras
```

**Test Case B: Constraint Priority**
```
Request: "Vegan pasta"
Pantry: Chicken, Cream
Expected: Recipe ignores incompatible pantry items
```

### 5. **Edge Cases**

**Test Case A: Empty Pantry**
```
Mode: Pantry only
Pantry: []
Expected: Refuse with "No ingredients available"
```

**Test Case B: Single Ingredient**
```
Mode: Pantry only
Pantry: [Rice]
Expected: Refuse with "Not enough ingredients"
```

**Test Case C: Conflicting Constraints**
```
Request: "Vegan beef stew"
Expected: Refuse with explanation of conflict
```

**Test Case D: AI Parsing Failure**
```
AI returns: Invalid JSON
Expected: Retry up to 2 times, then return fallback error
```

---

## Task 6: Error Handling & Fallbacks

### File: `backend/services/recipeAI.js`

Implement robust error handling:

```javascript
async function generateRoscoesChoice(options, genAI, logger) {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      attempts++;
      
      const prompt = createRoscoesChoicePrompt(options, attempts);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Log AI response for debugging
      logger.debug({ 
        responsePreview: text.substring(0, 500),
        attempt: attempts 
      }, 'AI recipe generation response');
      
      // Parse and validate
      const parsed = parseAIJsonResponse(text, logger);
      
      // Validation checks
      if (!parsed.success && parsed.refusalReason) {
        // AI refused - return gracefully
        return {
          success: false,
          refusalReason: parsed.refusalReason,
          suggestions: parsed.suggestions || []
        };
      }
      
      // Validate required fields
      const requiredFields = ['title', 'ingredients', 'instructions', 'qualityScore'];
      const missingFields = requiredFields.filter(field => !parsed[field]);
      
      if (missingFields.length > 0) {
        logger.warn({ missingFields, attempt: attempts }, 'Missing required fields in AI response');
        
        if (attempts < maxAttempts) {
          logger.info('Retrying with clarified prompt...');
          continue; // Retry
        }
        
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Quality check
      if (parsed.qualityScore < 70) {
        logger.warn({ 
          qualityScore: parsed.qualityScore,
          title: parsed.title 
        }, 'AI generated low-quality recipe');
        
        if (attempts < maxAttempts) {
          logger.info('Retrying for better quality...');
          continue; // Retry
        }
      }
      
      // Success
      return parsed;
      
    } catch (error) {
      logger.error({ 
        err: error, 
        attempt: attempts 
      }, 'Error in recipe generation attempt');
      
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate valid recipe after 3 attempts');
      }
    }
  }
}

// Helper function - creates prompt with clarifications on retry
function createRoscoesChoicePrompt(options, attempt) {
  let prompt = basePrompt;
  
  if (attempt > 1) {
    prompt += `\n\nIMPORTANT: Previous attempt had issues. Please ensure:
- ALL required fields are present (title, ingredients, instructions, qualityScore)
- JSON is valid and properly formatted
- Quality score is realistic (70+ only for genuinely good recipes)
- If ingredients don't work, use "success": false with refusalReason`;
  }
  
  return prompt;
}
```

**Fallback Strategy:**

```javascript
// Only use fallback if AI completely fails (network error, etc.)
// NOT for bad ingredient combinations (those should refuse gracefully)

const FALLBACK_RECIPE = {
  success: false,
  refusalReason: "Unable to generate recipe due to technical issues. Please try again.",
  suggestions: [
    "Check your internet connection",
    "Try with fewer ingredients",
    "Contact support if problem persists"
  ]
};
```

---

## Success Criteria

✅ AI refuses to generate bad combinations (bananas + beef + sugar)  
✅ "Pantry only" mode works with limited ingredients  
✅ "Pantry + shopping" intelligently supplements with 2-5 items  
✅ "Ignore pantry" mode builds complete shopping lists  
✅ Multiple recipe generation creates distinct variations  
✅ AI matching correctly identifies pantry items (95%+ accuracy)  
✅ Quality scores are realistic (don't give 95 to mediocre recipes)  
✅ User who generated recipe is stored in database (`createdBy`)  
✅ All generation params are saved for debugging  
✅ Graceful refusals with helpful suggestions  
✅ Retry logic handles AI parsing failures  
✅ Single meals only (no "lunch + dessert" combos)  

---

## Files to Modify/Create

1. ✅ `backend/services/recipeAI.js` - Add 3 new functions
2. ✅ `backend/server.js` - Add 2 new endpoints
3. ✅ `backend/schemas/recipe.schema.js` - Document new schema (or add to README)
4. ✅ `frontend/src/pages/RecipeGenerator.js` - Update UI with new options
5. ✅ `backend/utils/aiHelpers.js` - Add AI matching helper if needed
6. ✅ `backend/tests/recipeAI.test.js` - Add test cases (optional but recommended)

---

## Implementation Priority

**Phase 1: Foundation (Day 1)**
- Update database schema 
- Add `createdBy` tracking to existing endpoint

**Phase 2: Roscoe's Choice (Day 2-3)**
- Implement `generateRoscoesChoiceRecipe()` function
- Create detailed AI prompt with quality checks
- Add `/api/generate-recipe/roscoes-choice` endpoint
- Test pantry_only and pantry_plus_shopping modes

**Phase 3: Customize Mode (Day 3-4)**
- Implement `generateCustomRecipe()` function
- Add ignore pantry functionality
- Add `/api/generate-recipe/customize` endpoint
- Test with various constraint combinations

**Phase 4: AI Matching (Day 4-5)**
- Implement `matchIngredientsToPantry()` function
- Integrate with both generation modes
- Test matching accuracy with real pantry data

**Phase 5: Frontend Integration (Day 5-6)**
- Update RecipeGenerator.js with new UI options
- Add mode selectors and checkboxes
- Implement refusal display
- Test end-to-end flows

**Phase 6: Testing & Refinement (Day 6-7)**
- Run all test scenarios
- Refine AI prompts based on results
- Adjust quality thresholds
- Fix edge cases

**Phase 7: Polish (Day 7)**
- Add loading states and error messages
- Improve UI/UX feedback
- Add analytics logging
- Final testing

---

## Notes for Implementation

### AI Model Configuration
- Use `gemini-2.5-flash` for recipe generation (already configured)

### Logging Strategy
```javascript
// Log all AI responses (truncated in production)
req.log.info({
  userId: req.user.uid,
  generationMode: 'roscoes_choice',
  pantryItemCount: pantryItems.length,
  qualityScore: result.qualityScore,
  aiResponseTime: Date.now() - startTime,
  responsePreview: text.substring(0, 200) // Truncate
}, 'Recipe generated successfully');
```

### Error Messages
Use consistent, user-friendly error messages:
- "Unable to create a good recipe with available ingredients"
- "Your constraints conflict - please adjust and try again"
- "Not enough ingredients for a complete meal"

### Testing with Real Data
- Use actual pantry items from database
- Test with various home configurations
- Monitor AI costs and response times
- Track refusal rates and reasons

---

## Backward Compatibility

Keep existing `/api/generate-recipe` endpoint for:
1. Old mobile app versions
2. Direct recipe generation without modes
3. Legacy saved recipes

Mark as deprecated in documentation with migration path.

---

## Contact & Support

For questions during implementation:
- Check existing code in `backend/services/recipeAI.js`
- Review AI prompt patterns in `backend/services/pantryAI.js`
- Test with Postman/curl before frontend integration
- Monitor logs in Cloud Logging (production) or console (local)

---

## APPENDIX: Complete Frontend Implementation

### Complete UI Replacement for RecipeGenerator.js

This section provides the COMPLETE frontend implementation to replace the existing wizard-based UI with the new intent-based design.

[See full implementation details in the sections above Task 4, starting with "## Task 4: Frontend Implementation - Complete UI Replacement"]

**Key Components:**
- Main Menu View with two intent cards
- RoscoesChoiceView component (400+ lines)
- CustomizeView component (450+ lines)  
- ResultsView component with refusal handling
- Enhanced RecipeCard with shopping lists
- Complete state management
- API integration handlers

**Files Modified:**
- `frontend/src/pages/RecipeGenerator.js` - Complete replacement (~1200 lines)

For full implementation code, see Task 4 section above.