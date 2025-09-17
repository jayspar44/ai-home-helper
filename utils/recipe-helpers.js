// Recipe generation helper functions
function createRecipePrompt(ingredients, servingSize, dietaryRestrictions, recipeType = 'quick', pantryItems = [], allPantryItems = [], includeDessert = false, useAllPantryItems = false, variationNumber = 1) {
  const restrictionsText = dietaryRestrictions ? `\n- Follow these dietary restrictions: ${dietaryRestrictions}` : '';
  
  // Handle ingredient selection logic
  let ingredientContext = '';
  let pantryContext = '';
  
  if (useAllPantryItems && allPantryItems.length > 0) {
    // Use all pantry items as available ingredients
    const availableIngredients = allPantryItems.map(item => {
      const expiry = item.daysUntilExpiry ? ` (${item.daysUntilExpiry} days until expiry)` : '';
      return `${item.name}${item.quantity ? ` - ${item.quantity}` : ''}${expiry}`;
    });
    
    pantryContext = `\n\nAVAILABLE PANTRY ITEMS:\n${availableIngredients.join('\n')}\n- PRIORITIZE using items that expire soon (3 days or less)\n- Use as many pantry items as makes sense for the recipe`;
    ingredientContext = `\n\nUSE YOUR PANTRY: Create a recipe using ingredients from the available pantry items above. You don't need to use every single item, but try to use a good variety that makes sense together.`;
  } else if (ingredients && ingredients.length > 0) {
    // Use specific selected ingredients
    ingredientContext = `\n\nREQUIRED INGREDIENTS: ${ingredients.join(', ')} - ALL of these must be used in the recipe`;
    
    if (allPantryItems && allPantryItems.length > 0) {
      const availableExtras = allPantryItems.map(item => {
        const expiry = item.daysUntilExpiry ? ` (${item.daysUntilExpiry} days until expiry)` : '';
        return `${item.name}${item.quantity ? ` - ${item.quantity}` : ''}${expiry}`;
      });
      
      pantryContext = `\n\nADDITIONAL PANTRY ITEMS (optional to use):\n${availableExtras.join('\n')}`;
    }
  }
  
  // Recipe complexity guidance
  const complexityGuidance = recipeType === 'sophisticated' 
    ? `\n- CREATE A SOPHISTICATED RECIPE: Use advanced cooking techniques, complex flavor profiles, multiple cooking methods, longer prep/cook times (45+ minutes total), restaurant-quality presentation`
    : `\n- CREATE A QUICK & EASY RECIPE: Simple techniques, minimal prep, 15-30 minute total time, accessible for home cooks, streamlined process`;
  
  // Dessert guidance
  const dessertText = includeDessert 
    ? `\n- INCLUDE A DESSERT COMPONENT: Add a dessert recipe that complements the main meal`
    : `\n- MAIN MEAL ONLY: Create only the main meal recipe, no desserts or multiple courses`;
  
  // Variation guidance for multiple recipes
  const variationText = variationNumber > 1 
    ? `\n- This is variation #${variationNumber} - make it DISTINCTLY DIFFERENT from other variations in cooking method, cuisine style, or flavor profile. Ensure variety in:\n  * Cooking methods (stir-fry, baked, grilled, etc.)\n  * Cuisine types (Italian, Asian, American, etc.)\n  * Meal types (unless ingredients are very limited)`
    : '';
  
  return `Create a complete recipe${ingredientContext}${pantryContext}

Requirements:
- Serves ${servingSize} people
- Include prep time and cook time
- Rate difficulty as Easy, Medium, or Hard
- Provide a brief description${restrictionsText}${complexityGuidance}${dessertText}${variationText}

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

module.exports = { createRecipePrompt, parseRecipeResponse };