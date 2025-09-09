import React, { useState, useCallback, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { ChefHat } from 'lucide-react';

// --- Helper Components for Icons ---
const LoadingSpinner = () => <div className="w-6 h-6 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border-light)', borderTopColor: 'var(--color-primary)' }}></div>;
const SkeletonCard = () => (
  <div className="space-y-6 p-6">
    <div className="animate-shimmer h-8 rounded"></div>
    <div className="animate-shimmer h-4 rounded w-3/4"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-3">
        <div className="animate-shimmer h-6 rounded w-1/2"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-shimmer h-4 rounded"></div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="animate-shimmer h-6 rounded w-1/2"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-shimmer h-4 rounded"></div>
        ))}
      </div>
    </div>
  </div>
);
const BookmarkIcon = ({ saved }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 transition-all" style={{ color: saved ? 'var(--color-primary)' : 'var(--text-muted)' }}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>;
const SearchIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" /></svg>;

function RecipeCard({ recipe, onSave, isSaved }) {
  if (!recipe) return null;
  return (
    <div className="space-y-6 animate-fade-in relative">
       <button onClick={onSave} disabled={isSaved} className="absolute top-4 right-4 p-2 rounded-full shadow-md card-interactive disabled:opacity-70 disabled:cursor-not-allowed transition-all" style={{ backgroundColor: 'var(--bg-card)' }} aria-label="Save recipe"><BookmarkIcon saved={isSaved} /></button>
      <div>
        <h2 className="text-3xl font-bold mb-2 pr-12" style={{ color: 'var(--text-primary)' }}>{recipe.title}</h2>
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>{recipe.description}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm py-3" style={{ 
          color: 'var(--text-secondary)', 
          borderTop: '1px solid var(--border-light)', 
          borderBottom: '1px solid var(--border-light)' 
        }}>
          <div className="flex items-center gap-1.5"><span>⏱️</span> Prep: <strong>{recipe.prepTime}</strong></div>
          <div className="flex items-center gap-1.5"><span>🍳</span> Cook: <strong>{recipe.cookTime}</strong></div>
          <div className="flex items-center gap-1.5"><span>👥</span> Serves: <strong>{recipe.servings}</strong></div>
          <span className="px-3 py-1 rounded-full font-medium" style={{ 
            backgroundColor: 'var(--color-success-light)', 
            color: 'var(--color-success)' 
          }}>{recipe.difficulty}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Ingredients</h3>
          <ul className="space-y-2">{recipe.ingredients.map((ing, i) => {
            const isPantryItem = recipe.pantryIngredients && recipe.pantryIngredients.includes(ing);
            return (
              <li key={i} className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: isPantryItem ? 'var(--color-success)' : 'var(--color-accent)' }}></span>
                <span style={{ color: isPantryItem ? 'var(--color-success)' : 'var(--text-secondary)' }}>{ing}</span>
              </li>
            );
          })}</ul>
          {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-warning-light)' }}>
              <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--color-warning)' }}>🛒 What's Missing?</h4>
              <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                {recipe.missingIngredients.map((ing, i) => <li key={i}>• {ing}</li>)}
              </ul>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Chef's Tips</h3>
          <ul className="space-y-2">{recipe.tips.map((tip, i) => <li key={i} className="flex items-start gap-3 text-sm"><span className="mt-1" style={{ color: 'var(--color-primary)' }}>💡</span><span style={{ color: 'var(--text-secondary)' }}>{tip}</span></li>)}</ul>
        </div>
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Instructions</h3>
        <ol className="space-y-4">{recipe.instructions.map((step, i) => <li key={i} className="flex gap-4"><span className="flex-shrink-0 w-7 h-7 text-white rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: 'var(--color-primary)' }}>{i + 1}</span><span className="pt-0.5" style={{ color: 'var(--text-secondary)' }}>{step}</span></li>)}</ol>
      </div>
    </div>
  );
}

