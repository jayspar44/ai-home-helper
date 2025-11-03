import React, { useState, useCallback, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { Calendar, ChevronDown, ChevronUp, Sparkles, ArrowLeft } from 'lucide-react';
import { calculateRemainingDays } from '../utils/dateUtils';
import RecipeSelector from '../components/RecipeSelector';
import RecipeSchedulingModal from '../components/RecipeSchedulingModal';
import NumberControl from '../components/recipe/NumberControl';
import SettingsSummary from '../components/recipe/SettingsSummary';
import EmptyPantryBanner from '../components/recipe/EmptyPantryBanner';
import RecipeListItem from '../components/recipe/RecipeListItem';
import logger from '../utils/logger';
import { useToast } from '../contexts/ToastContext';

// Constants
const MAX_FEEDBACK_LENGTH = 100; // Must match backend constant in recipeAI.js
const MAX_PROMPT_LENGTH = 250; // Must match backend MAX_AI_PROMPT_LENGTH

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

function RecipeCard({ recipe, onSave, onUnsave, isSaved, onSchedule }) {
  if (!recipe) return null;

  // Check if this was generated with no_constraints mode (hide pantry section)
  const showPantrySection = recipe.generationParams?.pantryMode !== 'no_constraints';

  return (
    <div className="space-y-6 animate-fade-in relative">
       <button
         onClick={isSaved ? onUnsave : onSave}
         className="btn-base px-4 py-2 absolute top-0 right-0 shadow-md transition-all flex items-center gap-2"
         style={{
           backgroundColor: isSaved ? 'var(--bg-tertiary)' : 'var(--color-primary)',
           color: isSaved ? 'var(--text-primary)' : 'white'
         }}
       >
         💾 {isSaved ? 'Unsave' : 'Save'}
       </button>
      <div>
        <h2 className="text-2xl font-bold mb-2 pr-32" style={{ color: 'var(--text-primary)' }}>{recipe.title}</h2>
        <p className="mb-4 pr-32" style={{ color: 'var(--text-secondary)' }}>{recipe.description}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm py-3" style={{
          color: 'var(--text-secondary)' ,
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
          {process.env.NODE_ENV === 'development' && recipe.qualityScore && (
            <span className="px-2 py-1 rounded text-xs font-mono" style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-light)'
            }}>
              Q: {recipe.qualityScore}
            </span>
          )}
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
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Chef's Tips</h3>
          <ul className="space-y-2">{recipe.tips && recipe.tips.map((tip, i) => <li key={i} className="flex items-start gap-3 text-sm"><span className="mt-1" style={{ color: 'var(--color-primary)' }}>💡</span><span style={{ color: 'var(--text-secondary)' }}>{tip}</span></li>)}</ul>
        </div>
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Instructions</h3>
        <ol className="space-y-4">{recipe.instructions.map((step, i) => <li key={i} className="flex gap-4"><span className="flex-shrink-0 w-7 h-7 text-white rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: 'var(--color-primary)' }}>{i + 1}</span><span className="pt-0.5" style={{ color: 'var(--text-secondary)' }}>{step}</span></li>)}</ol>
      </div>

      {/* Pantry Items Used Section - only show if not no_constraints */}
      {showPantrySection && recipe.pantryItemsUsed && recipe.pantryItemsUsed.length > 0 && (
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
                    {item.daysUntilExpiry !== null && item.daysUntilExpiry <= 7 && (
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

      {/* Schedule Recipe Button */}
      {onSchedule && (
        <div className="flex justify-center">
          <button
            onClick={onSchedule}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors hover:bg-opacity-90"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            <Calendar className="w-4 h-4" />
            Schedule Meal
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
  const { showToast } = useToast();

  // View state management
  const [view, setView] = useState('menu'); // 'menu' | 'results'

  // UNIFIED STATE - Consolidation of previous Roscoe's + Customize states
  const [numberOfMeals, setNumberOfMeals] = useState(1); // Default 1, range 1-5
  const [pantryMode, setPantryMode] = useState('pantry_plus_shopping'); // 'pantry_only' | 'pantry_plus_shopping' | 'no_constraints'
  const [quickMealsOnly, setQuickMealsOnly] = useState(false);
  const [prioritizeExpiring, setPrioritizeExpiring] = useState(true); // Default true
  const [servingSize, setServingSize] = useState(2); // Default 2, range 1-10

  // Level 2 state
  const [mainPrompt, setMainPrompt] = useState(''); // Renamed from aiPrompt

  // Level 3 state
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [selectedProteins, setSelectedProteins] = useState([]);
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [specificIngredients, setSpecificIngredients] = useState([]);

  // Progressive disclosure state
  const [showMoreOptions, setShowMoreOptions] = useState(false); // Level 2
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false); // Level 3

  // Empty pantry state
  const [showEmptyPantryBanner, setShowEmptyPantryBanner] = useState(false);

  // Recipe state
  const [generatedRecipe, setGeneratedRecipe] = useState(null);
  const [generatedRecipes, setGeneratedRecipes] = useState([]); // For multiple meals
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [recentRecipes, setRecentRecipes] = useState(() => {
    try {
      const stored = localStorage.getItem('recentRecipes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);

  // Loading and error states
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [aiRefusal, setAiRefusal] = useState(null);

  // Pantry state
  const [pantryItems, setPantryItems] = useState([]);
  const [isLoadingPantry, setIsLoadingPantry] = useState(true); // Start as true to prevent premature auto-switch
  const [pantryHasLoaded, setPantryHasLoaded] = useState(false); // Track if pantry has loaded at least once

  // Recipe scheduling state
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [recipeToSchedule, setRecipeToSchedule] = useState(null);
  const [showRecipeSchedulingModal, setShowRecipeSchedulingModal] = useState(false);
  const [recipeToDirectSchedule, setRecipeToDirectSchedule] = useState(null);

  // Feedback/Regeneration state
  const [recipeFeedback, setRecipeFeedback] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationMessage, setRegenerationMessage] = useState('');

  // Saved recipes display state
  const [showAllSavedRecipes, setShowAllSavedRecipes] = useState(false);

  // Unsave confirmation modal state
  const [showUnsaveConfirm, setShowUnsaveConfirm] = useState(false);
  const [recipeToUnsave, setRecipeToUnsave] = useState(null);

  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`,
  }), [userToken]);

  // Save recent recipes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('recentRecipes', JSON.stringify(recentRecipes));
    } catch (err) {
      logger.error('Failed to save recent recipes:', err);
    }
  }, [recentRecipes]);

  // Fetch pantry items on mount
  useEffect(() => {
    if (activeHomeId && userToken) {
      fetchPantryItems();
      fetchSavedRecipes();
    }
  }, [activeHomeId, userToken]);

  // Check for empty pantry and auto-switch to no_constraints
  // IMPORTANT: Only run after pantry has finished loading for the first time
  useEffect(() => {
    if (pantryHasLoaded && !isLoadingPantry && pantryItems.length === 0 && pantryMode !== 'no_constraints') {
      setPantryMode('no_constraints');
      setShowEmptyPantryBanner(true);
    }
  }, [pantryItems, pantryMode, isLoadingPantry, pantryHasLoaded]);

  const fetchPantryItems = async () => {
    setIsLoadingPantry(true);
    try {
      const response = await fetch(`/api/pantry/${activeHomeId}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch pantry');
      const data = await response.json();
      setPantryItems(data);
    } catch (error) {
      logger.error('Error fetching pantry:', error);
    } finally {
      setIsLoadingPantry(false);
      setPantryHasLoaded(true); // Mark that pantry has loaded at least once
    }
  };

  const fetchSavedRecipes = async () => {
    try {
      const response = await fetch('/api/recipes/list', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ homeId: activeHomeId })
      });
      if (!response.ok) throw new Error('Failed to fetch saved recipes');
      const { recipes } = await response.json();
      // Sort by most recent first (createdAt or savedAt descending)
      const sortedRecipes = (recipes || []).sort((a, b) => {
        const dateA = a.savedAt || a.createdAt || 0;
        const dateB = b.savedAt || b.createdAt || 0;
        return new Date(dateB) - new Date(dateA);
      });
      setSavedRecipes(sortedRecipes);
    } catch (error) {
      logger.error('Error fetching saved recipes:', error);
    }
  };

  const handleGenerateRecipes = async () => {
    setIsGenerating(true);
    setError('');
    setAiRefusal(null);

    try {
      // Validate mainPrompt length
      if (mainPrompt && mainPrompt.length > MAX_PROMPT_LENGTH) {
        throw new Error(`Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`);
      }

      const requestBody = {
        homeId: activeHomeId,
        numberOfMeals,
        quickMealsOnly,
        pantryMode,
        prioritizeExpiring,
        mainPrompt: mainPrompt || '',
        cuisines: selectedCuisines,
        proteins: selectedProteins,
        preferences: selectedPreferences,
        servingSize,
        specificIngredients: specificIngredients.length > 0 ? specificIngredients : undefined
      };

      logger.debug('Generating unified recipes with:', requestBody);

      const response = await fetch('/api/generate-recipe/unified', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      // Handle AI refusal
      if (!response.ok) {
        if (response.status === 400 && data.reason) {
          setAiRefusal({
            reason: data.reason,
            suggestions: data.suggestions || []
          });
          return;
        }
        throw new Error(data.error || 'Failed to generate recipes');
      }

      // Handle response (always array from unified endpoint)
      const recipes = Array.isArray(data) ? data : [data];

      setGeneratedRecipes(recipes);
      setGeneratedRecipe(recipes[0]);
      setCurrentRecipeIndex(0);
      setView('results');

      // Add to recent recipes (max 10)
      setRecentRecipes(prev => {
        const updated = [recipes[0], ...prev.filter(r => r.title !== recipes[0].title)];
        return updated.slice(0, 10);
      });

      logger.info(`Generated ${recipes.length} meal(s) successfully`);
    } catch (error) {
      logger.error('Error generating recipes:', error);
      setError(error.message || 'Failed to generate meals. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!generatedRecipe) return;

    try {
      const response = await fetch('/api/recipes/save', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          homeId: activeHomeId,
          recipe: generatedRecipe
        })
      });

      if (!response.ok) throw new Error('Failed to save recipe');

      const savedRecipe = await response.json();
      setSavedRecipes(prev => [savedRecipe, ...prev]);
      logger.info('Recipe saved successfully');
    } catch (error) {
      logger.error('Error saving recipe:', error);
      setError('Failed to save recipe');
    }
  };

  const handleUnsaveRecipe = async () => {
    if (!generatedRecipe || !isRecipeSaved) return;

    // Find the saved recipe ID
    const savedRecipe = savedRecipes.find(r => r.title === generatedRecipe.title);
    if (!savedRecipe) return;

    // Store recipe to unsave and show confirmation modal
    setRecipeToUnsave(savedRecipe);
    setShowUnsaveConfirm(true);
  };

  const confirmUnsaveRecipe = async () => {
    if (!recipeToUnsave) return;

    try {
      const response = await fetch(`/api/recipes/${recipeToUnsave.id}?homeId=${activeHomeId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to unsave recipe');

      // Remove from saved recipes list
      setSavedRecipes(prev => prev.filter(r => r.id !== recipeToUnsave.id));
      logger.info('Recipe unsaved successfully');
    } catch (error) {
      logger.error('Error unsaving recipe:', error);
      setError('Failed to unsave recipe');
    } finally {
      setShowUnsaveConfirm(false);
      setRecipeToUnsave(null);
    }
  };

  const handleRegenerateRecipe = async () => {
    if (!generatedRecipe || !recipeFeedback.trim()) return;

    setIsRegenerating(true);
    setError('');
    setRegenerationMessage(''); // Clear previous message

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

      if (!response.ok) throw new Error('Failed to regenerate recipe');

      const regeneratedRecipe = await response.json();
      setGeneratedRecipe(regeneratedRecipe);
      setRegenerationMessage(regeneratedRecipe.message || 'Recipe updated successfully!'); // Store AI message
      setRecipeFeedback(''); // Clear feedback after successful regeneration
      logger.info('Recipe regenerated successfully');
    } catch (error) {
      logger.error('Error regenerating recipe:', error);
      setError('Failed to regenerate recipe. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleScheduleRecipe = (recipe) => {
    setRecipeToDirectSchedule(recipe || generatedRecipe);
    setShowRecipeSchedulingModal(true);
  };

  const handleBack = () => {
    setView('menu');
    setError('');
    setAiRefusal(null);
  };

  const handleResetSettings = () => {
    // Smart pantry mode reset based on current pantry state
    const targetPantryMode = pantryItems.length === 0 ? 'no_constraints' : 'pantry_plus_shopping';
    const targetPrioritizeExpiring = pantryItems.length === 0 ? false : true;

    // Reset all user settings to defaults
    setNumberOfMeals(1);
    setPantryMode(targetPantryMode);
    setQuickMealsOnly(false);
    setPrioritizeExpiring(targetPrioritizeExpiring);
    setServingSize(2);
    setMainPrompt('');
    setSelectedCuisines([]);
    setSelectedProteins([]);
    setSelectedPreferences([]);
    setSpecificIngredients([]);

    // Clear feedback states
    setAiRefusal(null);
    setError('');
    setRegenerationMessage('');

    // Show success toast
    showToast('Settings reset to defaults', 'success');

    logger.info('Recipe settings reset to defaults');
  };

  const handleNavigateRecipe = (index) => {
    setCurrentRecipeIndex(index);
    setGeneratedRecipe(generatedRecipes[index]);
  };

  const isRecipeSaved = generatedRecipe && savedRecipes.some(r => r.title === generatedRecipe.title);

  // Cuisines and Proteins options
  const cuisineOptions = ['Italian', 'Mexican', 'Asian', 'Indian', 'Mediterranean', 'American', 'French', 'Thai'];
  const proteinOptions = ['Chicken', 'Beef', 'Pork', 'Fish', 'Shrimp', 'Tofu', 'Beans', 'Eggs'];
  const preferenceOptions = ['Quick', 'Healthy', 'Comfort', 'Easy'];

  // Toggle selection helpers
  const toggleSelection = (item, selectedArray, setSelectedArray) => {
    if (selectedArray.includes(item)) {
      setSelectedArray(selectedArray.filter(i => i !== item));
    } else {
      setSelectedArray([...selectedArray, item]);
    }
  };

  // Handle missing context gracefully
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
            {view === 'menu' ? 'What would you like to cook today?' : 'Your AI-generated meals'}
          </p>
        </div>

        {/* Menu View */}
        {view === 'menu' && (
          <div className="max-w-3xl mx-auto">
            {/* Empty Pantry Banner */}
            {showEmptyPantryBanner && pantryItems.length === 0 && (
              <EmptyPantryBanner onDismiss={() => setShowEmptyPantryBanner(false)} />
            )}

            {/* Main Card */}
            <div className="card relative overflow-hidden mb-6">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: 'var(--color-primary)' }}></div>

              <div className="p-6">
                {/* Heading */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Sparkles className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
                    Ask Roscoe
                  </h2>
                  <p className="text-color-secondary text-sm">
                    Let Roscoe analyze your pantry and create smart, personalized meals for you
                  </p>
                </div>

                {/* Level 1: Generate Button + Settings Summary */}
                <div className="space-y-4 mb-6">
                  <button
                    onClick={handleGenerateRecipes}
                    disabled={isGenerating}
                    className="btn-base btn-primary w-full py-3 font-semibold flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <LoadingSpinner />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Yes, chef!
                      </>
                    )}
                  </button>

                  <SettingsSummary
                    pantryMode={pantryMode}
                    prioritizeExpiring={prioritizeExpiring}
                    quickMealsOnly={quickMealsOnly}
                    numberOfMeals={numberOfMeals}
                    servingSize={servingSize}
                    cuisines={selectedCuisines}
                    proteins={selectedProteins}
                    preferences={selectedPreferences}
                  />

                  {/* AI Refusal Message */}
                  {aiRefusal && (
                    <div className="mt-4 p-4 rounded-lg border-l-4" style={{ borderLeftColor: 'var(--color-warning)', backgroundColor: 'var(--color-warning-light)' }}>
                      <div className="flex items-start gap-2">
                        <div className="text-2xl">⚠️</div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-color-primary mb-1 text-sm">Unable to Generate</h4>
                          <p className="text-color-secondary text-sm mb-2">{aiRefusal.reason}</p>
                          {aiRefusal.suggestions && aiRefusal.suggestions.length > 0 && (
                            <div>
                              <p className="font-medium text-color-primary mb-1 text-xs">Suggestions:</p>
                              <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                                {aiRefusal.suggestions.map((suggestion, i) => (
                                  <li key={i}>• {suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Number of meals control + Show more options link */}
                <div className="flex items-center justify-between mb-4">
                  <NumberControl
                    value={numberOfMeals}
                    min={1}
                    max={5}
                    label={numberOfMeals === 1 ? 'meal' : 'meals'}
                    onChange={setNumberOfMeals}
                  />

                  <button
                    onClick={() => setShowMoreOptions(!showMoreOptions)}
                    className="text-sm font-medium flex items-center gap-1 transition-colors"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {showMoreOptions ? 'Hide options' : 'Show more options'}
                    {showMoreOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Level 2: Expandable Options */}
                {showMoreOptions && (
                  <div className="mt-6 pt-6 border-t border-color-light animate-fade-in space-y-4">
                    {/* Quick Meals Toggle Button */}
                    <div>
                      <label className="block text-sm font-semibold text-color-primary mb-2">
                        Meal Constraints
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setQuickMealsOnly(!quickMealsOnly)}
                          className={`py-2 px-4 rounded-lg font-medium transition-all text-sm ${
                            quickMealsOnly
                              ? 'bg-color-primary text-white'
                              : 'bg-secondary text-color-secondary'
                          }`}
                        >
                          ⚡ Quick meals (≤30 min)
                        </button>
                        <button
                          onClick={() => {
                            if (pantryMode !== 'no_constraints') {
                              setPrioritizeExpiring(!prioritizeExpiring);
                            }
                          }}
                          disabled={pantryMode === 'no_constraints'}
                          className={`py-2 px-4 rounded-lg font-medium transition-all text-sm ${
                            prioritizeExpiring && pantryMode !== 'no_constraints'
                              ? 'bg-color-primary text-white'
                              : 'bg-secondary text-color-secondary'
                          } ${pantryMode === 'no_constraints' ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          🥫 Use expiring items first (≤7 days)
                        </button>
                      </div>
                    </div>

                    {/* Pantry Mode */}
                    <div>
                      <label className="block text-sm font-semibold text-color-primary mb-2">
                        Pantry Mode
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => setPantryMode('pantry_only')}
                          className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${
                            pantryMode === 'pantry_only'
                              ? 'bg-color-primary text-white'
                              : 'bg-secondary text-color-secondary'
                          }`}
                        >
                          🥘 Pantry Only
                        </button>
                        <button
                          onClick={() => setPantryMode('pantry_plus_shopping')}
                          className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${
                            pantryMode === 'pantry_plus_shopping'
                              ? 'bg-color-primary text-white'
                              : 'bg-secondary text-color-secondary'
                          }`}
                        >
                          🛒 Pantry + Shopping
                        </button>
                        <button
                          onClick={() => {
                            setPantryMode('no_constraints');
                            setPrioritizeExpiring(false); // Auto-uncheck when switching to no_constraints
                          }}
                          className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${
                            pantryMode === 'no_constraints'
                              ? 'bg-color-primary text-white'
                              : 'bg-secondary text-color-secondary'
                          }`}
                        >
                          🌍 No Constraints
                        </button>
                      </div>
                    </div>

                    {/* Main Prompt */}
                    <div>
                      <label className="block text-sm font-semibold text-color-primary mb-2">
                        What would you like to cook today?
                      </label>
                      <textarea
                        value={mainPrompt}
                        onChange={(e) => setMainPrompt(e.target.value)}
                        placeholder="e.g., Something spicy with coconut milk, or leave blank for Roscoe's choice"
                        className="w-full p-3 rounded-lg border text-sm"
                        style={{
                          borderColor: 'var(--border-medium)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          minHeight: '80px'
                        }}
                        maxLength={MAX_PROMPT_LENGTH}
                      />
                      <div className="text-xs text-color-muted text-right mt-1">
                        {mainPrompt.length}/{MAX_PROMPT_LENGTH}
                      </div>
                    </div>

                    {/* Reset Settings + Show advanced options */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={handleResetSettings}
                        className="btn-base btn-ghost px-4 py-2 text-sm flex items-center gap-2"
                        aria-label="Reset all settings to defaults"
                      >
                        ↺ Reset all settings
                      </button>
                      <button
                        onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        className="text-sm font-medium flex items-center gap-1 transition-colors"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        {showAdvancedOptions ? 'Hide advanced options' : 'Show even more options'}
                        {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Level 3: Advanced Options */}
                {showMoreOptions && showAdvancedOptions && (
                  <div className="mt-6 pt-6 border-t border-color-light animate-fade-in space-y-6">
                    {/* Preferences */}
                    <div>
                      <label className="block text-sm font-semibold text-color-primary mb-2">
                        Preferences
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {preferenceOptions.map(pref => (
                          <button
                            key={pref}
                            onClick={() => toggleSelection(pref, selectedPreferences, setSelectedPreferences)}
                            className={`py-2 px-4 rounded-lg font-medium transition-all text-sm ${
                              selectedPreferences.includes(pref)
                                ? 'bg-color-primary text-white'
                                : 'bg-secondary text-color-secondary'
                            }`}
                          >
                            {pref}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cuisines */}
                    <div>
                      <label className="block text-sm font-semibold text-color-primary mb-2">
                        Cuisines
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {cuisineOptions.map(cuisine => (
                          <button
                            key={cuisine}
                            onClick={() => toggleSelection(cuisine, selectedCuisines, setSelectedCuisines)}
                            className={`py-2 px-3 rounded-lg font-medium transition-all text-sm ${
                              selectedCuisines.includes(cuisine)
                                ? 'bg-color-primary text-white'
                                : 'bg-secondary text-color-secondary'
                            }`}
                          >
                            {cuisine}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Proteins */}
                    <div>
                      <label className="block text-sm font-semibold text-color-primary mb-2">
                        Proteins
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {proteinOptions.map(protein => (
                          <button
                            key={protein}
                            onClick={() => toggleSelection(protein, selectedProteins, setSelectedProteins)}
                            className={`py-2 px-3 rounded-lg font-medium transition-all text-sm ${
                              selectedProteins.includes(protein)
                                ? 'bg-color-primary text-white'
                                : 'bg-secondary text-color-secondary'
                            }`}
                          >
                            {protein}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Servings */}
                    <div>
                      <label className="block text-sm font-semibold text-color-primary mb-2">
                        Servings
                      </label>
                      <div className="flex justify-center">
                        <NumberControl
                          value={servingSize}
                          min={1}
                          max={10}
                          label={servingSize === 1 ? 'serving' : 'servings'}
                          onChange={setServingSize}
                        />
                      </div>
                    </div>

                    {/* Pantry Integration - hide if no_constraints */}
                    {pantryMode !== 'no_constraints' && pantryItems.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-color-primary mb-2">
                          Pantry Integration (Optional)
                        </label>
                        <details className="border border-color-medium rounded-lg p-3">
                          <summary className="cursor-pointer text-sm text-color-secondary">
                            Select specific ingredients to use ({specificIngredients.length} selected)
                          </summary>
                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                            {pantryItems.map(item => (
                              <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={specificIngredients.includes(item.name)}
                                  onChange={() => toggleSelection(item.name, specificIngredients, setSpecificIngredients)}
                                  className="w-4 h-4"
                                />
                                <span className="text-color-primary">{item.name}</span>
                              </label>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)' }}>
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Saved & Recent Recipes - Two Column Layout */}
            {((savedRecipes && savedRecipes.length > 0) || (recentRecipes && recentRecipes.length > 0)) && (
              <div className="mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Saved Recipes - Left Column */}
                  {savedRecipes && savedRecipes.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-color-primary">
                          💾 Saved Recipes ({savedRecipes.length})
                        </h3>
                        {savedRecipes.length > 6 && (
                          <button
                            onClick={() => setShowAllSavedRecipes(!showAllSavedRecipes)}
                            className="text-sm font-medium"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            {showAllSavedRecipes ? 'Show less' : 'Show all'}
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {(showAllSavedRecipes ? savedRecipes : savedRecipes.slice(0, 6)).map((recipe, index) => (
                          <RecipeListItem
                            key={recipe.id || index}
                            recipe={recipe}
                            onClick={(r) => {
                              setGeneratedRecipe(r);
                              setView('results');
                            }}
                            borderColor="var(--color-primary-dark)"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Recipes - Right Column */}
                  {recentRecipes && recentRecipes.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-color-primary mb-4">
                        🕐 Recent Recipes
                      </h3>
                      <div className="space-y-2">
                        {recentRecipes.slice(0, 6).map((recipe, index) => (
                          <RecipeListItem
                            key={index}
                            recipe={recipe}
                            onClick={(r) => {
                              setGeneratedRecipe(r);
                              setView('results');
                            }}
                            borderColor="var(--color-primary-dark)"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results View */}
        {view === 'results' && (
          <div className="max-w-4xl mx-auto">
            <button
              onClick={handleBack}
              className="btn-base btn-ghost mb-6 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Generator
            </button>

            {/* Multiple Recipe Navigation */}
            {generatedRecipes.length > 1 && (
              <div className="flex justify-center gap-2 mb-6">
                {generatedRecipes.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleNavigateRecipe(index)}
                    className={`w-10 h-10 rounded-full font-semibold transition-all ${
                      currentRecipeIndex === index
                        ? 'bg-color-primary text-white'
                        : 'bg-secondary text-color-secondary'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Recipe Card */}
            {isGenerating ? (
              <div className="card">
                <SkeletonCard />
              </div>
            ) : (
              <div className="card p-6 pt-2">
                <RecipeCard
                  recipe={generatedRecipe}
                  onSave={handleSaveRecipe}
                  onUnsave={handleUnsaveRecipe}
                  isSaved={isRecipeSaved}
                  onSchedule={handleScheduleRecipe}
                />
              </div>
            )}

            {/* Feedback Section */}
            {generatedRecipe && !isGenerating && (
              <div className="card p-6 mt-6">
                <h3 className="text-lg font-semibold mb-3 text-color-primary">
                  Want to change something? Ask Roscoe...
                </h3>

                {/* Regeneration message from AI */}
                {regenerationMessage && (
                  <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderLeft: '3px solid var(--color-primary)'
                  }}>
                    <span className="text-xl">👨‍🍳</span>
                    <div className="flex-1">
                      <p className="text-sm text-color-primary font-medium">Roscoe says:</p>
                      <p className="text-sm text-color-secondary mt-1">{regenerationMessage}</p>
                    </div>
                  </div>
                )}

                <textarea
                  value={recipeFeedback}
                  onChange={(e) => setRecipeFeedback(e.target.value)}
                  placeholder="e.g., Make it spicier, use a different protein..."
                  disabled={isRegenerating}
                  className="w-full p-3 rounded-lg border mb-3"
                  style={{
                    borderColor: 'var(--border-medium)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    minHeight: '80px',
                    opacity: isRegenerating ? 0.5 : 1,
                    cursor: isRegenerating ? 'not-allowed' : 'text'
                  }}
                  maxLength={MAX_FEEDBACK_LENGTH}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-color-muted">
                    {recipeFeedback.length}/{MAX_FEEDBACK_LENGTH}
                  </span>
                  <button
                    onClick={handleRegenerateRecipe}
                    disabled={!recipeFeedback.trim() || isRegenerating}
                    className="btn-base btn-primary px-4 py-2"
                    style={{
                      opacity: (!recipeFeedback.trim() || isRegenerating) ? 0.5 : 1,
                      cursor: (!recipeFeedback.trim() || isRegenerating) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isRegenerating ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recipe Scheduling Modals */}
      {showRecipeSelector && (
        <RecipeSelector
          onClose={() => setShowRecipeSelector(false)}
          onSelectRecipe={(recipe) => {
            setRecipeToSchedule(recipe);
            setShowRecipeSelector(false);
            setShowRecipeSchedulingModal(true);
          }}
          savedRecipes={savedRecipes}
          recentRecipes={recentRecipes}
        />
      )}

      {showRecipeSchedulingModal && recipeToDirectSchedule && (
        <RecipeSchedulingModal
          recipe={recipeToDirectSchedule}
          onClose={() => {
            setShowRecipeSchedulingModal(false);
            setRecipeToDirectSchedule(null);
          }}
          activeHomeId={activeHomeId}
          userToken={userToken}
        />
      )}

      {/* Unsave Confirmation Modal */}
      {showUnsaveConfirm && recipeToUnsave && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowUnsaveConfirm(false);
            setRecipeToUnsave(null);
          }}
        >
          <div
            className="bg-card rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-color-primary mb-2">
                  Unsave Recipe?
                </h3>
                <p className="text-sm text-color-secondary">
                  Are you sure you want to unsave "<strong>{recipeToUnsave.title}</strong>"? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowUnsaveConfirm(false);
                  setRecipeToUnsave(null);
                }}
                className="btn-base btn-ghost px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnsaveRecipe}
                className="btn-base px-4 py-2"
                style={{
                  backgroundColor: 'var(--color-error)',
                  color: 'white'
                }}
              >
                Unsave Recipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
