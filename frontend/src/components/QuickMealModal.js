import React, { useState, useEffect } from 'react';
import RecipeSelector from './RecipeSelector';

// Icons
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17,21 17,13 7,13 7,21"></polyline><polyline points="7,3 7,8 15,8"></polyline></svg>;
const BookOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>;

export default function QuickMealModal({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  selectedMealType,
  initialData = null,
  getAuthHeaders,
  activeHomeId,
  pantryItems = []
}) {
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [mealType, setMealType] = useState('breakfast');
  const [date, setDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);

  const mealTypes = [
    { value: 'breakfast', label: 'Breakfast', icon: '🍳' },
    { value: 'lunch', label: 'Lunch', icon: '🥗' },
    { value: 'dinner', label: 'Dinner', icon: '🍽️' },
    { value: 'snacks', label: 'Snacks', icon: '🍿' }
  ];

  // Initialize form when modal opens or data changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Editing existing meal
        setDescription(initialData.actual?.description || initialData.planned?.recipeName || '');
        setNotes(initialData.actual?.notes || '');
        setMealType(initialData.mealType || 'breakfast');
        setDate(initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : '');
      } else {
        // Adding new meal
        setDescription('');
        setNotes('');
        setMealType(selectedMealType || 'breakfast');
        setDate(selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      }
      setError('');
    }
  }, [isOpen, initialData, selectedDate, selectedMealType]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      setError('Please enter a meal description');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (initialData) {
        // Update existing meal plan
        const updateData = {
          actual: {
            description: description.trim(),
            notes: notes.trim(),
            madeAsPlanned: false
          }
        };

        const response = await fetch(`/api/planner/${activeHomeId}/${initialData.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          const updatedMeal = await response.json();
          onSave(updatedMeal);
          onClose();
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to update meal');
        }
      } else {
        // Log new meal
        const mealData = {
          date: new Date(date).toISOString(),
          mealType,
          description: description.trim(),
          notes: notes.trim()
        };

        const response = await fetch(`/api/planner/${activeHomeId}/log-meal`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(mealData)
        });

        if (response.ok) {
          const newMeal = await response.json();
          onSave(newMeal);
          onClose();
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to log meal');
        }
      }
    } catch (err) {
      console.error('Error saving meal:', err);
      setError('Failed to save meal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsPlanned = async () => {
    if (!initialData?.planned) return;

    setIsLoading(true);
    setError('');

    try {
      const updateData = {
        actual: {
          description: initialData.planned.recipeName || 'Made as planned',
          notes: notes.trim(),
          madeAsPlanned: true
        }
      };

      const response = await fetch(`/api/planner/${activeHomeId}/${initialData.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updatedMeal = await response.json();
        onSave(updatedMeal);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update meal');
      }
    } catch (err) {
      console.error('Error marking as planned:', err);
      setError('Failed to update meal. Please try again.');
    } finally {
      setIsLoading(false);
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
            {initialData ? 'Log Meal' : 'Quick Add Meal'}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date Picker */}
            {!initialData && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
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
            )}

            {/* Meal Type Selector */}
            {!initialData && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Meal Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {mealTypes.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setMealType(type.value)}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        mealType === type.value ? 'border-primary' : ''
                      }`}
                      style={{
                        backgroundColor: mealType === type.value ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                        borderColor: mealType === type.value ? 'var(--color-primary)' : 'var(--border-medium)',
                        color: mealType === type.value ? 'white' : 'var(--text-primary)'
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
            )}

            {/* Meal Description */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                What did you eat? *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Scrambled eggs with toast, Caesar salad, Leftover pizza..."
                rows={3}
                className="w-full p-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 resize-none"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-medium)',
                  color: 'var(--text-primary)',
                  '--tw-ring-color': 'var(--color-primary)'
                }}
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about the meal..."
                rows={2}
                className="w-full p-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 resize-none"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-medium)',
                  color: 'var(--text-primary)',
                  '--tw-ring-color': 'var(--color-primary)'
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {/* Schedule Recipe button (only show when adding new meal) */}
              {!initialData && (
                <button
                  type="button"
                  onClick={() => setShowRecipeSelector(true)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <BookOpenIcon />
                  <span className="hidden sm:inline">Schedule Recipe</span>
                </button>
              )}

              {/* Made as Planned button (only show if editing and has planned meal) */}
              {initialData?.planned && !initialData?.actual && (
                <button
                  type="button"
                  onClick={handleMarkAsPlanned}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
                >
                  ✓ Made as Planned
                </button>
              )}

              <button
                type="submit"
                disabled={isLoading || !description.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <SaveIcon />
                )}
                {initialData ? 'Update' : 'Save'} Meal
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Recipe Selector */}
      <RecipeSelector
        isOpen={showRecipeSelector}
        onClose={() => setShowRecipeSelector(false)}
        onSchedule={(scheduledMeal) => {
          onSave(scheduledMeal);
          setShowRecipeSelector(false);
          onClose();
        }}
        selectedDate={new Date(date)}
        selectedMealType={mealType}
        getAuthHeaders={getAuthHeaders}
        activeHomeId={activeHomeId}
        pantryItems={pantryItems}
      />
    </div>
  );
}