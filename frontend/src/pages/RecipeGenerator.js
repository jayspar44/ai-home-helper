import React, { useState, useCallback, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';

// --- Helper Components for Icons ---
const ChefHatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-orange-500"><path d="M19.8 11.7a3.2 3.2 0 0 0-2.2-5.2A3.2 3.2 0 0 0 15.4 9a3.2 3.2 0 0 0-5.6 0 3.2 3.2 0 0 0-2.2-2.5 3.2 3.2 0 0 0-2.2 5.2c0 1.2.8 2.3 2 2.3h8.8c1.2 0 2-1.1 2-2.3Z"/><path d="M8.6 14h6.8c1.2 0 2-1.1 2-2.3V11h-11v.7c0 1.2.8 2.3 2 2.3Z"/><path d="M12 14v7.5"/><path d="M12 21.5h-4a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h4"/><path d="M12 21.5h4a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2h-4"/></svg>
);
const LoadingSpinner = () => <div className="w-6 h-6 border-4 border-gray-200 border-t-orange-600 rounded-full animate-spin"></div>;
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
const BookmarkIcon = ({ saved }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 transition-all ${saved ? 'text-orange-500' : 'text-gray-500'}`}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>;
const ChevronDownIcon = () => <svg className="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" /></svg>;
const SearchIcon = () => <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" /></svg>;

function RecipeCard({ recipe, onSave, isSaved }) {
  if (!recipe) return null;
  return (
    <div className="space-y-6 animate-fade-in relative">
       <button onClick={onSave} disabled={isSaved} className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md hover:bg-gray-100 disabled:opacity-70 disabled:cursor-not-allowed transition-all" aria-label="Save recipe"><BookmarkIcon saved={isSaved} /></button>
      <div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2 pr-12">{recipe.title}</h2>
        <p className="text-gray-600 mb-4">{recipe.description}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 border-t border-b py-3">
          <div className="flex items-center gap-1.5"><span>⏱️</span> Prep: <strong>{recipe.prepTime}</strong></div>
          <div className="flex items-center gap-1.5"><span>🍳</span> Cook: <strong>{recipe.cookTime}</strong></div>
          <div className="flex items-center gap-1.5"><span>👥</span> Serves: <strong>{recipe.servings}</strong></div>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">{recipe.difficulty}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-3">Ingredients</h3>
          <ul className="space-y-2">{recipe.ingredients.map((ing, i) => {
            const isPantryItem = recipe.pantryIngredients && recipe.pantryIngredients.includes(ing);
            return (
              <li key={i} className="flex items-start gap-3">
                <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${isPantryItem ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                <span className={`text-gray-700 ${isPantryItem ? 'text-green-800' : ''}`}>{ing}</span>
              </li>
            );
          })}</ul>
          {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
            <div className="mt-4 p-3 bg-orange-50 rounded-lg">
              <h4 className="font-semibold text-orange-800 text-sm mb-2">🛒 What's Missing?</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                {recipe.missingIngredients.map((ing, i) => <li key={i}>• {ing}</li>)}
              </ul>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-3">Chef's Tips</h3>
          <ul className="space-y-2">{recipe.tips.map((tip, i) => <li key={i} className="flex items-start gap-3 text-sm"><span className="text-blue-500 mt-1">💡</span><span className="text-gray-700">{tip}</span></li>)}</ul>
        </div>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Instructions</h3>
        <ol className="space-y-4">{recipe.instructions.map((step, i) => <li key={i} className="flex gap-4"><span className="flex-shrink-0 w-7 h-7 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold">{i + 1}</span><span className="text-gray-700 pt-0.5">{step}</span></li>)}</ol>
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
  const [isPantryExpanded, setIsPantryExpanded] = useState(false);
  const [pantrySearch, setPantrySearch] = useState('');
  const [isLoadingPantry, setIsLoadingPantry] = useState(false);
  
  // New state for recipe options
  const [recipeType, setRecipeType] = useState('quick'); // 'quick' or 'sophisticated'
  const [generateMultiple, setGenerateMultiple] = useState(false);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);

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
    if (ingredients.length === 0) {
      setError("Please add at least one ingredient.");
      return;
    }
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
          ingredients, 
          servingSize, 
          dietaryRestrictions,
          recipeType,
          generateCount,
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
  }, [ingredients, getAuthHeaders, recipeType, generateMultiple, selectedPantryItems]);

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

  const handleUseSelectedItems = useCallback(() => {
    const newIngredients = selectedPantryItems.map(item => item.name);
    const uniqueIngredients = [...new Set([...ingredients, ...newIngredients])];
    setIngredients(uniqueIngredients);
    setError('');
  }, [selectedPantryItems, ingredients]);

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
    <div className="container mx-auto px-4 py-8 md:py-12">
        <header>
            <div className="text-center">
                <div className="flex items-center justify-center gap-4 mb-4"><ChefHatIcon /></div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800">AI Recipe Generator</h1>
                <p className="text-gray-600 text-lg">Turn your ingredients into delicious meals.</p>
            </div>
        </header>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
            <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-6 lg:col-span-1">
                {/* Pantry Items Panel */}
                <div className="border-b pb-6 mb-6">
                  <button 
                    onClick={() => setIsPantryExpanded(!isPantryExpanded)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <h2 className="text-xl font-semibold text-gray-800">🥫 Pantry Items</h2>
                    <div className={`transition-transform ${isPantryExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDownIcon />
                    </div>
                  </button>
                  
                  {isPantryExpanded && (
                    <div className="mt-4 space-y-4 animate-fade-in">
                      {/* Search Bar */}
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <SearchIcon />
                        </div>
                        <input
                          type="text"
                          placeholder="Search pantry items..."
                          value={pantrySearch}
                          onChange={(e) => setPantrySearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                        />
                      </div>

                      {/* Selected Items Counter */}
                      {selectedPantryItems.length > 0 && (
                        <div className="flex items-center justify-between bg-orange-50 p-2 rounded-lg">
                          <span className="text-sm text-orange-800">
                            {selectedPantryItems.length} item{selectedPantryItems.length !== 1 ? 's' : ''} selected
                          </span>
                          <button
                            onClick={handleUseSelectedItems}
                            className="text-xs bg-orange-600 text-white px-3 py-1 rounded-full hover:bg-orange-700 transition-colors"
                          >
                            Use Selected
                          </button>
                        </div>
                      )}

                      {/* Pantry Items List */}
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {isLoadingPantry ? (
                          <div className="text-center py-4">
                            <LoadingSpinner />
                            <p className="text-sm text-gray-500 mt-2">Loading pantry...</p>
                          </div>
                        ) : Object.keys(groupedPantryItems).length > 0 ? (
                          Object.entries(groupedPantryItems).map(([location, items]) => (
                            <div key={location} className="space-y-1">
                              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                                {locationLabels[location]}
                              </h4>
                              {items.map(item => {
                                const isSelected = selectedPantryItems.some(p => p.id === item.id);
                                const daysUntilExpiry = item.daysUntilExpiry || 7;
                                const isExpiringSoon = daysUntilExpiry <= 3;
                                
                                return (
                                  <label
                                    key={item.id}
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 transition-colors ${
                                      isSelected ? 'bg-orange-50 border border-orange-200' : 'border border-gray-100'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handlePantryItemToggle(item)}
                                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900 truncate">
                                          {item.name}
                                        </span>
                                        {isExpiringSoon && (
                                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                            {daysUntilExpiry}d
                                          </span>
                                        )}
                                      </div>
                                      {item.quantity && (
                                        <span className="text-xs text-gray-500">{item.quantity}</span>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">
                            {pantrySearch ? 'No items match your search' : 'No pantry items found'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-2">Your Ingredients</h2>
                  <div className="flex flex-wrap gap-2 min-h-[44px] bg-gray-50 p-2 rounded-lg">
                    {ingredients.length > 0 ? (
                      ingredients.map((ing, i) => <span key={i} className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-2 animate-fade-in">{ing}<button onClick={() => removeIngredient(i)} className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-orange-700 transition-colors">×</button></span>)
                    ) : (<p className="text-gray-400 text-sm p-1.5">Add some items...</p>)}
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2">
                    <input type="text" value={ingredientText} onChange={(e) => setIngredientText(e.target.value)} onKeyDown={(e) => {if (e.key === 'Enter') addIngredient()}} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
                    <button onClick={addIngredient} className="px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold">Add</button>
                  </div>
                  <div className="space-y-4">
                    <div><label htmlFor="serving-size" className="block text-sm font-medium text-gray-700 mb-1">👥 Serving Size</label><select id="serving-size" defaultValue="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="1">1 person</option><option value="2">2 people</option><option value="4">4 people</option><option value="6">6 people</option></select></div>
                    <div><label htmlFor="dietary-restrictions" className="block text-sm font-medium text-gray-700 mb-1">Dietary Restrictions (optional)</label><input type="text" id="dietary-restrictions" placeholder="e.g., vegetarian" className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                    
                    {/* Recipe Type Selector */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">⏱️ Recipe Complexity</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${
                          recipeType === 'quick' ? 'bg-orange-50 border-orange-300 text-orange-800' : 'border-gray-300 hover:bg-gray-50'
                        }`}>
                          <input
                            type="radio"
                            value="quick"
                            checked={recipeType === 'quick'}
                            onChange={(e) => setRecipeType(e.target.value)}
                            className="sr-only"
                          />
                          <div className="text-center">
                            <div className="font-medium text-sm">Quick & Easy</div>
                            <div className="text-xs text-gray-500">15-30 min</div>
                          </div>
                        </label>
                        <label className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${
                          recipeType === 'sophisticated' ? 'bg-orange-50 border-orange-300 text-orange-800' : 'border-gray-300 hover:bg-gray-50'
                        }`}>
                          <input
                            type="radio"
                            value="sophisticated"
                            checked={recipeType === 'sophisticated'}
                            onChange={(e) => setRecipeType(e.target.value)}
                            className="sr-only"
                          />
                          <div className="text-center">
                            <div className="font-medium text-sm">Sophisticated</div>
                            <div className="text-xs text-gray-500">45+ min</div>
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
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Generate 3 recipe options</span>
                      </label>
                      <div className="text-xs text-gray-500" title="Get multiple recipe variations to choose from">
                        ℹ️
                      </div>
                    </div>
                  </div>
                  <button onClick={handleGenerateRecipe} disabled={isLoading || ingredients.length === 0} className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-lg">{isLoading ? <LoadingSpinner /> : '✨'} {isLoading ? 'Generating...' : 'Generate Recipe'}</button>
                </div>
            </section>

            <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 lg:col-span-2">
                {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-4"><p><strong>Error:</strong> {error}</p></div>}
                {isLoading && (
                  <div>
                    <div className="text-center py-6 border-b mb-6">
                      <LoadingSpinner />
                      <p className="text-gray-600 text-lg mt-4 animate-pulse">
                        {generateMultiple ? 'Creating your recipe options...' : 'Creating your perfect recipe...'}
                      </p>
                    </div>
                    <SkeletonCard />
                  </div>
                )}
                {!isLoading && !generatedRecipe && <div className="text-center py-12 flex flex-col items-center justify-center h-full"><div className="text-6xl mb-4">🍽️</div><h3 className="text-xl font-semibold text-gray-700">Your recipe awaits!</h3><p className="text-gray-500">Add ingredients and click generate, or check out your saved recipes below.</p></div>}
                
                {!isLoading && generatedRecipe && (
                  <div>
                    {/* Recipe Navigation for Multiple Recipes */}
                    {generatedRecipes.length > 1 && (
                      <div className="flex items-center justify-between mb-6 pb-4 border-b">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Recipe Options:</span>
                          <div className="flex gap-1">
                            {generatedRecipes.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => handleRecipeNavigation(index)}
                                className={`w-8 h-8 rounded-full text-sm font-semibold transition-all ${
                                  index === currentRecipeIndex 
                                    ? 'bg-orange-600 text-white' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
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
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ← Previous
                          </button>
                          <button
                            onClick={() => handleRecipeNavigation(Math.min(generatedRecipes.length - 1, currentRecipeIndex + 1))}
                            disabled={currentRecipeIndex === generatedRecipes.length - 1}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <RecipeCard recipe={generatedRecipe} onSave={() => handleSaveRecipe(generatedRecipe)} isSaved={isRecipeSaved} />
                  </div>
                )}
            </section>
        </div>

        <section className="max-w-6xl mx-auto mt-12">
            <h2 className="text-3xl font-bold mb-6">My Saved Recipes</h2>
            {savedRecipes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedRecipes.map(recipe => (
                    <div key={recipe.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl hover-lift transition-smooth cursor-pointer" onClick={() => handleViewRecipe(recipe)}>
                      <h3 className="text-xl font-semibold text-gray-800 truncate">{recipe.title}</h3>
                      <p className="text-gray-600 text-sm mt-2 h-10 overflow-hidden">{recipe.description}</p>
                      <div className="text-xs mt-4 flex items-center justify-between text-gray-500">
                        <span>{recipe.difficulty}</span>
                        <span>Serves {recipe.servings}</span>
                      </div>
                    </div>
                  ))}
                </div>
            ) : (<p className="text-gray-500 bg-white p-6 rounded-lg shadow-sm">You haven't saved any recipes yet.</p>)}
        </section>
    </div>
  );
}
