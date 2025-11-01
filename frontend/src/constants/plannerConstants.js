/**
 * Constants for the Meal Planner feature
 */

/**
 * Number of weeks to fetch meal plans for
 * Used when loading meal data around the current week
 */
export const MEAL_FETCH_WINDOW = {
  PAST_WEEKS: 4,    // Fetch 4 weeks before current week
  FUTURE_WEEKS: 6   // Fetch 6 weeks after current week (including current)
};

/**
 * Maximum number of meal indicator dots to show per day in calendar view
 * Prevents UI overflow when there are many meals scheduled
 */
export const MAX_MEAL_DOTS = 4;

/**
 * Hour cutoffs for determining meal type based on time of day
 * Used for suggesting appropriate meal types when adding meals
 */
export const MEAL_TIME_BOUNDARIES = {
  BREAKFAST_CUTOFF: 10,  // Before 10am = breakfast
  LUNCH_CUTOFF: 15,      // 10am-3pm = lunch
  DINNER_CUTOFF: 21      // 3pm-9pm = dinner, after 9pm = snacks
};
