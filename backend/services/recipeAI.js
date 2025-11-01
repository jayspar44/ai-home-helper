// recipeAI.js - AI recipe generation service

const { parseAIJsonResponse } = require('../utils/aiHelpers');

/**
 * Generates one or more recipes based on provided ingredients and preferences
 * Uses Google Gemini AI to create detailed recipes with pantry integration
 *
 * @param {Object} options - Recipe generation options
 * @param {string[]} options.ingredients - List of main ingredients
 * @param {number} options.servingSize - Number of servings
 * @param {string} options.dietaryRestrictions - Dietary restrictions (optional)
 * @param {string} options.recipeType - 'quick' or 'sophisticated'
 * @param {Object[]} options.pantryItems - Available pantry items
 * @param {number} options.generateCount - Number of recipes to generate (default 1)
 * @param {Object} genAI - Google Generative AI instance
 * @param {Object} logger - Pino logger instance
 * @returns {Promise<Object|Object[]>} Single recipe or array of recipes
 */
async function generateRecipes(options, genAI, logger) {
  const {
    ingredients,
    servingSize,
    dietaryRestrictions,
    recipeType = 'quick',
    pantryItems = [],
    generateCount = 1
  } = options;

  const startTime = Date.now();

  // Generate multiple recipes in parallel
  if (generateCount > 1) {
    const promises = [];

    for (let i = 0; i < generateCount; i++) {
      const prompt = createRecipePrompt(
        ingredients,
        servingSize,
        dietaryRestrictions,
        recipeType,
        pantryItems,
        i + 1
      );

      const promise = (async () => {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const generatedText = response.text();
        return parseRecipeResponse(generatedText, servingSize, pantryItems, ingredients, logger);
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

    logger.debug({
      recipeCount: validRecipes.length,
      aiResponseTime: Date.now() - startTime
    }, 'Multiple recipes generated');

    return validRecipes;
  }

  // Generate single recipe
  const prompt = createRecipePrompt(
    ingredients,
    servingSize,
    dietaryRestrictions,
    recipeType,
    pantryItems
  );

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const generatedText = response.text();

  const recipe = parseRecipeResponse(generatedText, servingSize, pantryItems, ingredients, logger);

  // Validate recipe structure
  if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
    logger.error({ generatedText: generatedText.substring(0, 200) }, 'Invalid recipe format from AI');
    throw new Error('Generated recipe has invalid format');
  }

  logger.debug({
    recipeTitle: recipe.title,
    aiResponseTime: Date.now() - startTime
  }, 'Recipe generated');

  return recipe;
}

/**
 * Creates AI prompt for recipe generation
 * @private
 */
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

/**
 * Parses AI response text into structured recipe object
 * @private
 */
function parseRecipeResponse(text, servingSize, pantryItems = [], originalIngredients = [], logger) {
  try {
    const parsed = parseAIJsonResponse(text, logger, { context: 'parse-recipe' });

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
  } catch (error) {
    logger.error({ err: error }, 'Error parsing recipe response');
  }

  // Return fallback recipe
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

/**
 * Generates recipes using Roscoe's Choice mode - pantry-focused with quality-first approach
 * AI will refuse to generate if ingredients don't make sense together
 *
 * @param {Object} options - Generation options
 * @param {Object[]} options.pantryItems - All pantry items with expiry info
 * @param {string} options.mode - "pantry_only" or "pantry_plus_shopping"
 * @param {number} options.numberOfPeople - 1-6+ people
 * @param {boolean} options.quickMealsOnly - Under 30 min constraint
 * @param {boolean} options.prioritizeExpiring - Use expiring items first
 * @param {number} options.numberOfRecipes - 1-5 recipes to generate
 * @param {Object} genAI - Google Generative AI instance
 * @param {Object} logger - Pino logger instance
 * @returns {Promise<Object|Object[]>} Recipe(s) or refusal object
 */
async function generateRoscoesChoiceRecipe(options, genAI, logger) {
  const {
    pantryItems = [],
    mode = 'pantry_only',
    numberOfPeople = 2,
    quickMealsOnly = false,
    prioritizeExpiring = false,
    numberOfRecipes = 1
  } = options;

  const startTime = Date.now();
  let attempts = 0;
  const maxAttempts = 3;

  // Build pantry context with expiry priority
  const expiringItems = pantryItems.filter(item => item.daysUntilExpiry && item.daysUntilExpiry <= 3);
  const regularItems = pantryItems.filter(item => !item.daysUntilExpiry || item.daysUntilExpiry > 3);

  let pantryContext = '';
  if (expiringItems.length > 0) {
    pantryContext += '\n\nEXPIRING SOON (≤3 days):\n';
    pantryContext += expiringItems.map(item =>
      `- ${item.name} (${item.quantity || 'unknown qty'}) - expires in ${item.daysUntilExpiry} days`
    ).join('\n');
  }
  if (regularItems.length > 0) {
    pantryContext += '\n\nOTHER PANTRY ITEMS:\n';
    pantryContext += regularItems.map(item =>
      `- ${item.name} (${item.quantity || 'unknown qty'})`
    ).join('\n');
  }

  // Generate multiple recipes in parallel if requested
  if (numberOfRecipes > 1) {
    const promises = [];

    for (let i = 0; i < numberOfRecipes; i++) {
      const prompt = createRoscoesChoicePrompt({
        pantryContext,
        mode,
        numberOfPeople,
        quickMealsOnly,
        prioritizeExpiring,
        variationNumber: i + 1,
        totalVariations: numberOfRecipes,
        pantryItems
      });

      const promise = generateSingleRoscoesRecipe(prompt, genAI, pantryItems, logger, maxAttempts);
      promises.push(promise);
    }

    const results = await Promise.all(promises);

    // Check if any were refusals
    const refusals = results.filter(r => r.success === false);
    if (refusals.length > 0) {
      // Return first refusal
      return refusals[0];
    }

    // Return valid recipes
    const validRecipes = results.filter(r => r.success !== false);

    logger.info({
      recipeCount: validRecipes.length,
      aiResponseTime: Date.now() - startTime,
      mode
    }, 'Roscoe\'s Choice recipes generated');

    return validRecipes;
  }

  // Generate single recipe
  const prompt = createRoscoesChoicePrompt({
    pantryContext,
    mode,
    numberOfPeople,
    quickMealsOnly,
    prioritizeExpiring,
    pantryItems
  });

  const result = await generateSingleRoscoesRecipe(prompt, genAI, pantryItems, logger, maxAttempts);

  logger.info({
    success: result.success !== false,
    qualityScore: result.qualityScore,
    aiResponseTime: Date.now() - startTime,
    mode
  }, 'Roscoe\'s Choice recipe generated');

  return result;
}

/**
 * Generates a single Roscoe's Choice recipe with retry logic
 * @private
 */
async function generateSingleRoscoesRecipe(prompt, genAI, pantryItems, logger, maxAttempts) {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      attempts++;

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      logger.debug({
        responsePreview: text.substring(0, 300),
        attempt: attempts
      }, 'Roscoe\'s Choice AI response');

      // Parse response
      const parsed = parseAIJsonResponse(text, logger, { context: 'roscoes-choice' });

      // Check if AI refused
      if (parsed.success === false && parsed.refusalReason) {
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
          continue; // Retry
        }

        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Quality check - reject if score < 50
      if (parsed.qualityScore < 50) {
        logger.warn({
          qualityScore: parsed.qualityScore,
          title: parsed.title
        }, 'AI generated low-quality recipe');

        if (attempts < maxAttempts) {
          continue; // Retry
        }

        // Return as refusal
        return {
          success: false,
          refusalReason: 'Unable to create a quality recipe with available ingredients (score below 50)',
          suggestions: [
            'Try "Pantry + shopping list" mode to add a few items',
            'Add more complementary ingredients to your pantry',
            'Adjust constraints (e.g., disable "quick meals only")'
          ]
        };
      }

      // Match pantry items if provided in response
      const pantryItemsUsed = parsed.pantryItemsUsed || [];
      const shoppingListItems = parsed.shoppingListItems || [];

      // Success - return recipe
      return {
        title: parsed.title,
        description: parsed.description || 'A delicious meal using your pantry items',
        prepTime: parsed.prepTime || '15 minutes',
        cookTime: parsed.cookTime || '30 minutes',
        servings: parsed.servings,
        difficulty: parsed.difficulty || 'Medium',
        ingredients: parsed.ingredients,
        instructions: parsed.instructions,
        tips: parsed.tips || [],
        pantryItemsUsed: pantryItemsUsed,
        shoppingListItems: shoppingListItems,
        qualityScore: parsed.qualityScore
      };

    } catch (error) {
      logger.error({
        err: error,
        attempt: attempts
      }, 'Error in Roscoe\'s Choice generation attempt');

      if (attempts >= maxAttempts) {
        return {
          success: false,
          refusalReason: 'Technical issue generating recipe. Please try again.',
          suggestions: [
            'Check your internet connection',
            'Try with fewer constraints',
            'Contact support if problem persists'
          ]
        };
      }
    }
  }
}

/**
 * Creates AI prompt for Roscoe's Choice mode
 * @private
 */
function createRoscoesChoicePrompt(options) {
  const {
    pantryContext,
    mode,
    numberOfPeople,
    quickMealsOnly,
    prioritizeExpiring,
    variationNumber = 1,
    totalVariations = 1,
    pantryItems = []
  } = options;

  const modeGuidance = mode === 'pantry_only'
    ? `MODE: PANTRY ONLY
- ONLY use ingredients from the pantry list above
- If you cannot create a GOOD, tasty recipe with available items, REFUSE gracefully
- Do NOT add items to shopping list in this mode`
    : `MODE: PANTRY + SHOPPING LIST
- Use pantry items as the base
- Add 2-5 items to the shopping list to complete the meal
- Focus on creating a quality, delicious recipe`;

  const timeConstraint = quickMealsOnly
    ? '\n- TIME CONSTRAINT: Recipe must be under 30 minutes total (prep + cook)'
    : '\n- Time: Flexible';

  const expiryPriority = prioritizeExpiring
    ? '\n- CRITICAL: MUST use items expiring in ≤3 days prominently in the recipe'
    : '';

  const variationGuidance = totalVariations > 1
    ? `\n- This is variation #${variationNumber} of ${totalVariations} - make it DISTINCTLY DIFFERENT in cooking method, cuisine style, or flavor profile from other variations`
    : '';

  return `You are Roscoe, an expert home chef AI. Your goal is to create DELICIOUS, PRACTICAL meals.

CORE PRINCIPLES:
1. Quality First: Only generate recipes that would taste good. If ingredients don't work together, REFUSE politely.
2. Smart Selection: Don't use pantry items just to use them. Pick ingredients that complement each other.
3. Culinary Logic: Follow established flavor profiles and cooking techniques.
4. Single Meal: Generate ONE complete dish (not "meal + side + dessert").
5. Weird Combinations: REFUSE if ingredients don't make culinary sense (e.g., bananas + beef + sugar).
6. Common Staples: You can assume salt, pepper, and water are always available.

AVAILABLE PANTRY:${pantryContext}

${modeGuidance}${timeConstraint}${expiryPriority}${variationGuidance}

CONSTRAINTS:
- Serves: ${numberOfPeople} people

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
  "servings": ${numberOfPeople},
  "difficulty": "Easy/Medium/Hard",
  "qualityScore": 85,
  "ingredients": [
    "2 cups ingredient",
    "1 tbsp another ingredient"
  ],
  "pantryItemsUsed": [
    {
      "itemId": "firestore_id_if_known",
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
  "refusalReason": "Not enough compatible ingredients for a quality meal. Need protein and more vegetables.",
  "suggestions": ["Add chicken or tofu", "Add fresh vegetables", "Enable 'Pantry + shopping list' mode"]
}

Quality score must be honest (50-100). Only generate if you can create something genuinely delicious.`;
}

/**
 * Generates custom recipes based on user constraints and preferences
 * Can ignore pantry completely or use it as reference
 *
 * @param {Object} options - Generation options
 * @param {string} options.aiPrompt - Natural language request
 * @param {string[]} options.cuisines - Selected cuisines
 * @param {string[]} options.proteins - Selected proteins
 * @param {string[]} options.preferences - Quick/Healthy/Comfort/Easy
 * @param {number} options.numberOfRecipes - 1-5
 * @param {number} options.servingSize - 1-6+
 * @param {Object[]} options.pantryItems - Available pantry (may be ignored)
 * @param {string[]} options.specificIngredients - Must-use ingredients
 * @param {boolean} options.ignorePantry - If true, build from scratch
 * @param {Object} genAI - Google Generative AI instance
 * @param {Object} logger - Pino logger instance
 * @returns {Promise<Object[]>} Array of recipes
 */
async function generateCustomRecipe(options, genAI, logger) {
  const {
    aiPrompt = '',
    cuisines = [],
    proteins = [],
    preferences = [],
    numberOfRecipes = 1,
    servingSize = 2,
    pantryItems = [],
    specificIngredients = [],
    pantryMode = 'ignore_pantry' // 'ignore_pantry' | 'use_pantry_supplement' | 'use_pantry_only'
  } = options;

  const startTime = Date.now();

  // Build pantry context based on mode
  let pantryContext = '';
  if (pantryMode !== 'ignore_pantry' && pantryItems.length > 0) {
    pantryContext = '\n\nAVAILABLE PANTRY:\n';
    pantryContext += pantryItems.map(item =>
      `- ${item.name} (${item.quantity || 'unknown qty'})`
    ).join('\n');
  }

  // Generate multiple recipes in parallel if requested
  if (numberOfRecipes > 1) {
    const promises = [];

    for (let i = 0; i < numberOfRecipes; i++) {
      const prompt = createCustomRecipePrompt({
        aiPrompt,
        cuisines,
        proteins,
        preferences,
        servingSize,
        pantryContext,
        specificIngredients,
        pantryMode,
        variationNumber: i + 1,
        totalVariations: numberOfRecipes
      });

      const promise = generateSingleCustomRecipe(prompt, genAI, pantryItems, logger, 3);
      promises.push(promise);
    }

    const results = await Promise.all(promises);

    // Check for refusals
    const refusals = results.filter(r => r.success === false);
    if (refusals.length > 0) {
      logger.info({ refusalReason: refusals[0].refusalReason }, 'Custom recipe refused');
      return refusals[0]; // Return first refusal
    }

    const validRecipes = results.filter(r => r.success !== false);

    logger.info({
      recipeCount: validRecipes.length,
      aiResponseTime: Date.now() - startTime,
      hasAiPrompt: !!aiPrompt,
      pantryMode
    }, 'Custom recipes generated');

    return validRecipes;
  }

  // Generate single recipe
  const prompt = createCustomRecipePrompt({
    aiPrompt,
    cuisines,
    proteins,
    preferences,
    servingSize,
    pantryContext,
    specificIngredients,
    pantryMode
  });

  const result = await generateSingleCustomRecipe(prompt, genAI, pantryItems, logger, 3);

  logger.info({
    success: result.success !== false,
    qualityScore: result.qualityScore,
    aiResponseTime: Date.now() - startTime,
    hasAiPrompt: !!aiPrompt
  }, 'Custom recipe generated');

  return result;
}

/**
 * Generates a single custom recipe with retry logic
 * @private
 */
async function generateSingleCustomRecipe(prompt, genAI, pantryItems, logger, maxAttempts) {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      attempts++;

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      logger.debug({
        responsePreview: text.substring(0, 300),
        attempt: attempts
      }, 'Custom recipe AI response');

      // Parse response
      const parsed = parseAIJsonResponse(text, logger, { context: 'custom-recipe' });

      // Check if AI refused
      if (parsed.success === false && parsed.refusalReason) {
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
        logger.warn({ missingFields, attempt: attempts }, 'Missing fields in custom recipe');

        if (attempts < maxAttempts) {
          continue; // Retry
        }

        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Quality check
      if (parsed.qualityScore < 50) {
        logger.warn({
          qualityScore: parsed.qualityScore,
          title: parsed.title
        }, 'Low quality custom recipe');

        if (attempts < maxAttempts) {
          continue; // Retry
        }

        return {
          success: false,
          refusalReason: 'Unable to create a quality recipe matching your constraints (score below 50)',
          suggestions: [
            'Try adjusting your constraints',
            'Add more specific ingredients',
            'Use a different cuisine or protein combination'
          ]
        };
      }

      // Return recipe
      return {
        title: parsed.title,
        description: parsed.description || 'A custom recipe tailored to your preferences',
        prepTime: parsed.prepTime || '15 minutes',
        cookTime: parsed.cookTime || '30 minutes',
        servings: parsed.servings,
        difficulty: parsed.difficulty || 'Medium',
        ingredients: parsed.ingredients,
        instructions: parsed.instructions,
        tips: parsed.tips || [],
        pantryItemsUsed: parsed.pantryItemsUsed || [],
        shoppingListItems: parsed.shoppingListItems || [],
        qualityScore: parsed.qualityScore
      };

    } catch (error) {
      logger.error({
        err: error,
        attempt: attempts
      }, 'Error in custom recipe generation');

      if (attempts >= maxAttempts) {
        return {
          success: false,
          refusalReason: 'Technical issue generating custom recipe. Please try again.',
          suggestions: [
            'Simplify your constraints',
            'Check your internet connection',
            'Try again in a moment'
          ]
        };
      }
    }
  }
}

