import React, { useState } from 'react';
import { Check } from 'lucide-react';

/**
 * MealCard - Individual meal display with simplified styling
 * Supports 3-state system: empty → planned → completed
 *
 * @param {Object} meal - Meal data object
 * @param {Date} day - Day this meal belongs to
 * @param {Function} onEdit - Callback to edit meal
 * @param {Function} onComplete - Callback to quick complete meal
 */
const MealCard = ({ meal, day, onEdit, onComplete }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Meal emoji mapping
  const mealIcons = {
    breakfast: '🍳',
    lunch: '🥗',
    dinner: '🍽️',
    snacks: '🍿'
  };

  // Meal type labels
  const mealLabels = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snacks: 'Snacks'
  };

  // Determine meal state: empty → planned → completed
  const getMealState = (mealData) => {
    if (!mealData) return 'empty';
    if (mealData.completed === true) return 'completed';
    if (mealData.planned) return 'planned';
    return 'empty';
  };

  const mealState = getMealState(meal);

  // Get display text based on state
  const getMealDisplayText = () => {
    if (mealState === 'completed') {
      // Show what was actually eaten (prioritize actual, fallback to planned)
      return meal.actual?.recipeName ||
             meal.actual?.description ||
             meal.planned?.recipeName ||
             meal.planned?.description;
    }
    if (mealState === 'planned') {
      // Show what's planned (prioritize recipe names)
      return meal.planned?.recipeName || meal.planned?.description;
    }
    return null;
  };

  const mealText = getMealDisplayText();

  // Handle meal card click
  const handleMealClick = () => {
    if (onEdit) {
      onEdit(meal, mealState === 'completed' ? 'actual' : 'planned');
    }
  };

  // Handle quick complete
  const handleCompleteClick = (e) => {
    e.stopPropagation();
    if (onComplete) {
      onComplete(meal);
    }
  };

  // Get state class for styling
  const getStateClass = () => {
    if (mealState === 'completed') return 'completed';
    if (mealState === 'planned') return 'planned';
    return '';
  };

  return (
    <div
      className={`meal-card ${getStateClass()}`}
      onClick={handleMealClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`${mealLabels[meal.mealType]}: ${mealText || 'Click to add'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleMealClick();
        }
      }}
    >
      {/* Meal Icon */}
      <div className="meal-icon">
        {mealIcons[meal.mealType] || '🍴'}
      </div>

      {/* Meal Info */}
      <div className="meal-info">
        <div className="meal-type">{mealLabels[meal.mealType]}</div>
        {mealText && (
          <div className="meal-name">{mealText}</div>
        )}
      </div>

      {/* Action Buttons - Only show for planned meals */}
      {mealState === 'planned' && (
        <div className="meal-actions">
          {/* Desktop: Show on hover */}
          <div className={`hidden lg:flex items-center gap-2 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            {/* Quick Complete Button */}
            <button
              onClick={handleCompleteClick}
              className="btn-icon-desktop rounded-full transition-all"
              style={{
                backgroundColor: 'var(--color-success)',
                color: 'white'
              }}
              title="Mark as completed (ate as planned)"
              aria-label="Mark as completed - ate as planned"
            >
              <Check size={16} />
            </button>
          </div>

          {/* Mobile: Always visible */}
          <div className="lg:hidden flex items-center gap-2">
            {/* Quick Complete Button */}
            <button
              onClick={handleCompleteClick}
              className="btn-icon-mobile rounded-full"
              style={{
                backgroundColor: 'var(--color-success)',
                color: 'white'
              }}
              title="Mark as completed"
              aria-label="Mark as completed - ate as planned"
            >
              <Check size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealCard;
