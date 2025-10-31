import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, X, Save, BookOpen, Trash2 } from 'lucide-react';
import RecipeSelector from './RecipeSelector';
import logger from '../utils/logger';

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
    case 'planned': return 'complete'; // Changed from 'edit-plan' - completion-first approach
    case 'completed': return 'view-completed';
    default: return 'add';
  }
};

function UnifiedMealModal({
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

  // Completion workflow state
  const [completionStage, setCompletionStage] = useState('intent'); // 'intent', 'custom-meal', 'edit-mode'
  const [customMealDescription, setCustomMealDescription] = useState('');
  const [customMealNotes, setCustomMealNotes] = useState('');

  // Meal type options - memoized to prevent recreation on every render
  const mealTypeOptions = useMemo(() => [
    { value: 'breakfast', label: 'Breakfast', icon: '🍳' },
    { value: 'lunch', label: 'Lunch', icon: '🥗' },
    { value: 'dinner', label: 'Dinner', icon: '🍽️' },
    { value: 'snacks', label: 'Snacks', icon: '🍿' }
  ], []);

  // ESC key handler for modal dismissal
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Memoize meal state and modal mode for performance
  const mealState = useMemo(() => getMealState(meal), [meal]);
  const currentModalMode = useMemo(() => getModalMode(mealState), [mealState]);

  // Initialize modal based on meal data
  useEffect(() => {
    if (isOpen) {
      setModalMode(currentModalMode);

      // Always reset completion workflow state to prevent contamination
      setCompletionStage('intent');
      setCustomMealDescription('');
      setCustomMealNotes('');

      // Set completion mode if needed
      if (currentModalMode === 'complete') {
        setCompletionStage('intent'); // Ensure clean start for completion flow
      }

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
  }, [isOpen, meal, selectedDate, selectedMealType, currentModalMode]);

  // Memoize modal title computation for performance
  const modalTitle = useMemo(() => {
    // Safe timezone-neutral date parsing
    let dayName = 'Unknown Day';
    try {
      if (date) {
        dayName = new Date(date + 'T12:00:00').toLocaleDateString([], { weekday: 'long' });
      }
    } catch (error) {
      logger.warn('Invalid date for modal title:', date, error);
    }
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
  }, [date, mealType, modalMode, mealTypeOptions, meal]);

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
    if (completionStage === 'custom-meal') {
      // In completion flow - set custom meal description
      setCustomMealDescription(recipe.title);
    } else {
      // In normal flow - set main description
      setDescription(recipe.title);
    }
    setShowRecipeSelector(false);
    // Could set additional recipe data here for planned meals
  };

  // Completion workflow handlers
  const handleCompleteAsPlanned = async () => {
    if (!meal) return;

    setIsLoading(true);
    setError('');

    try {
      const completionData = {
        ...meal,
        completed: true,
        completedDate: formatDateForInput(new Date()),
        completionType: 'as-planned',
        actual: {
          recipeName: meal.planned?.recipeName,
          description: meal.planned?.description || meal.planned?.recipeName
        }
      };

      const response = await fetch(`/api/planner/${activeHomeId}/${meal.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(completionData)
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

  const handleCompleteCustom = () => {
    setCompletionStage('custom-meal');
  };

  const handleSwitchToEdit = () => {
    setModalMode('edit-plan');
    setCompletionStage('edit-mode');
    // Initialize description for edit mode
    const displayText = meal.planned?.recipeName || meal.planned?.description || '';
    setDescription(displayText);
  };

  // Revert to planned state function
  const handleRevertToPlanned = async () => {
    if (!meal) return;

    setIsLoading(true);
    setError('');

    try {
      const revertData = {
        ...meal,
        completed: false,
        completedDate: null,
        completionType: null,
        actual: null
      };

      const response = await fetch(`/api/planner/${activeHomeId}/${meal.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(revertData)
      });

      if (response.ok) {
        const savedMeal = await response.json();
        onSave(savedMeal);
        onClose();
      } else {
        setError('Failed to revert meal to planned state');
      }
    } catch (err) {
      setError('Failed to revert meal to planned state');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomCompletion = async () => {
    if (!customMealDescription.trim()) {
      setError('Please enter what you actually ate');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const completionData = {
        ...meal,
        completed: true,
        completedDate: formatDateForInput(new Date()),
        completionType: 'modified',
        actual: {
          description: customMealDescription.trim(),
          notes: customMealNotes.trim() || undefined
        }
      };

      const response = await fetch(`/api/planner/${activeHomeId}/${meal.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(completionData)
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

  if (!isOpen) return null;

  // Check if this meal came from a recipe
  const isFromRecipe = meal?.planned?.recipeName || meal?.planned?.recipeId;
  const isManualMeal = !isFromRecipe && (meal?.planned?.source === 'manual' || meal?.actual?.description);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div
        className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-color-light">
          <h2
            id="modal-title"
            className="text-lg font-semibold text-color-primary"
          >
            {modalTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-opacity-10 transition-colors text-color-secondary"
            aria-label="Close modal"
          >
            <X className="icon-medium" />
          </button>
        </div>

        {/* Body */}
        <div id="modal-description" className="p-4 space-y-4">
          {error && (
            <div className="alert alert-error text-sm">
              {error}
            </div>
          )}

          {/* Complete Modal Workflow */}
          {modalMode === 'complete' && (
            <>
              {completionStage === 'intent' && (
                <div className="space-y-4">
                  {/* Planned meal display */}
                  <div className="section-info-box">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-color-primary">
                        Planned: {meal?.planned?.recipeName || meal?.planned?.description}
                      </span>
                      {/* Recipe badge if from recipe */}
                      {meal?.planned?.recipeId && (
                        <div className="badge badge-small badge-recipe flex items-center gap-1">
                          <BookOpen className="icon-small" />
                          Recipe
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Completion options */}
                  <div>
                    <p className="text-sm mb-3 text-color-secondary">
                      Did you eat this as planned?
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={handleCompleteAsPlanned}
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-color-inverse"
                        style={{ backgroundColor: 'var(--color-success)' }}
                        aria-label="Mark meal as completed - ate as planned"
                      >
                        ✓ Yes, I ate this
                      </button>
                      <button
                        onClick={handleCompleteCustom}
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-color-inverse"
                        style={{ backgroundColor: 'var(--color-warning)' }}
                        aria-label="Complete with different meal - ate something else"
                      >
                        ✗ No, I ate something else
                      </button>
                      <button
                        onClick={handleSwitchToEdit}
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-tertiary text-color-primary border border-color-light"
                        aria-label="Edit planned meal instead"
                      >
                        📝 Edit plan instead
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {completionStage === 'custom-meal' && (
                <div className="space-y-4">
                  {/* Show original plan */}
                  <div className="section-info-box">
                    <span className="text-sm text-color-secondary">
                      Originally planned: {meal?.planned?.recipeName || meal?.planned?.description}
                    </span>
                  </div>

                  {/* Custom meal entry */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-color-primary">
                      What did you actually eat?
                    </label>
                    <textarea
                      value={customMealDescription}
                      onChange={(e) => setCustomMealDescription(e.target.value)}
                      placeholder="Enter what you actually ate..."
                      rows={2}
                      className="form-textarea"
                      aria-label="Description of what you actually ate"
                    />

                    {/* Recipe selector button */}
                    <button
                      onClick={() => setShowRecipeSelector(true)}
                      className="flex items-center gap-2 px-3 py-2 mt-2 text-sm rounded-lg border border-color-light transition-colors text-color-primary-brand bg-primary"
                      aria-label="Choose from recipe library"
                    >
                      <BookOpen className="icon-small" />
                      Choose from Recipe
                    </button>
                  </div>

                  {/* Optional notes */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-color-primary">
                      Notes (optional)
                    </label>
                    <textarea
                      value={customMealNotes}
                      onChange={(e) => setCustomMealNotes(e.target.value)}
                      placeholder="Any additional notes..."
                      rows={1}
                      className="form-textarea"
                      aria-label="Optional notes about your meal"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCompletionStage('intent')}
                      className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors bg-tertiary text-color-primary"
                      aria-label="Go back to completion options"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCustomCompletion}
                      disabled={isLoading || !customMealDescription.trim()}
                      className="btn-base btn-primary flex-1 disabled:opacity-50"
                      aria-label="Save custom meal completion"
                    >
                      {isLoading ? 'Saving...' : 'Complete with Changes'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Meal Description - Only show for non-complete modes */}
          {modalMode !== 'complete' && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-color-primary">
                  {modalMode === 'planned' ? 'Or enter what you actually ate:' : modalMode === 'view-completed' ? 'What did you eat?' : 'What are you eating?'}
                </label>
              {/* Recipe indicator badge */}
              {isFromRecipe && (
                <div className="badge badge-small badge-recipe flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Recipe
                </div>
              )}
              {/* Manual meal indicator badge */}
              {isManualMeal && (
                <div className="badge badge-small badge-manual flex items-center gap-1">
                  ✏️ Manual
                </div>
              )}
            </div>
            <div className="space-y-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter meal description..."
                rows={2}
                className="form-textarea"
                aria-label="Meal description"
              />

              {modalMode === 'add' && (
                <button
                  onClick={() => setShowRecipeSelector(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-color-light transition-colors text-color-primary-brand bg-primary"
                  aria-label="Choose recipe from library"
                >
                  <BookOpen className="w-4 h-4" />
                  Choose from Recipe
                </button>
              )}
            </div>
            </div>
          )}

          {/* Date and Meal Type - Only show for non-complete modes */}
          {modalMode !== 'complete' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2 text-color-primary">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
                aria-label="Select date for meal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-color-primary">
                Meal
              </label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="form-select"
                aria-label="Select meal type"
              >
                {mealTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          )}
        </div>

        {/* Footer - Only show for non-complete modes */}
        {modalMode !== 'complete' && (
          <div className="flex items-center justify-between p-4 border-t border-color-light">
            <div className="flex gap-2">
              {meal && modalMode !== 'complete' && (
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="p-2 rounded-lg transition-colors text-color-error"
                  title="Delete meal"
                  aria-label="Delete this meal"
                >
                  <Trash2 className="icon-small" />
                </button>
              )}
              {modalMode === 'view-completed' && (
                <button
                  onClick={handleRevertToPlanned}
                  disabled={isLoading}
                  className="px-3 py-1 text-sm rounded-lg transition-colors bg-primary border"
                  style={{
                    color: 'var(--color-warning)',
                    borderColor: 'var(--color-warning)'
                  }}
                  title="Revert to planned state"
                  aria-label="Revert meal to planned state"
                >
                  ↶ Mark as Planned
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg font-medium transition-colors text-color-secondary"
                aria-label="Cancel and close modal"
              >
                Cancel
              </button>
              {modalMode === 'edit-plan' && (
                <button
                  onClick={handleQuickComplete}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-color-inverse"
                  style={{ backgroundColor: 'var(--color-success)' }}
                  aria-label="Complete meal as planned"
                >
                  ✓ Complete
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="btn-base btn-primary flex items-center gap-2"
                aria-label="Save meal changes"
              >
                <Save className="icon-small" />
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Complete modal footer - just cancel */}
        {modalMode === 'complete' && completionStage === 'intent' && (
          <div className="flex items-center justify-center p-4 border-t border-color-light">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium transition-colors text-color-secondary"
              aria-label="Cancel and close modal"
            >
              Cancel
            </button>
          </div>
        )}
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

// Memoize the component for performance optimization
export default React.memo(UnifiedMealModal, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.meal?.id === nextProps.meal?.id &&
    prevProps.selectedDate === nextProps.selectedDate &&
    prevProps.selectedMealType === nextProps.selectedMealType &&
    prevProps.activeHomeId === nextProps.activeHomeId &&
    prevProps.pantryItems?.length === nextProps.pantryItems?.length
  );
});