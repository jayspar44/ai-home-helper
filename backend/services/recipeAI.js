// recipeAI.js - AI recipe generation service

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

module.exports = {
  generateRecipes
};
