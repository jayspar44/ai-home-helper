import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import WeekView from './WeekView';

/**
 * PlannerSidebar - Desktop sidebar with calendar, stats, and quick actions
 *
 * @param {Array} mealPlans - Array of meal plan objects
 * @param {Date} currentWeekStart - Start of current week (for feed display)
 * @param {Date} calendarWeekStart - Start of week calendar is currently showing
 * @param {Function} onAddMeal - Callback to add a new meal
 * @param {Function} onDayClick - Callback when calendar day is clicked
 * @param {Function} onCalendarWeekChange - Callback when calendar navigates to different week
 * @param {Function} onEditMeal - Callback when editing a meal
 */
const PlannerSidebar = ({
  mealPlans = [],
  currentWeekStart,
  calendarWeekStart,
  onAddMeal,
  onDayClick,
  onCalendarWeekChange,
  onEditMeal
}) => {
  // Calculate stats for calendar's current week
  const weekStats = useMemo(() => {
    if (!calendarWeekStart) return { mealsPlanned: 0, daysCovered: 0, weekRange: '' };

    // Get end of week
    const weekEnd = new Date(calendarWeekStart);
    weekEnd.setDate(calendarWeekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Format dates for comparison
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const weekStartStr = formatDate(calendarWeekStart);
    const weekEndStr = formatDate(weekEnd);

    // Filter meals in calendar's week
    const weekMeals = mealPlans.filter(plan => {
      const planDate = typeof plan.date === 'string'
        ? plan.date.split('T')[0]
        : formatDate(new Date(plan.date));
      return planDate >= weekStartStr && planDate <= weekEndStr;
    });

    // Count unique days with meals
    const uniqueDays = new Set(
      weekMeals.map(plan => {
        return typeof plan.date === 'string'
          ? plan.date.split('T')[0]
          : formatDate(new Date(plan.date));
      })
    );

    // Format week range display
    const startMonth = calendarWeekStart.toLocaleDateString([], { month: 'short' });
    const endMonth = weekEnd.toLocaleDateString([], { month: 'short' });
    const startDay = calendarWeekStart.getDate();
    const endDay = weekEnd.getDate();

    const weekRange = startMonth === endMonth
      ? `${startMonth} ${startDay} - ${endDay}`
      : `${startMonth} ${startDay} - ${endMonth} ${endDay}`;

    return {
      mealsPlanned: weekMeals.length,
      daysCovered: uniqueDays.size,
      weekRange
    };
  }, [mealPlans, calendarWeekStart]);

  // Get next 2 upcoming meals
  const upcomingMeals = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentHour = now.getHours();

    // Format date for comparison
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(today);

    // Meal type order for today (based on current time)
    const mealTypeOrder = {
      breakfast: 0,
      lunch: 1,
      dinner: 2,
      snacks: 3
    };

    // Determine which meals have passed today
    let currentMealIndex = 0;
    if (currentHour >= 10) currentMealIndex = 1; // Past breakfast
    if (currentHour >= 15) currentMealIndex = 2; // Past lunch
    if (currentHour >= 21) currentMealIndex = 3; // Past dinner

    // Get all meals sorted by date and meal type
    const sortedMeals = [...mealPlans]
      .map(plan => ({
        ...plan,
        dateStr: typeof plan.date === 'string'
          ? plan.date.split('T')[0]
          : formatDate(new Date(plan.date)),
        dateObj: typeof plan.date === 'string'
          ? new Date(plan.date.split('T')[0])
          : new Date(plan.date)
      }))
      .filter(plan => {
        // Include today's future meals and all future meals
        if (plan.dateStr > todayStr) return true;
        if (plan.dateStr === todayStr) {
          return mealTypeOrder[plan.mealType] >= currentMealIndex;
        }
        return false;
      })
      .sort((a, b) => {
        // Sort by date first
        if (a.dateStr !== b.dateStr) {
          return a.dateStr.localeCompare(b.dateStr);
        }
        // Then by meal type order
        return mealTypeOrder[a.mealType] - mealTypeOrder[b.mealType];
      });

    return sortedMeals.slice(0, 2);
  }, [mealPlans]);

  // Format relative time for upcoming meals
  const formatRelativeTime = (meal) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const mealDateStr = meal.dateStr || formatDate(meal.dateObj);
    const todayStr = formatDate(today);
    const tomorrowStr = formatDate(tomorrow);

    const mealTypeLabels = {
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      dinner: 'Dinner',
      snacks: 'Snacks'
    };

    if (mealDateStr === todayStr) {
      return `Today, ${mealTypeLabels[meal.mealType]}`;
    } else if (mealDateStr === tomorrowStr) {
      return 'Tomorrow';
    } else {
      // Format as "Mon, Oct 28"
      const date = meal.dateObj;
      return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  // Get emoji for meal type
  const getMealEmoji = (mealType) => {
    const emojis = {
      breakfast: '🍳',
      lunch: '🥗',
      dinner: '🍽️',
      snacks: '🍿'
    };
    return emojis[mealType] || '🍴';
  };

  return (
    <>
      {/* Week View Calendar - First */}
      <div className="sidebar-section">
        <div className="sidebar-card">
          <WeekView
            mealPlans={mealPlans}
            initialWeekStart={currentWeekStart}
            onDayClick={onDayClick}
            onWeekChange={onCalendarWeekChange}
          />
        </div>
      </div>

      {/* Quick Stats - Second */}
      <div className="sidebar-section">
        <div className="quick-stats">
          <div className="stat-card">
            <div className="stat-value">{weekStats.mealsPlanned}</div>
            <div className="stat-label">Meals Planned</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{weekStats.daysCovered}</div>
            <div className="stat-label">Days Covered</div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Third */}
      <div className="sidebar-section">
        <button
          className="btn-base btn-primary"
          onClick={onAddMeal}
          style={{ width: '100%' }}
        >
          <Plus size={20} />
          Add Meal
        </button>
      </div>

      {/* Upcoming Meals - Fourth */}
      {upcomingMeals.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-card">
            <div className="upcoming-meals">
              {upcomingMeals.map((meal, index) => {
                const mealName = meal.planned?.recipeName || meal.planned?.description || 'Untitled Meal';
                return (
                  <div
                    key={meal.id || index}
                    className="upcoming-meal-item"
                    onClick={() => onEditMeal && onEditMeal(meal, 'planned')}
                    role="button"
                    tabIndex={0}
                    aria-label={`Edit ${mealName}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onEditMeal && onEditMeal(meal, 'planned');
                      }
                    }}
                  >
                    <div className="upcoming-meal-icon">
                      {getMealEmoji(meal.mealType)}
                    </div>
                    <div className="upcoming-meal-info">
                      <div className="upcoming-meal-name">{mealName}</div>
                      <div className="upcoming-meal-time">{formatRelativeTime(meal)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlannerSidebar;