/**
 * Creates AI prompt for custom recipe generation
 * @private
 */
function createCustomRecipePrompt(options) {
  const {
    aiPrompt,
    cuisines,
    proteins,
    preferences,
    servingSize,
    pantryContext,
    specificIngredients,
    pantryMode,
    variationNumber = 1,
    totalVariations = 1
  } = options;

  const userRequest = aiPrompt ? `\n\nUSER REQUEST: "${aiPrompt}"` : '';

  const constraints = [];
  if (cuisines && cuisines.length > 0) constraints.push(`Cuisines: ${cuisines.join(', ')}`);
  if (proteins && proteins.length > 0) constraints.push(`Proteins: ${proteins.join(', ')}`);
  if (preferences && preferences.length > 0) constraints.push(`Preferences: ${preferences.join(', ')}`);
  if (specificIngredients && specificIngredients.length > 0) constraints.push(`Must Include: ${specificIngredients.join(', ')}`);

  const constraintsText = constraints.length > 0
    ? '\n\nSELECTED CONSTRAINTS:\n- ' + constraints.join('\n- ')
    : '';

  // Build pantry instructions based on mode
  let pantryInstructions = '';
  if (pantryMode === 'ignore_pantry') {
    pantryInstructions = '\n\nPANTRY MODE: DON\'T BE CONSTRAINED BY PANTRY\n- Prioritize user preferences and constraints above all else\n- Create the best recipe that matches their request\n- Build complete shopping list from scratch\n- Do not let pantry availability limit your creativity';
  } else if (pantryMode === 'use_pantry_supplement') {
    pantryInstructions = `${pantryContext}\n\nPANTRY MODE: USE PANTRY + SHOPPING LIST\n- Use pantry items as the foundation of the recipe\n- Add items to shopping list to complete the meal\n- Balance between what's available and what's needed\n- Prioritize using expiring items when possible`;
  } else if (pantryMode === 'use_pantry_only') {
    pantryInstructions = `${pantryContext}\n\nPANTRY MODE: USE PANTRY ONLY\n- ONLY use ingredients from the available pantry\n- Do not add any items to shopping list\n- If pantry items insufficient, refuse politely and suggest adding more pantry items\n- Assume salt, pepper, water, and basic cooking oil are available`;
  }

  const variationGuidance = totalVariations > 1
    ? `\n\nVARIATION #${variationNumber} of ${totalVariations}: Make this DISTINCTLY DIFFERENT from other variations in cooking method, cuisine style, or flavor profile.`
    : '';

  return `You are Roscoe, an expert chef AI creating custom recipes.${userRequest}${constraintsText}${pantryInstructions}${variationGuidance}

CORE PRINCIPLES:
1. Create DELICIOUS recipes that make culinary sense
2. If constraints conflict (e.g., "vegan chicken recipe"), explain politely in refusalReason
3. Single meal per recipe (not multiple courses)
4. Assume salt, pepper, water are available
5. Quality score must be honest (50-100, only generate if genuinely good)

SERVING SIZE: ${servingSize} people

RESPONSE FORMAT (SAME AS ROSCOE'S CHOICE):
If generating recipe:
{
  "success": true,
  "title": "Recipe Name",
  "description": "Brief appealing description",
  "prepTime": "X minutes",
  "cookTime": "X minutes",
  "servings": ${servingSize},
  "difficulty": "Easy/Medium/Hard",
  "qualityScore": 85,
  "ingredients": ["ingredient with amount"],
  "pantryItemsUsed": [
    {
      "itemName": "Item from pantry",
      "quantity": "amount used",
      "matchConfidence": 0.9
    }
  ],
  "shoppingListItems": [
    {
      "name": "Item to buy",
      "quantity": "amount",
      "category": "produce/dairy/meat/pantry",
      "priority": "essential/optional"
    }
  ],
  "instructions": ["Step 1", "Step 2"],
  "tips": ["Helpful tip"]
}

If refusing:
{
  "success": false,
  "refusalReason": "Your constraints conflict or cannot create quality recipe",
  "suggestions": ["Helpful suggestion 1", "Helpful suggestion 2"]
}`;
}

