import React, { useState, useEffect } from 'react';
import { Plus, X, Save, BookOpen, Trash2 } from 'lucide-react';
import RecipeSelector from './RecipeSelector';

// Utility function to format date for input without timezone conversion
const formatDateForInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Clear 3-state system: empty → planned → completed
const getMealState = (meal) => {
  if (!meal) return 'empty';
  if (meal.completed === true) return 'completed';
  if (meal.planned) return 'planned';
  return 'empty';
};

// Get modal mode based on meal state
const getModalMode = (mealState) => {
  switch (mealState) {
    case 'empty': return 'add';
    case 'planned': return 'edit-plan';
    case 'completed': return 'view-completed';
    default: return 'add';
  }
};

export default function UnifiedMealModal({
  isOpen,
  onClose,
  onSave,
  meal,
  selectedDate,
  selectedMealType,
  getAuthHeaders,
  activeHomeId,
  pantryItems
}) {
  // State
  const [modalMode, setModalMode] = useState('add');
  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState('breakfast');
  const [date, setDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);

  // Meal type options
  const mealTypeOptions = [
    { value: 'breakfast', label: 'Breakfast', icon: '🍳' },
    { value: 'lunch', label: 'Lunch', icon: '🥗' },
    { value: 'dinner', label: 'Dinner', icon: '🍽️' },
    { value: 'snacks', label: 'Snacks', icon: '🍿' }
  ];

  // Initialize modal based on meal data
  useEffect(() => {
    if (isOpen) {
      const mealState = getMealState(meal);
      const mode = getModalMode(mealState);
      setModalMode(mode);

      if (meal) {
        // Editing existing meal - prioritize recipe names over descriptions
        const displayText = meal.planned?.recipeName || meal.actual?.description || meal.planned?.description || '';
        setDescription(displayText);
        setMealType(meal.mealType || 'breakfast');
        setDate(typeof meal.date === 'string' ? meal.date : formatDateForInput(new Date(meal.date)));
      } else {
        // Adding new meal
        setDescription('');
        setMealType(selectedMealType || 'breakfast');
        setDate(
          selectedDate
            ? (typeof selectedDate === 'string' ? selectedDate : formatDateForInput(selectedDate))
            : formatDateForInput(new Date())
        );
      }

      setError('');
      setShowRecipeSelector(false);
    }
  }, [isOpen, meal, selectedDate, selectedMealType]);

  // Get modal title based on mode
  const getModalTitle = () => {
    // Use timezone-neutral date parsing by adding noon time
    const dayName = new Date(date + 'T12:00:00').toLocaleDateString([], { weekday: 'long' });
    const mealLabel = mealTypeOptions.find(opt => opt.value === mealType)?.label || mealType;

    switch (modalMode) {
      case 'add':
        return `Add ${dayName} ${mealLabel}`;
      case 'edit-plan':
        return `${dayName} ${mealLabel} - ${meal?.planned?.recipeName || meal?.planned?.description}`;
      case 'view-completed':
        return `${dayName} ${mealLabel} (Completed)`;
      default:
        return `${dayName} ${mealLabel}`;
    }
  };

  // Quick complete function
  const handleQuickComplete = async () => {
    if (!meal) return;

    setIsLoading(true);
    setError('');

    try {
      const updatedMeal = {
        ...meal,
        completed: true,
        completedDate: formatDateForInput(new Date()) // Date-only completion tracking
      };

      const response = await fetch(`/api/planner/${activeHomeId}/${meal.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedMeal)
      });

      if (response.ok) {
        const savedMeal = await response.json();
        onSave(savedMeal);
        onClose();
      } else {
        setError('Failed to complete meal');
      }
    } catch (err) {
      setError('Failed to complete meal');
    } finally {
      setIsLoading(false);
    }
  };

  // Save meal function
  const handleSave = async () => {
    if (!description.trim()) {
      setError('Please enter a meal description');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const mealData = {
        date: date, // Date-only format, no timezone conversion
        mealType,
        ...(meal ? { id: meal.id } : {}),
      };

      // Save logic based on modal mode
      switch (modalMode) {
        case 'add':
          // Adding new planned meal - save as recipe name if from recipe picker, otherwise as description
          mealData.planned = {
            recipeName: description.trim(), // Always use recipeName field for consistency
            source: 'manual'
          };
          break;

        case 'edit-plan':
          // Editing planned meal - update the planned data
          mealData.planned = {
            ...meal.planned,
            recipeName: description.trim()
          };
          break;

        case 'view-completed':
          // Viewing completed meal - should not allow edits typically
          // But if we allow editing, keep existing structure
          mealData.completed = true;
          mealData.completedDate = meal.completedDate || formatDateForInput(new Date());
          mealData.planned = meal.planned;
          // If description changed from planned, save as actual
          if (description.trim() !== (meal.planned?.recipeName || meal.planned?.description)) {
            mealData.actual = { description: description.trim() };
          }
          break;

        default:
          mealData.planned = {
            recipeName: description.trim(),
            source: 'manual'
          };
      }

      const endpoint = meal
        ? `/api/planner/${activeHomeId}/${meal.id}`
        : `/api/planner/${activeHomeId}`;

      const method = meal ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(mealData)
      });

      if (response.ok) {
        const savedMeal = await response.json();
        onSave(savedMeal);
        onClose();
      } else {
        setError('Failed to save meal');
      }
    } catch (err) {
      setError('Failed to save meal');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete meal function
  const handleDelete = async () => {
    if (!meal) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/planner/${activeHomeId}/${meal.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        onSave(null); // Signal deletion
        onClose();
      } else {
        setError('Failed to delete meal');
      }
    } catch (err) {
      setError('Failed to delete meal');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle recipe selection
  const handleRecipeSelected = (recipe) => {
    setDescription(recipe.title);
    setShowRecipeSelector(false);
    // Could set additional recipe data here for planned meals
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {getModalTitle()}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-opacity-10 transition-colors"
            style={{ color: 'var(--text-secondary)', ':hover': { backgroundColor: 'var(--text-secondary)' } }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)' }}
            >
              {error}
            </div>
          )}

          {/* Quick Complete Option for Planned Meals */}
          {modalMode === 'planned' && (
            <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--bg-secondary)' }}>
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                Did you eat this as planned?
              </p>
              <button
                onClick={handleQuickComplete}
                disabled={isLoading}
                className="w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
              >
                ✅ Yes, I ate this
              </button>
            </div>
          )}

          {/* Meal Description */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              {modalMode === 'planned' ? 'Or enter what you actually ate:' : 'What are you eating?'}
            </label>
            <div className="space-y-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter meal description..."
                rows={2}
                className="w-full p-3 rounded-lg border resize-none"
                style={{
                  borderColor: 'var(--border-light)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />

              {modalMode === 'add' && (
                <button
                  onClick={() => setShowRecipeSelector(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors"
                  style={{
                    borderColor: 'var(--border-light)',
                    color: 'var(--color-primary)',
                    backgroundColor: 'transparent'
                  }}
                >
                  <BookOpen className="w-4 h-4" />
                  Choose from Recipe
                </button>
              )}
            </div>
          </div>

          {/* Date and Meal Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 rounded-lg border"
                style={{
                  borderColor: 'var(--border-light)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Meal
              </label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="w-full p-3 rounded-lg border"
                style={{
                  borderColor: 'var(--border-light)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              >
                {mealTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
          <div className="flex gap-2">
            {meal && (
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-error)' }}
                title="Delete meal"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            {modalMode === 'edit-plan' && (
              <button
                onClick={handleQuickComplete}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
              >
                ✓ Complete
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Recipe Selector Modal */}
      {showRecipeSelector && (
        <RecipeSelector
          isOpen={showRecipeSelector}
          onClose={() => setShowRecipeSelector(false)}
          onRecipeSelected={handleRecipeSelected}
          selectedDate={date} // Pass date string to avoid timezone conversion
          selectedMealType={mealType}
          getAuthHeaders={getAuthHeaders}
          activeHomeId={activeHomeId}
          pantryItems={pantryItems}
          mode="select-only" // Just select, don't schedule
        />
      )}
    </div>
  );
}