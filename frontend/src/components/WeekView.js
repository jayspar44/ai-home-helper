import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * WeekView - Compact week view calendar with meal indicators
 * Shows 7 days horizontally with navigation to browse different weeks
 *
 * @param {Array} mealPlans - Array of meal plan objects with date and mealType
 * @param {Date} initialWeekStart - Initial week to display (defaults to current week)
 * @param {Function} onDayClick - Callback when a day is clicked, receives Date object
 * @param {Function} onWeekChange - Callback when week navigation changes, receives new week start Date
 */
const WeekView = ({ mealPlans = [], initialWeekStart, onDayClick, onWeekChange }) => {
  // Internal state for which week to display in the calendar
  const [displayWeekStart, setDisplayWeekStart] = useState(() => {
    if (initialWeekStart) return initialWeekStart;
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  });

  // Generate array of 7 days for current week
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(displayWeekStart);
      date.setDate(displayWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  }, [displayWeekStart]);

  // Format date to YYYY-MM-DD for comparison
  const formatDateForComparison = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get meal counts by state for a day
  const getDayMealCounts = (date) => {
    if (!date) return { planned: 0, completed: 0 };
    const dateString = formatDateForComparison(date);
    const dayMeals = mealPlans.filter(plan => {
      // Handle both date string formats
      const planDate = typeof plan.date === 'string'
        ? plan.date.split('T')[0]
        : formatDateForComparison(new Date(plan.date));
      return planDate === dateString;
    });

    const planned = dayMeals.filter(meal => meal.completed !== true).length;
    const completed = dayMeals.filter(meal => meal.completed === true).length;

    return { planned, completed };
  };

  // Check if date is today
  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Handle day click
  const handleDayClick = (date) => {
    if (date && onDayClick) {
      onDayClick(date);
    }
  };

  // Handle week navigation
  const handlePrevWeek = () => {
    const newWeekStart = new Date(displayWeekStart);
    newWeekStart.setDate(displayWeekStart.getDate() - 7);
    setDisplayWeekStart(newWeekStart);
    if (onWeekChange) {
      onWeekChange(newWeekStart);
    }
  };

  const handleNextWeek = () => {
    const newWeekStart = new Date(displayWeekStart);
    newWeekStart.setDate(displayWeekStart.getDate() + 7);
    setDisplayWeekStart(newWeekStart);
    if (onWeekChange) {
      onWeekChange(newWeekStart);
    }
  };

  // Get week range display (e.g., "Oct 27 - Nov 2")
  const getWeekRangeDisplay = () => {
    const firstDay = weekDays[0];
    const lastDay = weekDays[6];

    const firstMonth = firstDay.toLocaleDateString([], { month: 'short' });
    const lastMonth = lastDay.toLocaleDateString([], { month: 'short' });
    const firstDate = firstDay.getDate();
    const lastDate = lastDay.getDate();

    if (firstMonth === lastMonth) {
      return `${firstMonth} ${firstDate} - ${lastDate}`;
    } else {
      return `${firstMonth} ${firstDate} - ${lastMonth} ${lastDate}`;
    }
  };

  return (
    <div className="week-view">
      <div className="week-view-header">
        <div className="week-view-range">
          {getWeekRangeDisplay()}
        </div>
        <div className="week-view-nav">
          <button
            onClick={handlePrevWeek}
            aria-label="Previous week"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={handleNextWeek}
            aria-label="Next week"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="week-view-grid">
        {/* Day labels and dates */}
        {weekDays.map((date, index) => {
          const dayLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
          const dayNumber = date.getDate();
          const mealCounts = getDayMealCounts(date);
          const totalMeals = mealCounts.planned + mealCounts.completed;
          const hasMeals = totalMeals > 0;
          const isTodayDate = isToday(date);

          return (
            <div
              key={index}
              className={`week-view-day ${isTodayDate ? 'today' : ''} ${hasMeals ? 'has-meals' : ''}`}
              onClick={() => handleDayClick(date)}
              role="button"
              tabIndex={0}
              aria-label={`${dayLabel} ${dayNumber} ${hasMeals ? `- ${totalMeals} meal${totalMeals !== 1 ? 's' : ''}` : ''}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDayClick(date);
                }
              }}
            >
              <div className="week-view-day-label">{dayLabel}</div>
              <div className="week-view-day-number">{dayNumber}</div>
              {hasMeals && (
                <div className="meal-dots">
                  {/* Show up to 4 dots total, mixing planned and completed */}
                  {Array.from({ length: Math.min(mealCounts.planned, 4) }).map((_, dotIndex) => (
                    <div key={`planned-${dotIndex}`} className="meal-dot planned" />
                  ))}
                  {Array.from({ length: Math.min(mealCounts.completed, 4 - mealCounts.planned) }).map((_, dotIndex) => (
                    <div key={`completed-${dotIndex}`} className="meal-dot completed" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekView;