/**
 * Uses AI to match recipe ingredients to pantry items
 * More sophisticated than string matching
 *
 * @param {string[]} recipeIngredients - From AI recipe generation
 * @param {Object[]} pantryItems - Available pantry items
 * @param {Object} genAI - Google Generative AI instance
 * @param {Object} logger - Pino logger instance
 * @returns {Promise<Object>} { pantryMatches, shoppingItems }
 */
async function matchIngredientsToPantry(recipeIngredients, pantryItems, genAI, logger) {
  const startTime = Date.now();

  if (!pantryItems || pantryItems.length === 0) {
    // No pantry items - everything needs to be bought
    return {
      pantryMatches: [],
      shoppingItems: recipeIngredients.map(ing => ({
        ingredient: ing,
        reason: 'Not in pantry',
        category: 'pantry',
        quantity: ing
      }))
    };
  }

  try {
    const prompt = `You are a culinary assistant matching recipe ingredients to pantry items.

RECIPE INGREDIENTS:
${recipeIngredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}

AVAILABLE PANTRY:
${pantryItems.map((item, i) => `${i + 1}. [ID: ${item.id}] ${item.name} - ${item.quantity || 'unknown quantity'}`).join('\n')}

TASK: For each recipe ingredient, determine if it matches a pantry item.

MATCHING RULES:
- "2 cups rice" matches pantry item "White Rice" or "Rice"
- "1 lb chicken breast" matches "Chicken Breast" but NOT "Chicken Thighs"
- "3 cloves garlic" matches "Garlic" even if pantry says "1 bulb"
- "Fresh basil" matches "Basil" (assume pantry names are simplified)
- Be intelligent: "Cherry tomatoes" can match "Tomatoes" with medium confidence
- "Heavy cream" does NOT match "Milk" (different ingredients)

RESPONSE FORMAT (JSON):
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

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const parsed = parseAIJsonResponse(text, logger, { context: 'ingredient-matching' });

    logger.debug({
      matchCount: (parsed.matches || []).length,
      shoppingCount: (parsed.needToBuy || []).length,
      aiResponseTime: Date.now() - startTime
    }, 'Ingredient matching completed');

    return {
      pantryMatches: parsed.matches || [],
      shoppingItems: parsed.needToBuy || []
    };

  } catch (error) {
    logger.error({ err: error }, 'Error in AI ingredient matching');

    // Fallback to simple string matching
    const pantryNames = pantryItems.map(item => item.name.toLowerCase());
    const matches = [];
    const needToBuy = [];

    recipeIngredients.forEach(ingredient => {
      const ingLower = ingredient.toLowerCase();
      const matchedItem = pantryItems.find(item =>
        ingLower.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(ingLower)
      );

      if (matchedItem) {
        matches.push({
          recipeIngredient: ingredient,
          pantryItemId: matchedItem.id,
          pantryItemName: matchedItem.name,
          matchConfidence: 0.7,
          quantityExtracted: ingredient
        });
      } else {
        needToBuy.push({
          ingredient: ingredient,
          reason: 'Not in pantry',
          category: 'pantry',
          quantity: ingredient
        });
      }
    });

    return { pantryMatches: matches, shoppingItems: needToBuy };
  }
}

module.exports = {
  generateRecipes,
  generateRoscoesChoiceRecipe,
  generateCustomRecipe,
  matchIngredientsToPantry
};
