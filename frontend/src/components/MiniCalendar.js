import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * MiniCalendar - Compact month view calendar with meal indicators
 *
 * @param {Array} mealPlans - Array of meal plan objects with date and mealType
 * @param {Date} currentMonth - The month to display
 * @param {Function} onMonthChange - Callback when month navigation buttons clicked (1 for next, -1 for prev)
 * @param {Function} onDayClick - Callback when a day is clicked, receives Date object
 * @param {Date} currentWeekStart - Start of current week for context (optional)
 */
const MiniCalendar = ({ mealPlans = [], currentMonth, onMonthChange, onDayClick, currentWeekStart }) => {
  // Get calendar data
  const calendarData = useMemo(() => {
    if (!currentMonth) return { days: [], monthName: '', year: '' };

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Build array of day objects
    const days = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ date: null, dayNumber: null });
    }

    // Add actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        dayNumber: day
      });
    }

    return {
      days,
      monthName: currentMonth.toLocaleDateString([], { month: 'long' }),
      year: year.toString()
    };
  }, [currentMonth]);

  // Format date to YYYY-MM-DD for comparison
  const formatDateForComparison = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if a day has meals
  const getDayMealCount = (date) => {
    if (!date) return 0;
    const dateString = formatDateForComparison(date);
    return mealPlans.filter(plan => {
      // Handle both date string formats
      const planDate = typeof plan.date === 'string'
        ? plan.date.split('T')[0]
        : formatDateForComparison(new Date(plan.date));
      return planDate === dateString;
    }).length;
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

  // Handle month navigation
  const handlePrevMonth = () => {
    if (onMonthChange) {
      onMonthChange(-1);
    }
  };

  const handleNextMonth = () => {
    if (onMonthChange) {
      onMonthChange(1);
    }
  };

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-header">
        <div className="mini-calendar-month">
          {calendarData.monthName} {calendarData.year}
        </div>
        <div className="mini-calendar-nav">
          <button
            onClick={handlePrevMonth}
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="mini-calendar-grid">
        {/* Day labels */}
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <div key={`label-${index}`} className="mini-calendar-day-label">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarData.days.map((dayData, index) => {
          const { date, dayNumber } = dayData;
          const mealCount = getDayMealCount(date);
          const hasMeals = mealCount > 0;
          const isTodayDate = isToday(date);

          // Empty cell for days before month starts
          if (!date) {
            return <div key={`empty-${index}`} className="mini-calendar-day" />;
          }

          return (
            <div
              key={`day-${index}`}
              className={`mini-calendar-day ${isTodayDate ? 'today' : ''} ${hasMeals ? 'has-meals' : ''}`}
              onClick={() => handleDayClick(date)}
              role="button"
              tabIndex={0}
              aria-label={`${dayNumber} ${hasMeals ? `- ${mealCount} meal${mealCount !== 1 ? 's' : ''}` : ''}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDayClick(date);
                }
              }}
            >
              {dayNumber}
              {hasMeals && (
                <div className="meal-dots">
                  {Array.from({ length: Math.min(mealCount, 4) }).map((_, dotIndex) => (
                    <div key={dotIndex} className="meal-dot" />
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

export default MiniCalendar;
