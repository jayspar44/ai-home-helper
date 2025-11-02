import React, { useState, useCallback, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { Calendar, Search, ChevronDown, ChevronUp, Sparkles, Palette, ArrowLeft, ChefHat } from 'lucide-react';
import { calculateRemainingDays } from '../utils/dateUtils';
import RecipeSelector from '../components/RecipeSelector';
import RecipeSchedulingModal from '../components/RecipeSchedulingModal';
import logger from '../utils/logger';

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

function RecipeCard({ recipe, onSave, isSaved, onSchedule }) {
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

      {/* Pantry Items Used Section */}
      {recipe.pantryItemsUsed && recipe.pantryItemsUsed.length > 0 && (
        <div className="card p-6 border-l-4" style={{ borderLeftColor: 'var(--color-success)', backgroundColor: 'var(--color-success-light)' }}>
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-success)' }}>
            <span>✓</span> Pantry Items Used
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recipe.pantryItemsUsed.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white">
                <span className="text-xl">🥫</span>
                <div className="flex-1">
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {item.itemName}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {item.quantity}
                    {item.daysUntilExpiry !== null && item.daysUntilExpiry <= 3 && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{
                        backgroundColor: 'var(--color-warning-light)',
                        color: 'var(--color-warning)'
                      }}>
                        Expires soon
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shopping List Section */}
      {recipe.shoppingListItems && recipe.shoppingListItems.length > 0 && (
        <div className="card p-6 border-l-4" style={{ borderLeftColor: 'var(--color-accent)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span>🛒</span> Shopping List
            </h3>
            <button
              onClick={() => {/* TODO: Implement add to shopping list */}}
              className="btn-base btn-primary px-4 py-2 text-sm flex items-center gap-2"
            >
              Add All to List
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recipe.shoppingListItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary">
                <span className="text-xl">
                  {item.category === 'produce' ? '🥬' :
                   item.category === 'dairy' ? '🥛' :
                   item.category === 'meat' ? '🥩' :
                   item.category === 'pantry' ? '🥫' : '📦'}
                </span>
                <div className="flex-1">
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {item.name}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {item.quantity}
                    {item.priority === 'essential' && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{
                        backgroundColor: 'var(--color-primary-light)',
                        color: 'var(--color-primary)'
                      }}>
                        Essential
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {onSchedule && (
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
          <button
            onClick={onSchedule}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors hover:bg-opacity-90"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            <Calendar className="w-4 h-4" />
            Schedule Recipe
          </button>
        </div>
      )}
    </div>
  );
}

export default function RecipeGenerator() {
  const location = useLocation();
  const context = useOutletContext();

  // Extract context values safely with defaults
  const userToken = context?.userToken;
  const activeHomeId = context?.activeHomeId;
  
  // View state management
  const [view, setView] = useState('menu'); // 'menu' | 'results' | 'legacy'
  const [expandedSection, setExpandedSection] = useState(null); // null | 'roscoes' | 'customize'

  const [ingredients, setIngredients] = useState([]);
  const [ingredientText, setIngredientText] = useState('');
  const [generatedRecipe, setGeneratedRecipe] = useState(null);
  const [generatedRecipes, setGeneratedRecipes] = useState([]); // For multiple recipes
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [recentRecipes, setRecentRecipes] = useState(() => {
    // Load recent recipes from localStorage on mount
    try {
      const stored = localStorage.getItem('recentRecipes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
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

  // Recipe scheduling state
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [recipeToSchedule, setRecipeToSchedule] = useState(null);
  const [showRecipeSchedulingModal, setShowRecipeSchedulingModal] = useState(false);
  const [recipeToDirectSchedule, setRecipeToDirectSchedule] = useState(null);

  // Roscoe's Choice state
  const [pantryMode, setPantryMode] = useState('pantry_only'); // 'pantry_only' | 'pantry_plus_shopping'
  const [numberOfRecipes, setNumberOfRecipes] = useState(1);
  const [numberOfPeople, setNumberOfPeople] = useState(2);
  const [quickMealsOnly, setQuickMealsOnly] = useState(false);
  const [prioritizeExpiring, setPrioritizeExpiring] = useState(false);
  const [aiRefusal, setAiRefusal] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Customize state
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [selectedProteins, setSelectedProteins] = useState([]);
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [servingSize, setServingSize] = useState(2);
  const [specificIngredients, setSpecificIngredients] = useState([]);
  const [customizePantryMode, setCustomizePantryMode] = useState('ignore_pantry'); // 'use_pantry_supplement' | 'use_pantry_only' | 'ignore_pantry'
  const [showPantrySelector, setShowPantrySelector] = useState(false);

  // Feedback/Regeneration state
  const [recipeFeedback, setRecipeFeedback] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Saved recipes display state
  const [showAllSavedRecipes, setShowAllSavedRecipes] = useState(false);

  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`,
  }), [userToken]);

  // Save recent recipes to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('recentRecipes', JSON.stringify(recentRecipes));
    } catch (err) {
      console.error('Failed to save recent recipes to localStorage:', err);
    }
  }, [recentRecipes]);

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
            setSavedRecipes(data.recipes || []);
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
        logger.error('Error fetching pantry items:', err);
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
      logger.error('Failed to generate recipe:', err);
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
    setGeneratedRecipes([recipeToView]); // Single recipe array
    setCurrentRecipeIndex(0);
    setView('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleScheduleRecipe = useCallback((recipe) => {
    setRecipeToDirectSchedule(recipe);
    setShowRecipeSchedulingModal(true);
  }, []);

  const handleRecipeScheduled = useCallback((scheduledMeal) => {
    setShowRecipeSelector(false);
    setRecipeToSchedule(null);
    // Optionally show success message
    logger.debug('Recipe scheduled successfully:', scheduledMeal);
  }, []);

  const handleDirectRecipeScheduled = useCallback((scheduledMeal) => {
    setShowRecipeSchedulingModal(false);
    setRecipeToDirectSchedule(null);
    // Optionally show success message
    logger.debug('Recipe scheduled directly:', scheduledMeal);
  }, []);

  // View navigation handlers
  const handleStartRoscoesChoice = useCallback(() => {
    setExpandedSection(expandedSection === 'roscoes' ? null : 'roscoes');
    setError('');
  }, [expandedSection]);

  const handleStartCustomize = useCallback(() => {
    setExpandedSection(expandedSection === 'customize' ? null : 'customize');
    setError('');
  }, [expandedSection]);

  const handleBackToMenu = useCallback(() => {
    setView('menu');
    setExpandedSection(null);
    setError('');
    setGeneratedRecipe(null);
    setGeneratedRecipes([]);
    setAiRefusal(null);
  }, []);

  const handleUseLegacy = useCallback(() => {
    setView('legacy');
    setError('');
  }, []);

  // Roscoe's Choice recipe generation
  const handleGenerateRoscoesChoice = useCallback(async () => {
    if (!userToken || !activeHomeId) {
      setError('Authentication required');
      return;
    }

    setIsGenerating(true);
    setError('');
    setAiRefusal(null);
    setGeneratedRecipe(null);
    setGeneratedRecipes([]);

    try {
      const response = await fetch('/api/generate-recipe/roscoes-choice', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          homeId: activeHomeId,
          mode: pantryMode,
          numberOfPeople,
          quickMealsOnly,
          prioritizeExpiring,
          numberOfRecipes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle AI refusal (400 status)
        if (response.status === 400 && data.reason) {
          setAiRefusal({
            reason: data.reason,
            suggestions: data.suggestions || []
          });
          logger.info('AI refused to generate recipe:', data.reason);
          return;
        }

        // Handle rate limit error
        if (response.status === 429) {
          setError(data.message || 'Too many requests. Please try again later.');
          return;
        }

        throw new Error(data.error || 'Failed to generate recipe');
      }

      // Handle successful generation
      if (Array.isArray(data)) {
        // Multiple recipes
        setGeneratedRecipes(data);
        setGeneratedRecipe(data[0]); // Set first recipe for display
        setCurrentRecipeIndex(0);
        setRecentRecipes(prev => [...data, ...prev].slice(0, 10)); // Keep last 10
        logger.info(`Generated ${data.length} recipes with Ask Roscoe`);
      } else {
        // Single recipe
        setGeneratedRecipe(data);
        setGeneratedRecipes([data]);
        setCurrentRecipeIndex(0);
        setRecentRecipes(prev => [data, ...prev].slice(0, 10));
        logger.info('Generated recipe with Ask Roscoe:', data.title);
      }

      // Switch to results view
      setView('results');

    } catch (error) {
      logger.error('Error generating Roscoe\'s Choice recipe:', error);
      setError(error.message || 'Failed to generate recipe. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [userToken, activeHomeId, pantryMode, numberOfPeople, quickMealsOnly, prioritizeExpiring, numberOfRecipes, getAuthHeaders]);

  // Recipe regeneration with feedback
  const handleRegenerateWithFeedback = useCallback(async () => {
    if (!userToken || !activeHomeId || !generatedRecipe) {
      setError('Cannot regenerate recipe');
      return;
    }

    if (!recipeFeedback.trim()) {
      setError('Please provide feedback for regeneration');
      return;
    }

    setIsRegenerating(true);
    setError('');

    try {
      const response = await fetch('/api/generate-recipe/regenerate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          homeId: activeHomeId,
          originalRecipe: generatedRecipe,
          feedback: recipeFeedback.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limit error
        if (response.status === 429) {
          setError(data.message || 'Too many requests. Please try again later.');
          return;
        }

        throw new Error(data.error || 'Failed to regenerate recipe');
      }

      // Update the current recipe with regenerated version
      setGeneratedRecipe(data);
      if (generatedRecipes.length > 0) {
        const updatedRecipes = [...generatedRecipes];
        updatedRecipes[currentRecipeIndex] = data;
        setGeneratedRecipes(updatedRecipes);
      }
      setRecentRecipes(prev => [data, ...prev].slice(0, 10));
      setRecipeFeedback(''); // Clear feedback after successful regeneration
      logger.info('Recipe regenerated with feedback:', data.title);

    } catch (error) {
      logger.error('Error regenerating recipe:', error);
      setError(error.message || 'Failed to regenerate recipe. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  }, [userToken, activeHomeId, generatedRecipe, recipeFeedback, generatedRecipes, currentRecipeIndex, getAuthHeaders]);

  // Customize recipe generation
  const handleGenerateCustomize = useCallback(async () => {
    if (!userToken || !activeHomeId) {
      setError('Authentication required');
      return;
    }

    setIsGenerating(true);
    setError('');
    setAiRefusal(null);
    setGeneratedRecipe(null);
    setGeneratedRecipes([]);

    try {
      const response = await fetch('/api/generate-recipe/customize', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          homeId: activeHomeId,
          aiPrompt: aiPrompt.trim() || undefined,
          cuisines: selectedCuisines.length > 0 ? selectedCuisines : undefined,
          proteins: selectedProteins.length > 0 ? selectedProteins : undefined,
          preferences: selectedPreferences.length > 0 ? selectedPreferences : undefined,
          numberOfRecipes,
          servingSize,
          specificIngredients: specificIngredients.length > 0 ? specificIngredients : undefined,
          pantryMode: customizePantryMode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle AI refusal (400 status)
        if (response.status === 400 && data.reason) {
          setAiRefusal({
            reason: data.reason,
            suggestions: data.suggestions || []
          });
          logger.info('AI refused to generate custom recipe:', data.reason);
          return;
        }

        // Handle rate limit error
        if (response.status === 429) {
          setError(data.message || 'Too many requests. Please try again later.');
          return;
        }

        throw new Error(data.error || 'Failed to generate recipe');
      }

      // Handle successful generation
      if (Array.isArray(data)) {
        // Multiple recipes
        setGeneratedRecipes(data);
        setGeneratedRecipe(data[0]); // Set first recipe for display
        setCurrentRecipeIndex(0);
        setRecentRecipes(prev => [...data, ...prev].slice(0, 10));
        logger.info(`Generated ${data.length} custom meals`);
      } else {
        // Single recipe
        setGeneratedRecipe(data);
        setGeneratedRecipes([data]);
        setCurrentRecipeIndex(0);
        setRecentRecipes(prev => [data, ...prev].slice(0, 10));
        logger.info('Generated custom meal:', data.title);
      }

      // Switch to results view
      setView('results');

    } catch (error) {
      logger.error('Error generating custom recipe:', error);
      setError(error.message || 'Failed to generate recipe. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [userToken, activeHomeId, aiPrompt, selectedCuisines, selectedProteins, selectedPreferences, numberOfRecipes, servingSize, specificIngredients, customizePantryMode, getAuthHeaders]);

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
        {/* Page Header */}
        <div className="animate-fade-in mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2 text-color-primary">
            🍽️ Recipe Generator
          </h1>
          <p className="text-color-muted">
            {view === 'menu' ? 'What would you like to cook today?' : 'Turn your ingredients into delicious meals with AI assistance'}
          </p>
        </div>

        {/* Main Menu View */}
        {view === 'menu' && (
          <>
            {/* Mode Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Ask Roscoe Container */}
              <div>
                {/* Ask Roscoe Card */}
                <div className="card relative overflow-hidden mb-3">
                  <div className="absolute top-0 left-0 right-0 h-1" style={{
                    backgroundColor: 'var(--color-primary)'
                  }}></div>
                  <div className="p-6">
                    <button
                      onClick={handleStartRoscoesChoice}
                      className="btn-base btn-primary w-full py-2.5 font-semibold flex items-center justify-center gap-2 mb-3"
                    >
                      <Sparkles className="w-4 h-4" />
                      Ask Roscoe
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <p className="text-color-secondary text-sm text-center">
                      Let Roscoe analyze your pantry and create smart, personalized meals for you
                    </p>
                  </div>
                </div>

                {/* Expandable Ask Roscoe Section */}
                {expandedSection === 'roscoes' && (
              <div className="card p-4 mb-8 animate-fade-in border-t-2" style={{ borderTopColor: 'var(--color-primary)' }}>
                <div className="flex justify-end mb-3">
                  <button
                    onClick={() => setExpandedSection(null)}
                    className="btn-base btn-ghost p-1"
                    aria-label="Minimize options"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                </div>

                {/* Pantry Mode Toggle */}
                <div className="mb-3 pb-3 border-b border-color-light flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-color-primary text-sm">Pantry Mode:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPantryMode('pantry_only')}
                      className={`py-1.5 px-3 rounded-lg font-medium transition-all text-xs ${
                        pantryMode === 'pantry_only'
                          ? 'bg-color-primary text-white'
                          : 'bg-secondary text-color-secondary hover:bg-color-primary hover:bg-opacity-10'
                      }`}
                    >
                      🥘 Pantry Only
                    </button>
                    <button
                      onClick={() => setPantryMode('pantry_plus_shopping')}
                      className={`py-1.5 px-3 rounded-lg font-medium transition-all text-xs ${
                        pantryMode === 'pantry_plus_shopping'
                          ? 'bg-color-primary text-white'
                          : 'bg-secondary text-color-secondary hover:bg-color-primary hover:bg-opacity-10'
                      }`}
                    >
                      🛒 Pantry + Shopping
                    </button>
                  </div>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Number of Meals */}
                  <div>
                    <label className="block font-semibold text-color-primary mb-2 text-sm">
                      Number of Meals
                    </label>
                    <div className="flex gap-2">
                      {[1, 3, 5].map(num => (
                        <button
                          key={num}
                          onClick={() => setNumberOfRecipes(num)}
                          className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all text-sm ${
                            numberOfRecipes === num
                              ? 'bg-color-primary text-white'
                              : 'bg-secondary text-color-secondary hover:bg-color-primary hover:bg-opacity-10'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Number of People */}
                  <div>
                    <label className="block font-semibold text-color-primary mb-2 text-sm">
                      Number of People
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 4, 6].map(num => (
                        <button
                          key={num}
                          onClick={() => setNumberOfPeople(num)}
                          className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all text-sm ${
                            numberOfPeople === num
                              ? 'bg-color-primary text-white'
                              : 'bg-secondary text-color-secondary hover:bg-color-primary hover:bg-opacity-10'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Options */}
                  <div>
                    <label className="block font-semibold text-color-primary mb-2 text-sm">
                      Quick Options
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={quickMealsOnly}
                          onChange={(e) => setQuickMealsOnly(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-color-primary">Quick Meals (≤30 min)</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prioritizeExpiring}
                          onChange={(e) => setPrioritizeExpiring(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-color-primary">Prioritize Expiring</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* AI Refusal Message */}
                {aiRefusal && (
                  <div className="p-4 mb-4 rounded-lg border-l-4" style={{ borderLeftColor: 'var(--color-warning)', backgroundColor: 'var(--color-warning-light)' }}>
                    <div className="flex items-start gap-2">
                      <div className="text-2xl">⚠️</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-color-primary mb-1 text-sm">Unable to Generate</h4>
                        <p className="text-color-secondary text-sm mb-2">{aiRefusal.reason}</p>
                        {aiRefusal.suggestions && aiRefusal.suggestions.length > 0 && (
                          <div>
                            <p className="font-medium text-color-primary mb-1 text-xs">Suggestions:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-color-secondary text-xs">
                              {aiRefusal.suggestions.map((suggestion, index) => (
                                <li key={index}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Generate Button */}
                <button
                  onClick={handleGenerateRoscoesChoice}
                  disabled={isGenerating || pantryItems.length === 0}
                  className="btn-base btn-primary w-full py-3 text-base font-semibold flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Meals
                    </>
                  )}
                </button>

                {pantryItems.length === 0 && (
                  <p className="text-xs text-color-muted text-center mt-2">
                    Add some items to your pantry first
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Customize It Container */}
          <div>
            {/* Customize It Card */}
            <div className="card relative overflow-hidden mb-3">
              <div className="absolute top-0 left-0 right-0 h-1" style={{
                backgroundColor: 'var(--color-primary)'
              }}></div>
              <div className="p-6">
                <button
                  onClick={handleStartCustomize}
                  className="btn-base btn-primary w-full py-2.5 font-semibold flex items-center justify-center gap-2 mb-3"
                >
                  <Palette className="w-4 h-4" />
                  Start Customizing
                  <ChevronDown className="w-4 h-4" />
                </button>
                <p className="text-color-secondary text-sm text-center">
                  Hand-pick your ingredients, cuisine preferences, and dietary requirements
                </p>
              </div>
            </div>

            {/* Expandable Customize It Section */}
            {expandedSection === 'customize' && (
              <div className="card p-4 mb-8 animate-fade-in border-t-2" style={{ borderTopColor: 'var(--color-primary)' }}>
                <div className="flex justify-end mb-3">
                  <button
                    onClick={() => setExpandedSection(null)}
                    className="btn-base btn-ghost p-1"
                    aria-label="Minimize options"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                </div>

                {/* AI Prompt Section */}
                <div className="mb-4 pb-4 border-b border-color-light">
                  <label className="block font-semibold text-color-primary mb-2 text-sm">
                    What are you craving? (Optional)
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="E.g., Something spicy with coconut milk, or a hearty winter stew..."
                    className="w-full p-3 rounded-lg bg-secondary text-color-primary border border-color-light focus:border-color-primary outline-none resize-none text-sm"
                    rows={2}
                  />
                </div>

                {/* Multi-select Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Cuisines */}
                  <div className="pb-4 border-b border-color-light md:border-b-0">
                    <label className="block font-semibold text-color-primary mb-2 text-sm">
                      Cuisines (Optional)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Italian', 'Mexican', 'Asian', 'Indian', 'Mediterranean', 'American', 'French', 'Thai'].map(cuisine => (
                        <button
                          key={cuisine}
                          onClick={() => {
                            if (selectedCuisines.includes(cuisine)) {
                              setSelectedCuisines(selectedCuisines.filter(c => c !== cuisine));
                            } else {
                              setSelectedCuisines([...selectedCuisines, cuisine]);
                            }
                          }}
                          className={`py-2 px-3 rounded-lg font-medium transition-all text-xs ${
                            selectedCuisines.includes(cuisine)
                              ? 'bg-color-primary text-white'
                              : 'bg-secondary text-color-secondary hover:bg-color-primary hover:bg-opacity-10'
                          }`}
                        >
                          {cuisine}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Proteins */}
                  <div className="pb-4 border-b border-color-light md:border-b-0">
                    <label className="block font-semibold text-color-primary mb-2 text-sm">
                      Proteins (Optional)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Chicken', 'Beef', 'Pork', 'Fish', 'Shrimp', 'Tofu', 'Beans', 'Eggs'].map(protein => (
                        <button
                          key={protein}
                          onClick={() => {
                            if (selectedProteins.includes(protein)) {
                              setSelectedProteins(selectedProteins.filter(p => p !== protein));
                            } else {
                              setSelectedProteins([...selectedProteins, protein]);
                            }
                          }}
                          className={`py-2 px-3 rounded-lg font-medium transition-all text-xs ${
                            selectedProteins.includes(protein)
                              ? 'bg-color-primary text-white'
                              : 'bg-secondary text-color-secondary hover:bg-color-primary hover:bg-opacity-10'
                          }`}
                        >
                          {protein}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  {/* Preferences */}
                  <div>
                    <label className="block font-semibold text-color-primary mb-2 text-sm">
                      Preferences
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Quick', 'Healthy', 'Comfort', 'Easy'].map(pref => (
                        <button
                          key={pref}
                          onClick={() => {
                            if (selectedPreferences.includes(pref)) {
                              setSelectedPreferences(selectedPreferences.filter(p => p !== pref));
                            } else {
                              setSelectedPreferences([...selectedPreferences, pref]);
                            }
                          }}
                          className={`py-2 px-2 rounded-lg font-medium transition-all text-xs ${
                            selectedPreferences.includes(pref)
                              ? 'bg-color-primary text-white'
                              : 'bg-secondary text-color-secondary hover:bg-color-primary hover:bg-opacity-10'
                          }`}
                        >
                          {pref}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Number of Meals */}
                  <div>
                    <label className="block font-semibold text-color-primary mb-2 text-sm">
                      # of Meals
                    </label>
                    <div className="flex gap-2">
                      {[1, 3, 5].map(num => (
                        <button
                          key={num}
                          onClick={() => setNumberOfRecipes(num)}
                          className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all text-sm ${
                            numberOfRecipes === num
                              ? 'bg-color-primary text-white'
                              : 'bg-secondary text-color-secondary hover:bg-color-primary hover:bg-opacity-10'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Serving Size */}
                  <div>
                    <label className="block font-semibold text-color-primary mb-2 text-sm">
                      Servings
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 4, 6].map(num => (
                        <button
                          key={num}
                          onClick={() => setServingSize(num)}
                          className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all text-sm ${
                            servingSize === num
                              ? 'bg-color-primary text-white'
                              : 'bg-secondary text-color-secondary hover:bg-color-primary hover:bg-opacity-10'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pantry Mode */}
                  <div>
                    <label className="block font-semibold text-color-primary mb-2 text-sm">
                      Pantry Mode
                    </label>
                    <select
                      value={customizePantryMode}
                      onChange={(e) => setCustomizePantryMode(e.target.value)}
                      className="w-full py-2 px-3 rounded-lg bg-secondary text-color-primary border border-color-light text-xs"
                    >
                      <option value="ignore_pantry">No Constraints</option>
                      <option value="use_pantry_supplement">Pantry + Shopping</option>
                      <option value="use_pantry_only">Pantry Only</option>
                    </select>
                  </div>
                </div>

                {/* Specific Ingredients (Collapsible) */}
                {customizePantryMode !== 'ignore_pantry' && (
                  <div className="mb-4 pb-4 border-b border-color-light">
                    <button
                      onClick={() => setShowPantrySelector(!showPantrySelector)}
                      className="w-full flex items-center justify-between font-semibold text-color-primary mb-2 text-sm"
                    >
                      <span>Specific Ingredients (Optional)</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showPantrySelector ? 'rotate-180' : ''}`} />
                    </button>
                    {showPantrySelector && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                        {pantryItems.length > 0 ? (
                          pantryItems.map(item => (
                            <label
                              key={item.id}
                              className="flex items-center gap-2 p-2 rounded-lg bg-secondary cursor-pointer hover:bg-color-primary hover:bg-opacity-10 transition-all"
                            >
                              <input
                                type="checkbox"
                                checked={specificIngredients.includes(item.name)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSpecificIngredients([...specificIngredients, item.name]);
                                  } else {
                                    setSpecificIngredients(specificIngredients.filter(i => i !== item.name));
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-color-primary text-xs truncate">{item.name}</span>
                            </label>
                          ))
                        ) : (
                          <p className="text-color-muted text-center py-2 col-span-full text-xs">No pantry items</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* AI Refusal Message */}
                {aiRefusal && (
                  <div className="p-4 mb-4 rounded-lg border-l-4" style={{ borderLeftColor: 'var(--color-warning)', backgroundColor: 'var(--color-warning-light)' }}>
                    <div className="flex items-start gap-2">
                      <div className="text-2xl">⚠️</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-color-primary mb-1 text-sm">Unable to Generate</h4>
                        <p className="text-color-secondary text-sm mb-2">{aiRefusal.reason}</p>
                        {aiRefusal.suggestions && aiRefusal.suggestions.length > 0 && (
                          <div>
                            <p className="font-medium text-color-primary mb-1 text-xs">Suggestions:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-color-secondary text-xs">
                              {aiRefusal.suggestions.map((suggestion, index) => (
                                <li key={index}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Generate Button */}
                <button
                  onClick={handleGenerateCustomize}
                  disabled={isGenerating}
                  className="btn-base btn-primary w-full py-3 text-base font-semibold flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Custom Meal
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Saved & Recent Recipes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Saved Recipes */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-color-primary flex items-center gap-2">
                    <ChefHat className="w-5 h-5" />
                    Saved Recipes
                  </h3>
                  <span className="text-sm text-color-muted bg-secondary px-3 py-1 rounded-full">
                    {savedRecipes.length}
                  </span>
                </div>
                {savedRecipes.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      {savedRecipes.slice(0, showAllSavedRecipes ? savedRecipes.length : 5).map(recipe => (
                        <div
                          key={recipe.id}
                          onClick={() => handleViewRecipe(recipe)}
                          className="card card-interactive p-4 hover-lift cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-color-primary truncate">{recipe.title}</h4>
                            <p className="text-sm text-color-muted">
                              {recipe.difficulty} • {recipe.servings} servings
                            </p>
                          </div>
                          <ArrowLeft className="w-4 h-4 text-color-muted transform rotate-180" />
                        </div>
                      ))}
                    </div>
                    {savedRecipes.length > 5 && (
                      <button
                        onClick={() => setShowAllSavedRecipes(!showAllSavedRecipes)}
                        className="btn-base btn-ghost w-full mt-3 py-2 text-sm font-medium flex items-center justify-center gap-2"
                      >
                        {showAllSavedRecipes ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Load More ({savedRecipes.length - 5} more)
                          </>
                        )}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-color-muted text-center py-8">No saved recipes yet</p>
                )}
              </div>

              {/* Recent Recipes */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-color-primary flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Recent
                  </h3>
                  <span className="text-sm text-color-muted bg-secondary px-3 py-1 rounded-full">
                    {recentRecipes.length}
                  </span>
                </div>
                {recentRecipes.length > 0 ? (
                  <div className="space-y-2">
                    {recentRecipes.slice(0, 10).map((recipe, index) => (
                      <div
                        key={index}
                        onClick={() => handleViewRecipe(recipe)}
                        className="card card-interactive p-4 hover-lift cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-color-primary truncate">{recipe.title}</h4>
                          <p className="text-sm text-color-muted">
                            {recipe.difficulty} • {recipe.servings} servings
                          </p>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-color-muted transform rotate-180" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-color-muted text-center py-8">No recent recipes</p>
                )}
              </div>
            </div>

            {/* Legacy Generator Link */}
            <div className="mt-8 text-center">
              <button
                onClick={handleUseLegacy}
                className="btn-base btn-ghost text-color-muted hover:text-color-primary"
              >
                Use Legacy Generator
              </button>
            </div>
          </>
        )}

        {/* Legacy View (Existing UI) - Keep for now */}
        {view === 'legacy' && (
          <>
            {/* Back to Menu Button */}
            <button
              onClick={handleBackToMenu}
              className="btn-base btn-ghost mb-6 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Menu
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <section className="card p-6 space-y-6 lg:col-span-1">
                {/* Pantry Items Panel */}
                <div className="pb-6 mb-6" style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <button 
                    onClick={() => setIsPantryExpanded(!isPantryExpanded)}
                    className="w-full flex items-center justify-between text-left card-interactive transition-colors"
                  >
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>🥫 Pantry Items</h2>
                    <div className={`transition-transform ${isPantryExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--text-secondary)' }}>
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </button>
                  
                  {isPantryExpanded && (
                    <div className="mt-4 space-y-4 animate-fade-in">
                      {/* Search Bar */}
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <input
                          type="text"
                          placeholder="Search pantry items..."
                          value={pantrySearch}
                          onChange={(e) => setPantrySearch(e.target.value)}
                          className="input-base focus-ring text-sm pl-10"
                        />
                      </div>

                      {/* Selected Items Counter */}
                      {selectedPantryItems.length > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-primary-light)' }}>
                          <span className="text-sm" style={{ color: 'var(--color-primary)' }}>
                            {selectedPantryItems.length} item{selectedPantryItems.length !== 1 ? 's' : ''} selected
                          </span>
                          <button
                            onClick={handleUseSelectedItems}
                            className="btn-base btn-primary text-xs px-3 py-1"
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
                              <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                {locationLabels[location]}
                              </h4>
                              {items.map(item => {
                                const isSelected = selectedPantryItems.some(p => p.id === item.id);
                                const remainingDays = item.expiresAt ? calculateRemainingDays(item.expiresAt) : 7;
                                const isExpiringSoon = remainingDays <= 3;
                                
                                return (
                                  <label
                                    key={item.id}
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer card-interactive transition-colors ${
                                      isSelected ? 'border-2' : 'border'
                                    }`}
                                    style={{ 
                                      backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--bg-card)',
                                      borderColor: isSelected ? 'var(--color-primary)' : 'var(--border-light)'
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handlePantryItemToggle(item)}
                                      className="rounded focus-ring"
                                      style={{ 
                                        borderColor: 'var(--border-light)',
                                        color: 'var(--color-primary)'
                                      }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                          {item.name}
                                        </span>
                                        {isExpiringSoon && (
                                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ 
                                            backgroundColor: 'var(--color-error-light)',
                                            color: 'var(--color-error)'
                                          }}>
                                            {remainingDays}d
                                          </span>
                                        )}
                                      </div>
                                      {item.quantity && (
                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.quantity}</span>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                            {pantrySearch ? 'No items match your search' : 'No pantry items found'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Your Ingredients</h2>
                  <div className="flex flex-wrap gap-2 min-h-[44px] p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    {ingredients.length > 0 ? (
                      ingredients.map((ing, i) => <span key={i} className="text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-2 animate-fade-in" style={{ 
                        backgroundColor: 'var(--color-primary-light)',
                        color: 'var(--color-primary)'
                      }}>{ing}<button onClick={() => removeIngredient(i)} className="rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover-lift transition-colors" style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'white'
                      }}>×</button></span>)
                    ) : (<p className="text-sm p-1.5" style={{ color: 'var(--text-muted)' }}>Add some items...</p>)}
                  </div>
                </div>
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
                  <button onClick={handleGenerateRecipe} disabled={isLoading || ingredients.length === 0} className="w-full py-3 btn-base font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-lg" style={{ 
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
                    color: 'white',
                    border: 'none'
                  }}>{isLoading ? <LoadingSpinner /> : '✨'} {isLoading ? 'Generating...' : 'Generate Recipe'}</button>
                </div>
            </section>

            <section className="card p-6 lg:col-span-2">
                {error && <div className="p-4 rounded-lg mb-4" style={{ 
                  backgroundColor: 'var(--color-error-light)', 
                  borderLeft: '4px solid var(--color-error)',
                  color: 'var(--color-error)' 
                }}><p><strong>Error:</strong> {error}</p></div>}
                {isLoading && (
                  <div>
                    <div className="text-center py-6 mb-6" style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <LoadingSpinner />
                      <p className="text-lg mt-4 animate-pulse" style={{ color: 'var(--text-secondary)' }}>
                        {generateMultiple ? 'Creating your recipe options...' : 'Creating your perfect recipe...'}
                      </p>
                    </div>
                    <SkeletonCard />
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
                    
                    <RecipeCard
                      recipe={generatedRecipe}
                      onSave={() => handleSaveRecipe(generatedRecipe)}
                      isSaved={isRecipeSaved}
                      onSchedule={() => handleScheduleRecipe(generatedRecipe)}
                    />
                  </div>
                )}
            </section>

            {/* Saved Recipes (Legacy View) */}
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
          </>
        )}

      {/* Results View */}
      {view === 'results' && (
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <button
            onClick={handleBackToMenu}
            className="btn-base btn-ghost mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Menu
          </button>

          {/* Recipe Display */}
          {generatedRecipe && (
            <div>
              {/* Recipe Navigation for Multiple Recipes */}
              {generatedRecipes.length > 1 && (
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-color-light">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-color-secondary">Recipe Options:</span>
                    <div className="flex gap-1">
                      {generatedRecipes.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => handleRecipeNavigation(index)}
                          className={`w-8 h-8 rounded-full text-sm font-semibold transition-all ${
                            index === currentRecipeIndex
                              ? 'bg-color-primary text-white'
                              : 'bg-secondary text-color-secondary hover:bg-color-primary hover:bg-opacity-10'
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

              {/* Recipe Card */}
              <RecipeCard
                recipe={generatedRecipe}
                onSave={() => handleSaveRecipe(generatedRecipe)}
                isSaved={isRecipeSaved}
                onSchedule={() => handleScheduleRecipe(generatedRecipe)}
              />

              {/* Feedback/Regeneration Section */}
              <div className="card p-6 mt-6 border-l-4" style={{ borderLeftColor: 'var(--color-accent)' }}>
                <h3 className="text-lg font-bold text-color-primary mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Want to Adjust This Recipe?
                </h3>
                <p className="text-sm text-color-secondary mb-4">
                  Provide feedback and I'll regenerate the recipe to match your preferences
                </p>
                <div className="space-y-3">
                  <textarea
                    value={recipeFeedback}
                    onChange={(e) => setRecipeFeedback(e.target.value)}
                    placeholder="E.g., 'Change to beef instead of chicken' or 'Make it spicier' or 'Use less cooking time'"
                    className="w-full p-3 rounded-lg bg-secondary text-color-primary border border-color-light focus:border-color-primary outline-none resize-none text-sm"
                    rows={2}
                    disabled={isRegenerating}
                  />
                  <button
                    onClick={handleRegenerateWithFeedback}
                    disabled={isRegenerating || !recipeFeedback.trim()}
                    className="btn-base btn-primary px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRegenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Regenerate Recipe
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recipe Selector for scheduling */}
      {recipeToSchedule && (
        <RecipeSelector
          isOpen={showRecipeSelector}
          onClose={() => {
            setShowRecipeSelector(false);
            setRecipeToSchedule(null);
          }}
          onSchedule={handleRecipeScheduled}
          recipeToSchedule={recipeToSchedule}
          getAuthHeaders={getAuthHeaders}
          activeHomeId={activeHomeId}
          pantryItems={pantryItems}
        />
      )}

      {/* Recipe Scheduling Modal for direct scheduling */}
      {recipeToDirectSchedule && (
        <RecipeSchedulingModal
          isOpen={showRecipeSchedulingModal}
          onClose={() => {
            setShowRecipeSchedulingModal(false);
            setRecipeToDirectSchedule(null);
          }}
          onSchedule={handleDirectRecipeScheduled}
          recipe={recipeToDirectSchedule}
          getAuthHeaders={getAuthHeaders}
          activeHomeId={activeHomeId}
        />
      )}
    </div>
    </div>
  );
}
