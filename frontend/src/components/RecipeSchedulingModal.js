import React, { useState, useEffect } from 'react';

// Icons
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
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
      const plannedData = {
        recipeId: recipe.id,
        recipeName: recipe.name || recipe.title,
        ingredients: recipe.ingredients || [],
        servings: parseInt(servings) || recipe.servings || 4,
        cookingTime: recipe.cookingTime || recipe.cookTime || recipe.time,
        description: recipe.description
      };

      const mealPlan = {
        date: schedulingDate, // Date-only format, no timezone conversion
        mealType: schedulingMealType,
        planned: plannedData
      };

      console.log('📅 Scheduling recipe:', { mealPlan, recipe });

      const response = await fetch(`/api/planner/${activeHomeId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(mealPlan)
      });

      if (response.ok) {
        const newMealPlan = await response.json();
        console.log('✅ Recipe scheduled successfully:', newMealPlan);
        onSchedule(newMealPlan);
        onClose();
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to schedule recipe:', errorData);
        setError(errorData.error || 'Failed to schedule recipe');
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
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="date"
                    value={schedulingDate}
                    onChange={(e) => setSchedulingDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-medium)',
                      color: 'var(--text-primary)',
                      '--tw-ring-color': 'var(--color-primary)'
                    }}
                    required
                  />
                </div>
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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {mealTypes.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSchedulingMealType(type.value)}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      schedulingMealType === type.value ? 'border-primary' : ''
                    }`}
                    style={{
                      backgroundColor: schedulingMealType === type.value ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                      borderColor: schedulingMealType === type.value ? 'var(--color-primary)' : 'var(--border-medium)',
                      color: schedulingMealType === type.value ? 'white' : 'var(--text-primary)'
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-lg">{type.icon}</span>
                      <span className="text-sm font-medium">{type.label}</span>
                    </div>
                  </button>
                ))}
              </div>
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