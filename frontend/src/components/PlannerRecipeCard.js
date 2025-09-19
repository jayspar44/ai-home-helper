import React from 'react';

// Icons
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12,6 12,12 16,14"></polyline></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const AlertCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3l8-8"></path><circle cx="12" cy="12" r="10"></circle></svg>;

export default function PlannerRecipeCard({
  recipe,
  plannedData,
  pantryItems = [],
  isCompact = false,
  onClick,
  showIngredientStatus = true
}) {
  // Calculate ingredient availability if pantry items provided
  const ingredientStatus = recipe?.ingredients && showIngredientStatus ?
    calculateIngredientAvailability(recipe.ingredients, pantryItems) : null;

  // Get recipe name - prioritize plannedData.recipeName, then recipe.title or recipe.name
  const recipeName = plannedData?.recipeName || recipe?.title || recipe?.name || 'Recipe';

  // Get servings info
  const servings = plannedData?.servings || recipe?.servings || null;

  // Get cooking time if available
  const cookingTime = recipe?.cookingTime || recipe?.time || null;

  if (isCompact) {
    return (
      <div
        onClick={onClick}
        className="recipe-card-compact p-2 rounded-lg cursor-pointer transition-colors hover:bg-opacity-80"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              {recipeName}
            </div>
            {ingredientStatus && (
              <div className="flex items-center gap-1 mt-1">
                <IngredientStatusIcon status={ingredientStatus} />
                <span className="text-xs" style={{
                  color: ingredientStatus.available >= ingredientStatus.total
                    ? 'var(--color-success)'
                    : ingredientStatus.available > 0
                      ? 'var(--color-warning)'
                      : 'var(--color-error)'
                }}>
                  {ingredientStatus.available}/{ingredientStatus.total}
                </span>
              </div>
            )}
          </div>
          {servings && (
            <div className="flex items-center gap-1 text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
              <UsersIcon />
              <span>{servings}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="recipe-card p-3 rounded-lg cursor-pointer transition-colors hover:bg-opacity-80 border"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-light)'
      }}
    >
      {/* Recipe Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
            {recipeName}
          </h3>
          {recipe?.description && (
            <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
              {recipe.description}
            </p>
          )}
        </div>
      </div>

      {/* Recipe Meta Info */}
      <div className="flex items-center gap-3 mb-2">
        {servings && (
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <UsersIcon />
            <span>{servings}</span>
          </div>
        )}
        {cookingTime && (
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <ClockIcon />
            <span>{cookingTime}</span>
          </div>
        )}
      </div>

      {/* Ingredient Status */}
      {ingredientStatus && showIngredientStatus && (
        <div className="ingredient-status">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Ingredients
            </span>
            <div className="flex items-center gap-1">
              <IngredientStatusIcon status={ingredientStatus} />
              <span className="text-xs font-medium" style={{
                color: ingredientStatus.available >= ingredientStatus.total
                  ? 'var(--color-success)'
                  : ingredientStatus.available > 0
                    ? 'var(--color-warning)'
                    : 'var(--color-error)'
              }}>
                {ingredientStatus.available}/{ingredientStatus.total} available
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div
            className="w-full h-1 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--border-light)' }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${(ingredientStatus.available / ingredientStatus.total) * 100}%`,
                backgroundColor: ingredientStatus.available >= ingredientStatus.total
                  ? 'var(--color-success)'
                  : ingredientStatus.available > 0
                    ? 'var(--color-warning)'
                    : 'var(--color-error)'
              }}
            />
          </div>

          {/* Missing ingredients warning */}
          {ingredientStatus.missing.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-error)' }}>
                Missing:
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {ingredientStatus.missing.slice(0, 3).join(', ')}
                {ingredientStatus.missing.length > 3 && ` +${ingredientStatus.missing.length - 3} more`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Key Ingredients Preview */}
      {recipe?.ingredients && recipe.ingredients.length > 0 && !showIngredientStatus && (
        <div className="key-ingredients">
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {recipe.ingredients.slice(0, 3).map(ing => ing.name || ing).join(', ')}
            {recipe.ingredients.length > 3 && ` +${recipe.ingredients.length - 3} more`}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for ingredient status icon
function IngredientStatusIcon({ status }) {
  if (status.available >= status.total) {
    return <CheckCircleIcon style={{ color: 'var(--color-success)' }} />;
  } else if (status.available > 0) {
    return <AlertCircleIcon style={{ color: 'var(--color-warning)' }} />;
  } else {
    return <AlertCircleIcon style={{ color: 'var(--color-error)' }} />;
  }
}

// Helper function to calculate ingredient availability
function calculateIngredientAvailability(recipeIngredients, pantryItems) {
  if (!recipeIngredients || !Array.isArray(recipeIngredients)) {
    return { available: 0, total: 0, missing: [] };
  }

  let available = 0;
  const missing = [];
  const total = recipeIngredients.length;

  // Create a map of pantry items for quick lookup (case-insensitive)
  const pantryMap = new Map();
  pantryItems.forEach(item => {
    const normalizedName = item.name?.toLowerCase()?.trim();
    if (normalizedName) {
      pantryMap.set(normalizedName, item);
    }
  });

  recipeIngredients.forEach(ingredient => {
    const ingredientName = typeof ingredient === 'string'
      ? ingredient
      : ingredient.name || ingredient.ingredient;

    if (!ingredientName) return;

    const normalizedIngredient = ingredientName.toLowerCase().trim();

    // Check for exact match first
    if (pantryMap.has(normalizedIngredient)) {
      available++;
      return;
    }

    // Check for partial matches (ingredient contains pantry item or vice versa)
    let found = false;
    for (const [pantryName, pantryItem] of pantryMap) {
      if (pantryName.includes(normalizedIngredient) || normalizedIngredient.includes(pantryName)) {
        available++;
        found = true;
        break;
      }
    }

    if (!found) {
      missing.push(ingredientName);
    }
  });

  return {
    available,
    total,
    missing
  };
}