export default function RecipeGenerator() {
  const location = useLocation();
  const context = useOutletContext();
  
  // Extract context values safely with defaults
  const userToken = context?.userToken;
  const activeHomeId = context?.activeHomeId;
  const refreshProfile = context?.refreshProfile || (() => {});
  
  const [ingredients, setIngredients] = useState([]);
  const [ingredientText, setIngredientText] = useState('');
  const [generatedRecipe, setGeneratedRecipe] = useState(null);
  const [generatedRecipes, setGeneratedRecipes] = useState([]); // For multiple recipes
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New state for pantry integration
  const [pantryItems, setPantryItems] = useState([]);
  const [selectedPantryItems, setSelectedPantryItems] = useState([]);
  const [pantrySearch, setPantrySearch] = useState('');
  const [isLoadingPantry, setIsLoadingPantry] = useState(false);
  
  // New state for recipe options
  const [recipeType, setRecipeType] = useState('quick'); // 'quick' or 'sophisticated'
  const [generateMultiple, setGenerateMultiple] = useState(false);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
  const [includeDessert, setIncludeDessert] = useState(false);
  const [expiringItems, setExpiringItems] = useState([]);
  const [useAllPantryItems, setUseAllPantryItems] = useState(false);

  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`,
  }), [userToken]);

  useEffect(() => {
    if (!userToken || !activeHomeId) return;
    const fetchSavedRecipes = async () => {
        try {
            // Fetch recipes for the currently active home.
            const response = await fetch('/api/recipes/list', { 
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ homeId: activeHomeId })
            });
            if (!response.ok) throw new Error('Failed to fetch saved recipes.');
            const data = await response.json();
            setSavedRecipes(data);
        } catch (err) {
            setError('Could not load your saved recipes.');
        }
    };
    fetchSavedRecipes();
  }, [userToken, activeHomeId, getAuthHeaders]);

  // Fetch pantry items
  useEffect(() => {
    if (!userToken || !activeHomeId) return;
    const fetchPantryItems = async () => {
      setIsLoadingPantry(true);
      try {
        const response = await fetch(`/api/pantry/${activeHomeId}`, {
          headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch pantry items');
        const items = await response.json();
        setPantryItems(items);
        // Calculate expiring items (≤3 days)
        const expiring = items.filter(item => {
          const daysUntilExpiry = item.daysUntilExpiry || 7;
          return daysUntilExpiry <= 3;
        });
        setExpiringItems(expiring);
      } catch (err) {
        console.error('Error fetching pantry items:', err);
      } finally {
        setIsLoadingPantry(false);
      }
    };
    fetchPantryItems();
  }, [userToken, activeHomeId, getAuthHeaders]);

  // Add this effect to handle pre-populated ingredients
  useEffect(() => {
    if (location.state?.ingredients) {
      setIngredients(location.state.ingredients);
    }
  }, [location.state]);

  const addIngredient = useCallback(() => {
    const value = ingredientText.trim();
    if (value && !ingredients.includes(value)) {
      setIngredients(prev => [...prev, value]);
      setIngredientText('');
      setError('');
    }
  }, [ingredients, ingredientText]);

  const removeIngredient = useCallback((index) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleGenerateRecipe = useCallback(async () => {
    const useAll = selectedPantryItems.length === 0 && ingredients.length === 0;
    const finalIngredients = useAll ? [] : [...ingredients, ...selectedPantryItems.map(item => item.name)];
    
    setIsLoading(true);
    setError('');
    setGeneratedRecipe(null);
    setGeneratedRecipes([]);
    setCurrentRecipeIndex(0);
    
    const servingSize = document.getElementById('serving-size').value;
    const dietaryRestrictions = document.getElementById('dietary-restrictions').value;
    const generateCount = generateMultiple ? 3 : 1;
    
    try {
      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          ingredients: finalIngredients, 
          allPantryItems: pantryItems,
          servingSize, 
          dietaryRestrictions,
          recipeType,
          generateCount,
          includeDessert,
          useAllPantryItems: useAll,
          pantryItems: selectedPantryItems
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }
      const result = await response.json();
      
      if (Array.isArray(result)) {
        setGeneratedRecipes(result);
        setGeneratedRecipe(result[0]);
      } else {
        setGeneratedRecipe(result);
        setGeneratedRecipes([result]);
      }
    } catch (err) {
      console.error('Failed to generate recipe:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [ingredients, getAuthHeaders, recipeType, generateMultiple, selectedPantryItems, pantryItems, includeDessert]);

  const handleSaveRecipe = useCallback(async (recipeToSave) => {
    try {
      const response = await fetch('/api/recipes/save', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ homeId: activeHomeId, recipe: recipeToSave }),
      });
      if (!response.ok) throw new Error('Failed to save recipe.');
      const savedRecipe = await response.json();
      setSavedRecipes(prev => [savedRecipe, ...prev]);
    } catch (err) {
      setError(err.message);
    }
  }, [getAuthHeaders, activeHomeId]);

  // New pantry-related handlers
  const handlePantryItemToggle = useCallback((item) => {
    setSelectedPantryItems(prev => {
      const exists = prev.find(p => p.id === item.id);
      if (exists) {
        return prev.filter(p => p.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  }, []);


  const handleRecipeNavigation = useCallback((index) => {
    setCurrentRecipeIndex(index);
    setGeneratedRecipe(generatedRecipes[index]);
  }, [generatedRecipes]);

  const handleViewRecipe = useCallback((recipeToView) => {
    setGeneratedRecipe(recipeToView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const isRecipeSaved = generatedRecipe && savedRecipes.some(r => r.title === generatedRecipe.title);

  // Filter pantry items based on search
  const filteredPantryItems = pantryItems.filter(item => 
    item.name.toLowerCase().includes(pantrySearch.toLowerCase())
  );

  // Group pantry items by location
  const groupedPantryItems = filteredPantryItems.reduce((groups, item) => {
    const location = item.location || 'pantry';
    if (!groups[location]) groups[location] = [];
    groups[location].push(item);
    return groups;
  }, {});

  const locationLabels = {
    pantry: '🏠 Pantry',
    fridge: '❄️ Fridge', 
    freezer: '🧊 Freezer'
  };

  // Handle missing context gracefully - after all hooks
  if (!context) {
    return <div className="container mx-auto px-4 py-8"><p>Loading...</p></div>;
  }

  return (
    <div className="section-padding">
      <div className="container-mobile lg:max-w-none lg:px-8">
        <div className="animate-fade-in mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            <ChefHat className="inline-block w-8 h-8 mr-3" style={{ color: 'var(--color-primary)' }} />
            AI Recipe Generator
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Turn your ingredients into delicious meals
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2">
                    <input type="text" value={ingredientText} onChange={(e) => setIngredientText(e.target.value)} onKeyDown={(e) => {if (e.key === 'Enter') addIngredient()}} className="flex-1 input-base focus-ring" />
                    <button onClick={addIngredient} className="btn-base btn-primary px-5 py-2 font-semibold">Add</button>
                  </div>
                  <div className="space-y-4">
                    <div><label htmlFor="serving-size" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>👥 Serving Size</label><select id="serving-size" defaultValue="2" className="input-base focus-ring w-full"><option value="1">1 person</option><option value="2">2 people</option><option value="4">4 people</option><option value="6">6 people</option></select></div>
                    <div><label htmlFor="dietary-restrictions" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Dietary Restrictions (optional)</label><input type="text" id="dietary-restrictions" placeholder="e.g., vegetarian" className="input-base focus-ring w-full" /></div>
                    
                    {/* Recipe Type Selector */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>⏱️ Recipe Complexity</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center justify-center p-3 border rounded-lg cursor-pointer card-interactive transition-all" style={{
                          backgroundColor: recipeType === 'quick' ? 'var(--color-primary-light)' : 'var(--bg-card)',
                          borderColor: recipeType === 'quick' ? 'var(--color-primary)' : 'var(--border-light)',
                          color: recipeType === 'quick' ? 'var(--color-primary)' : 'var(--text-primary)'
                        }}>
                          <input
                            type="radio"
                            value="quick"
                            checked={recipeType === 'quick'}
                            onChange={(e) => setRecipeType(e.target.value)}
                            className="sr-only"
                          />
                          <div className="text-center">
                            <div className="font-medium text-sm">Quick & Easy</div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>15-30 min</div>
                          </div>
                        </label>
                        <label className="flex items-center justify-center p-3 border rounded-lg cursor-pointer card-interactive transition-all" style={{
                          backgroundColor: recipeType === 'sophisticated' ? 'var(--color-primary-light)' : 'var(--bg-card)',
                          borderColor: recipeType === 'sophisticated' ? 'var(--color-primary)' : 'var(--border-light)',
                          color: recipeType === 'sophisticated' ? 'var(--color-primary)' : 'var(--text-primary)'
                        }}>
                          <input
                            type="radio"
                            value="sophisticated"
                            checked={recipeType === 'sophisticated'}
                            onChange={(e) => setRecipeType(e.target.value)}
                            className="sr-only"
                          />
                          <div className="text-center">
                            <div className="font-medium text-sm">Sophisticated</div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>45+ min</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Multiple Recipe Generation Toggle */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={generateMultiple}
                          onChange={(e) => setGenerateMultiple(e.target.checked)}
                          className="rounded focus-ring"
                          style={{ 
                            borderColor: 'var(--border-light)',
                            color: 'var(--color-primary)'
                          }}
                        />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Generate 3 recipe options</span>
                      </label>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }} title="Get multiple recipe variations to choose from">
                        ℹ️
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleGenerateRecipe} 
                    disabled={isLoading} 
                    className="w-full py-3 btn-base font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-lg" 
                    style={{ 
                      background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    {isLoading ? <LoadingSpinner /> : '✨'} 
                    {isLoading ? 'Generating...' : 'Generate Recipe'}
                  </button>
                  {selectedPantryItems.length === 0 && ingredients.length === 0 && (
                    <p className="text-sm text-center mt-2" style={{ color: 'var(--text-muted)' }}>
                      No ingredients selected - will use all pantry items
                    </p>
                  )}
                </div>
                
                {/* Recipe Display Area */}
                <div className="card p-6">
                {error && <div className="p-4 rounded-lg mb-4" style={{ 
                  backgroundColor: 'var(--color-error-light)', 
                  borderLeft: '4px solid var(--color-error)',
                  color: 'var(--color-error)' 
                }}><p><strong>Error:</strong> {error}</p></div>}
                {isLoading && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-6" 
                         style={{ 
                           borderColor: 'var(--border-light)', 
                           borderTopColor: 'var(--color-primary)' 
                         }}>
                    </div>
                    <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Creating your {generateMultiple ? 'recipes' : 'recipe'}...
                    </p>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                      This may take up to 30 seconds
                    </p>
                    <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                      <p>
                        🍳 Using {selectedPantryItems.length === 0 && ingredients.length === 0 
                          ? 'all pantry items'
                          : `${selectedPantryItems.length + ingredients.length} ingredients`}
                      </p>
                      <p>
                        ⏱️ {recipeType === 'quick' ? 'Quick & Easy' : 'Sophisticated'} recipe
                      </p>
                      {expiringItems.some(item => selectedPantryItems.some(selected => selected.id === item.id)) && (
                        <p style={{ color: 'var(--color-error)' }}>
                          ⚠️ Including expiring ingredients
                        </p>
                      )}
                      {includeDessert && (
                        <p>
                          🍰 Including dessert component
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {!isLoading && !generatedRecipe && <div className="text-center py-12 flex flex-col items-center justify-center h-full"><div className="text-6xl mb-4">🍽️</div><h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Your recipe awaits!</h3><p style={{ color: 'var(--text-muted)' }}>Add ingredients and click generate, or check out your saved recipes below.</p></div>}
                
                {!isLoading && generatedRecipe && (
                  <div>
                    {/* Recipe Navigation for Multiple Recipes */}
                    {generatedRecipes.length > 1 && (
                      <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Recipe Options:</span>
                          <div className="flex gap-1">
                            {generatedRecipes.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => handleRecipeNavigation(index)}
                                className="w-8 h-8 rounded-full text-sm font-semibold card-interactive transition-all"
                                style={{
                                  backgroundColor: index === currentRecipeIndex ? 'var(--color-primary)' : 'var(--bg-secondary)',
                                  color: index === currentRecipeIndex ? 'white' : 'var(--text-secondary)'
                                }}
                              >
                                {index + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRecipeNavigation(Math.max(0, currentRecipeIndex - 1))}
                            disabled={currentRecipeIndex === 0}
                            className="px-3 py-1 text-sm btn-base btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ← Previous
                          </button>
                          <button
                            onClick={() => handleRecipeNavigation(Math.min(generatedRecipes.length - 1, currentRecipeIndex + 1))}
                            disabled={currentRecipeIndex === generatedRecipes.length - 1}
                            className="px-3 py-1 text-sm btn-base btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <RecipeCard recipe={generatedRecipe} onSave={() => handleSaveRecipe(generatedRecipe)} isSaved={isRecipeSaved} />
                  </div>
                )}
                </div>
            </section>
        </div>

        <section className="mt-12">
            <h2 className="text-3xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>My Saved Recipes</h2>
            {savedRecipes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedRecipes.map(recipe => (
                    <div key={recipe.id} className="card card-interactive p-6 hover-lift cursor-pointer" onClick={() => handleViewRecipe(recipe)}>
                      <h3 className="text-xl font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{recipe.title}</h3>
                      <p className="text-sm mt-2 h-10 overflow-hidden" style={{ color: 'var(--text-secondary)' }}>{recipe.description}</p>
                      <div className="text-xs mt-4 flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
                        <span>{recipe.difficulty}</span>
                        <span>Serves {recipe.servings}</span>
                      </div>
                    </div>
                  ))}
                </div>
            ) : (<p className="card p-6" style={{ color: 'var(--text-muted)' }}>You haven't saved any recipes yet.</p>)}
        </section>
      </div>
    </div>
  );
}
