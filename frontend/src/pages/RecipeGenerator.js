import React, { useState, useCallback, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';

// --- Helper Components for Icons ---
const ChefHatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-orange-500"><path d="M19.8 11.7a3.2 3.2 0 0 0-2.2-5.2A3.2 3.2 0 0 0 15.4 9a3.2 3.2 0 0 0-5.6 0 3.2 3.2 0 0 0-2.2-2.5 3.2 3.2 0 0 0-2.2 5.2c0 1.2.8 2.3 2 2.3h8.8c1.2 0 2-1.1 2-2.3Z"/><path d="M8.6 14h6.8c1.2 0 2-1.1 2-2.3V11h-11v.7c0 1.2.8 2.3 2 2.3Z"/><path d="M12 14v7.5"/><path d="M12 21.5h-4a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h4"/><path d="M12 21.5h4a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2h-4"/></svg>
);
const LoadingSpinner = () => <div className="w-6 h-6 border-4 border-gray-200 border-t-orange-600 rounded-full animate-spin"></div>;
const BookmarkIcon = ({ saved }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 transition-all ${saved ? 'text-orange-500' : 'text-gray-500'}`}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>;

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
          <ul className="space-y-2">{recipe.ingredients.map((ing, i) => <li key={i} className="flex items-start gap-3"><span className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></span><span className="text-gray-700">{ing}</span></li>)}</ul>
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
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
    const servingSize = document.getElementById('serving-size').value;
    const dietaryRestrictions = document.getElementById('dietary-restrictions').value;
    try {
      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ingredients, servingSize, dietaryRestrictions }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }
      const result = await response.json();
      setGeneratedRecipe(result);
    } catch (err) {
      console.error('Failed to generate recipe:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [ingredients, getAuthHeaders]);

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

  const handleViewRecipe = useCallback((recipeToView) => {
    setGeneratedRecipe(recipeToView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const isRecipeSaved = generatedRecipe && savedRecipes.some(r => r.title === generatedRecipe.title);

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
                    <input type="text" value={ingredientText} onChange={(e) => setIngredientText(e.target.value)} onKeyPress={(e) => {if (e.key === 'Enter') addIngredient()}} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
                    <button onClick={addIngredient} className="px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold">Add</button>
                  </div>
                  <div className="space-y-4">
                    <div><label htmlFor="serving-size" className="block text-sm font-medium text-gray-700 mb-1">👥 Serving Size</label><select id="serving-size" defaultValue="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="1">1 person</option><option value="2">2 people</option><option value="4">4 people</option><option value="6">6 people</option></select></div>
                    <div><label htmlFor="dietary-restrictions" className="block text-sm font-medium text-gray-700 mb-1">Dietary Restrictions (optional)</label><input type="text" id="dietary-restrictions" placeholder="e.g., vegetarian" className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                  </div>
                  <button onClick={handleGenerateRecipe} disabled={isLoading || ingredients.length === 0} className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-lg">{isLoading ? <LoadingSpinner /> : '✨'} {isLoading ? 'Generating...' : 'Generate Recipe'}</button>
                </div>
            </section>

            <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8 lg:col-span-2">
                {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-4"><p><strong>Error:</strong> {error}</p></div>}
                {isLoading && <div className="text-center py-12 flex flex-col items-center justify-center h-full"><LoadingSpinner /><p className="text-gray-600 text-lg mt-4 animate-pulse">Creating your perfect recipe...</p></div>}
                {!isLoading && !generatedRecipe && <div className="text-center py-12 flex flex-col items-center justify-center h-full"><div className="text-6xl mb-4">🍽️</div><h3 className="text-xl font-semibold text-gray-700">Your recipe awaits!</h3><p className="text-gray-500">Add ingredients and click generate, or check out your saved recipes below.</p></div>}
                {!isLoading && generatedRecipe && <RecipeCard recipe={generatedRecipe} onSave={() => handleSaveRecipe(generatedRecipe)} isSaved={isRecipeSaved} />}
            </section>
        </div>

        <section className="max-w-6xl mx-auto mt-12">
            <h2 className="text-3xl font-bold mb-6">My Saved Recipes</h2>
            {savedRecipes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedRecipes.map(recipe => (
                    <div key={recipe.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 ease-in-out cursor-pointer" onClick={() => handleViewRecipe(recipe)}>
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
