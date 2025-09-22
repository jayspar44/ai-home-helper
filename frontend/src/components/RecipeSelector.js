import React, { useState, useEffect, useCallback } from 'react';
import PlannerRecipeCard from './PlannerRecipeCard';

// Icons
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

export default function RecipeSelector({
  isOpen,
  onClose,
  onSchedule,
  onRecipeSelected,
  selectedDate,
  selectedMealType,
  getAuthHeaders,
  activeHomeId,
  pantryItems = [],
  mode
}) {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [schedulingDate, setSchedulingDate] = useState('');
  const [schedulingMealType, setSchedulingMealType] = useState('breakfast');
  const [servings, setServings] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const mealTypes = [
    { value: 'breakfast', label: 'Breakfast', icon: '🍳' },
    { value: 'lunch', label: 'Lunch', icon: '🥗' },
    { value: 'dinner', label: 'Dinner', icon: '🍽️' },
    { value: 'snacks', label: 'Snacks', icon: '🍿' }
  ];

  const fetchSavedRecipes = useCallback(async () => {
    console.log('🔍 fetchSavedRecipes called', { getAuthHeaders: !!getAuthHeaders, activeHomeId });

    if (!getAuthHeaders || !activeHomeId) {
      console.log('❌ fetchSavedRecipes aborted - missing dependencies', { getAuthHeaders: !!getAuthHeaders, activeHomeId });
      return;
    }

    console.log('📡 Starting API call to /api/recipes/list');
    setIsLoading(true);
    try {
      const response = await fetch(`/api/recipes/list`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ homeId: activeHomeId })
      });

      console.log('📡 API response received', { status: response.status, ok: response.ok });

      if (response.ok) {
        const data = await response.json();
        console.log('📦 API response data:', data);
        console.log('🔢 Recipes array:', data.recipes);
        console.log('📊 Recipes count:', data.recipes?.length || 0);

        const recipesList = data.recipes || [];
        console.log('💾 Setting recipes state to:', recipesList);
        setRecipes(recipesList);
        setError('');

        console.log('✅ Successfully set recipes state');
      } else {
        console.error('❌ API response not ok:', response.status);
        setError('Failed to load recipes');
        setRecipes([]);
      }
    } catch (err) {
      console.error('❌ Error fetching recipes:', err);
      setError('Failed to load recipes');
      setRecipes([]);
    } finally {
      console.log('🏁 fetchSavedRecipes finished, setting loading to false');
      setIsLoading(false);
    }
  }, [getAuthHeaders, activeHomeId]);

  // Initialize form when modal opens
  useEffect(() => {
    console.log('🎪 Modal useEffect triggered', { isOpen });
    if (isOpen) {
      console.log('🎪 Modal opened - initializing form');
      const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      setSchedulingDate(
        selectedDate
          ? (typeof selectedDate === 'string' ? selectedDate : formatDateForInput(selectedDate))
          : formatDateForInput(new Date())
      );
      setSchedulingMealType(selectedMealType || 'breakfast');
      setSelectedRecipe(null);
      setServings('');
      setSearchQuery('');
      setError('');
      console.log('🎪 About to call fetchSavedRecipes');
      fetchSavedRecipes();
    }
  }, [isOpen, selectedDate, selectedMealType, fetchSavedRecipes]);

  // Filter recipes based on search query
  useEffect(() => {
    console.log('🔍 Filter useEffect triggered', { recipesCount: recipes.length, searchQuery });
    if (!searchQuery.trim()) {
      console.log('🔍 No search query - setting all recipes as filtered', { recipesCount: recipes.length });
      setFilteredRecipes(recipes);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = recipes.filter(recipe =>
        recipe.name?.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query) ||
        recipe.ingredients?.some(ing =>
          (typeof ing === 'string' ? ing : ing.name || ing.ingredient || '')
            .toLowerCase().includes(query)
        )
      );
      console.log('🔍 Filtered recipes', { query, originalCount: recipes.length, filteredCount: filtered.length });
      setFilteredRecipes(filtered);
    }
  }, [searchQuery, recipes]);

  // Debug recipes state changes
  useEffect(() => {
    console.log('📊 Recipes state changed:', { recipesCount: recipes.length, recipes });
  }, [recipes]);

  // Debug filteredRecipes state changes
  useEffect(() => {
    console.log('📋 FilteredRecipes state changed:', { filteredCount: filteredRecipes.length, filteredRecipes });
  }, [filteredRecipes]);

  const handleRecipeSelect = (recipe) => {
    if (mode === 'select-only' && onRecipeSelected) {
      // Just select the recipe and call the callback
      onRecipeSelected(recipe);
      return;
    }

    // Default behavior: prepare for scheduling
    setSelectedRecipe(recipe);
    setServings(recipe.servings ? String(recipe.servings) : '');
  };

  const handleScheduleRecipe = async () => {
    if (!selectedRecipe) return;

    setIsScheduling(true);
    setError('');

    try {
      // Ensure recipe name is prioritized correctly
      const recipeName = selectedRecipe.title || selectedRecipe.name || 'Recipe';

      const plannedData = {
        recipeId: selectedRecipe.id,
        recipeName: recipeName, // Use the prioritized recipe name
        ingredients: selectedRecipe.ingredients || [],
        servings: parseInt(servings) || selectedRecipe.servings || 4,
        cookingTime: selectedRecipe.cookingTime || selectedRecipe.cookTime || selectedRecipe.time,
        description: selectedRecipe.description
      };

      console.log('📝 Planned data being sent:', plannedData);

      const mealPlan = {
        date: schedulingDate, // Date-only format, no timezone conversion
        mealType: schedulingMealType,
        planned: plannedData
      };

      console.log('📅 Scheduling recipe:', { mealPlan, selectedRecipe });

      const response = await fetch(`/api/planner/${activeHomeId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(mealPlan)
      });

      console.log('📅 Response status:', response.status, response.statusText);

      if (response.ok) {
        const newMealPlan = await response.json();
        console.log('✅ Recipe scheduled successfully:', newMealPlan);
        onSchedule(newMealPlan);
        onClose();
      } else {
        let errorMessage = 'Failed to schedule recipe';
        try {
          const errorData = await response.json();
          console.error('❌ Failed to schedule recipe - Error Data:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          console.error('❌ Response text:', await response.text());
        }
        setError(errorMessage);
      }
    } catch (err) {
      console.error('❌ Error scheduling recipe:', err);
      setError('Failed to schedule recipe. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl bg-white rounded-t-2xl lg:rounded-2xl shadow-xl max-h-[90vh] flex flex-col"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Schedule Recipe
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-opacity-80 transition-colors"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {error && (
            <div className="mx-4 mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)' }}>
              {error}
            </div>
          )}

          {selectedRecipe ? (
            // Recipe scheduling form
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Selected Recipe Display */}
                <div>
                  <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Selected Recipe
                  </h3>
                  <PlannerRecipeCard
                    recipe={selectedRecipe}
                    pantryItems={pantryItems}
                    onClick={() => setSelectedRecipe(null)}
                    showIngredientStatus={true}
                  />
                </div>

                {/* Scheduling Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={schedulingDate}
                      onChange={(e) => setSchedulingDate(e.target.value)}
                      className="w-full p-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        borderColor: 'var(--border-medium)',
                        color: 'var(--text-primary)',
                        '--tw-ring-color': 'var(--color-primary)'
                      }}
                      required
                    />
                  </div>

                  {/* Servings */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Servings
                    </label>
                    <input
                      type="number"
                      value={servings}
                      onChange={(e) => setServings(e.target.value)}
                      placeholder={selectedRecipe.servings ? String(selectedRecipe.servings) : '4'}
                      min="1"
                      max="20"
                      className="w-full p-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        borderColor: 'var(--border-medium)',
                        color: 'var(--text-primary)',
                        '--tw-ring-color': 'var(--color-primary)'
                      }}
                    />
                  </div>
                </div>

                {/* Meal Type */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Meal Type
                  </label>
                  <select
                    value={schedulingMealType}
                    onChange={(e) => setSchedulingMealType(e.target.value)}
                    className="w-full p-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-medium)',
                      color: 'var(--text-primary)',
                      '--tw-ring-color': 'var(--color-primary)'
                    }}
                  >
                    {mealTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedRecipe(null)}
                    className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  >
                    Back to Recipes
                  </button>
                  <button
                    onClick={handleScheduleRecipe}
                    disabled={isScheduling || !schedulingDate}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                  >
                    {isScheduling ? (
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <PlusIcon />
                    )}
                    Schedule Recipe
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Recipe selection
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Search */}
              <div className="p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search recipes..."
                    className="w-full pl-10 pr-3 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-medium)',
                      color: 'var(--text-primary)',
                      '--tw-ring-color': 'var(--color-primary)'
                    }}
                  />
                </div>
              </div>

              {/* Recipe List */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)' }} />
                    <span className="ml-3" style={{ color: 'var(--text-secondary)' }}>Loading recipes...</span>
                  </div>
                ) : filteredRecipes.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🍽️</div>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      {recipes.length === 0 ? 'No saved recipes found.' : 'No recipes match your search.'}
                    </p>
                    {recipes.length === 0 && (
                      <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                        Generate some recipes first to schedule them here.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRecipes.map(recipe => (
                      <PlannerRecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        pantryItems={pantryItems}
                        onClick={() => handleRecipeSelect(recipe)}
                        showIngredientStatus={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}