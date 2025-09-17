// POST /api/generate-recipe
const { handleCors } = require('../utils/cors');
const { checkAuth } = require('../utils/auth');
const { initializeGemini } = require('../utils/gemini');
const { createRecipePrompt, parseRecipeResponse } = require('../utils/recipe-helpers');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await checkAuth(req, res);
  if (!user) return;

  try {
    const { 
      ingredients, 
      allPantryItems = [],
      servingSize, 
      dietaryRestrictions, 
      recipeType = 'quick', 
      generateCount = 1,
      includeDessert = false,
      useAllPantryItems = false,
      pantryItems = []
    } = req.body;
    
    // Allow empty ingredients if using all pantry items
    if (!ingredients || (ingredients.length === 0 && !useAllPantryItems)) {
      return res.status(400).json({ error: 'Ingredients are required or select to use all pantry items' });
    }

    const genAI = initializeGemini();

    // If generating multiple recipes, create multiple prompts and run them
    if (generateCount > 1) {
      const recipes = [];
      const promises = [];
      
      for (let i = 0; i < generateCount; i++) {
        const prompt = createRecipePrompt(ingredients, servingSize, dietaryRestrictions, recipeType, pantryItems, allPantryItems, includeDessert, useAllPantryItems, i + 1);
        
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
    const prompt = createRecipePrompt(ingredients, servingSize, dietaryRestrictions, recipeType, pantryItems, allPantryItems, includeDessert, useAllPantryItems);
    
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
}