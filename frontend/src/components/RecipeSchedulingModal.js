import React, { useState, useEffect } from 'react';
import logger from '../utils/logger';

// Icons
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

export default function RecipeSchedulingModal({
  isOpen,
  onClose,
  onSchedule,
  recipe,
  getAuthHeaders,
  activeHomeId
}) {
  const [schedulingDate, setSchedulingDate] = useState('');
  const [schedulingMealType, setSchedulingMealType] = useState('breakfast');
  const [servings, setServings] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState('');

  const mealTypes = [
    { value: 'breakfast', label: 'Breakfast', icon: '🍳' },
    { value: 'lunch', label: 'Lunch', icon: '🥗' },
    { value: 'dinner', label: 'Dinner', icon: '🍽️' },
    { value: 'snacks', label: 'Snacks', icon: '🍿' }
  ];

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen && recipe) {
      const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      setSchedulingDate(formatDateForInput(new Date()));
      setSchedulingMealType('breakfast');
      setServings(recipe.servings ? String(recipe.servings) : '4');
      setError('');
    }
  }, [isOpen, recipe]);

  const handleScheduleRecipe = async () => {
    if (!recipe || !getAuthHeaders || !activeHomeId) return;

    setIsScheduling(true);
    setError('');

    try {
      // Ensure recipe name is prioritized correctly
      const recipeName = recipe.title || recipe.name || 'Recipe';

      const plannedData = {
        recipeId: recipe.id,
        recipeName: recipeName, // Use the prioritized recipe name
        ingredients: recipe.ingredients || [],
        servings: parseInt(servings) || recipe.servings || 4,
        cookingTime: recipe.cookingTime || recipe.cookTime || recipe.time,
        description: recipe.description
      };

      logger.debug('📝 Planned data being sent:', plannedData);

      const mealPlan = {
        date: schedulingDate, // Date-only format, no timezone conversion
        mealType: schedulingMealType,
        planned: plannedData
      };

      logger.debug('📅 Scheduling recipe:', { mealPlan, recipe });

      const response = await fetch(`/api/planner/${activeHomeId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(mealPlan)
      });

      logger.debug('📅 Response status:', response.status, response.statusText);

      if (response.ok) {
        const newMealPlan = await response.json();
        logger.debug('✅ Recipe scheduled successfully:', newMealPlan);
        onSchedule(newMealPlan);
        onClose();
      } else {
        let errorMessage = 'Failed to schedule recipe';
        try {
          const errorData = await response.json();
          logger.error('❌ Failed to schedule recipe - Error Data:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          logger.error('❌ Failed to parse error response:', parseError);
          logger.error('❌ Response text:', await response.text());
        }
        setError(errorMessage);
      }
    } catch (err) {
      logger.error('❌ Error scheduling recipe:', err);
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
        className="relative w-full max-w-lg bg-white rounded-t-2xl lg:rounded-2xl shadow-xl max-h-[90vh] flex flex-col"
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
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)' }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Recipe Display */}
            <div>
              <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Recipe
              </h3>
              <div
                className="p-3 rounded-lg border"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-light)'
                }}
              >
                <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                  {recipe?.name || recipe?.title || 'Recipe'}
                </div>
                {recipe?.description && (
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {recipe.description}
                  </div>
                )}
              </div>
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
                  placeholder={recipe?.servings ? String(recipe.servings) : '4'}
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
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                Cancel
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
      </div>
    </div>
  );
}