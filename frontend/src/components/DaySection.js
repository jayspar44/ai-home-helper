import React, { forwardRef } from 'react';
import MealCard from './MealCard';

/**
 * DaySection - Display a day's meals with progressive disclosure
 * Only shows meals that are actually planned
 *
 * @param {Date} day - The day to display
 * @param {Array} mealPlans - All meal plans
 * @param {Function} onAddMeal - Callback to add a new meal
 * @param {Function} onEditMeal - Callback to edit a meal
 * @param {Function} onCompleteMeal - Callback to quick complete a meal
 */
const DaySection = forwardRef(({
  day,
  mealPlans,
  onAddMeal,
  onEditMeal,
  onCompleteMeal
}, ref) => {
  // Format date for comparison
  const formatDateForAPI = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayNum = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayNum}`;
  };

  const dayString = formatDateForAPI(day);

  // Get meals for this day and sort by meal type order
  const mealTypeOrder = { breakfast: 0, lunch: 1, dinner: 2, snacks: 3 };
  const dayMeals = mealPlans
    .filter(plan => {
      const planDateString = typeof plan.date === 'string'
        ? plan.date.split('T')[0]
        : formatDateForAPI(new Date(plan.date));
      return planDateString === dayString;
    })
    .sort((a, b) => {
      return (mealTypeOrder[a.mealType] || 999) - (mealTypeOrder[b.mealType] || 999);
    });

  // Check if this is today
  const isToday = () => {
    const today = new Date();
    return day.getDate() === today.getDate() &&
           day.getMonth() === today.getMonth() &&
           day.getFullYear() === today.getFullYear();
  };

  // Format day display
  const dayName = day.toLocaleDateString([], { weekday: 'long' });
  const monthName = day.toLocaleDateString([], { month: 'short' });
  const dayNumber = day.getDate();

  // Handle empty day click
  const handleEmptyDayClick = () => {
    // Suggest meal type based on time of day
    const now = new Date();
    const currentHour = now.getHours();
    let suggestedMealType = 'snacks';
    if (currentHour < 10) suggestedMealType = 'breakfast';
    else if (currentHour < 15) suggestedMealType = 'lunch';
    else if (currentHour < 21) suggestedMealType = 'dinner';

    onAddMeal(day, suggestedMealType);
  };

  return (
    <div ref={ref} className="day-section" data-date={dayString}>
      {/* Day Header */}
      <div className="day-header">
        <div>
          <span className="day-title">{dayName}</span>
          <span className="day-date">
            {monthName} {dayNumber}
            {isToday() && ' • Today'}
          </span>
        </div>
        <button
          className="add-meal-btn"
          onClick={handleEmptyDayClick}
          aria-label={`Add meal for ${dayName}`}
        >
          + Add
        </button>
      </div>

      {/* Meals or Empty State */}
      {dayMeals.length > 0 ? (
        dayMeals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            day={day}
            onEdit={onEditMeal}
            onComplete={onCompleteMeal}
          />
        ))
      ) : (
        <div
          className="empty-day"
          onClick={handleEmptyDayClick}
          role="button"
          tabIndex={0}
          aria-label={`Plan meals for ${dayName}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleEmptyDayClick();
            }
          }}
        >
          + Plan meals for {dayName}
        </div>
      )}
    </div>
  );
});

DaySection.displayName = 'DaySection';

export default DaySection;
