import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import UnifiedMealModal from '../components/UnifiedMealModal';
import PlannerRecipeCard from '../components/PlannerRecipeCard';

// Date formatting utility - date-only format to avoid timezone conversion
const formatDateForAPI = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


// Meal slot component
const MealSlot = ({ day, mealType, mealData, onAdd, onEdit }) => {
  const [isHovered, setIsHovered] = useState(false);

  const mealIcons = {
    breakfast: '🍳',
    lunch: '🥗',
    dinner: '🍽️',
    snacks: '🍿'
  };

  const mealLabels = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snacks: 'Snacks'
  };

  // Clear 3-state system: empty → planned → completed
  const getMealState = (mealData) => {
    if (!mealData) return 'empty';
    if (mealData.completed === true) return 'completed';
    if (mealData.planned) return 'planned';
    return 'empty';
  };

  const mealState = getMealState(mealData);

  // Legacy support - keep these for backward compatibility during transition
  const hasPlanned = mealData?.planned?.recipeName || mealData?.planned?.description;
  const hasActual = mealData?.actual?.description;
  const isCompleted = mealState === 'completed';

  // Get meal display text based on state - prioritize recipe names
  const getMealDisplayText = () => {
    if (mealState === 'completed') {
      // Show what was actually eaten (prioritize actual, fallback to planned)
      return mealData.actual?.recipeName ||
             mealData.actual?.description ||
             mealData.planned?.recipeName ||
             mealData.planned?.description;
    }
    if (mealState === 'planned') {
      // Show what's planned (prioritize recipe names)
      return mealData.planned?.recipeName || mealData.planned?.description;
    }
    return null; // empty state
  };

  const mealText = getMealDisplayText();

  // Visual styling based on clear 3-state system
  const getStatusStyles = (state) => {
    switch (state) {
      case 'completed':
        return {
          borderLeft: '4px solid var(--color-success)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)'
        };
      case 'planned':
        return {
          borderLeft: '4px solid var(--color-primary)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)'
        };
      case 'empty':
      default:
        return {};
    }
  };

  const statusStyles = getStatusStyles(mealState);

  const handleMealClick = () => {
    if (mealText) {
      onEdit(mealData, hasActual ? 'actual' : 'planned');
    } else {
      onAdd(day, mealType);
    }
  };

  // Removed handleCompleteClick - unified modal handles completion

  return (
    <div
      className="meal-slot group relative py-3 px-4 transition-all duration-200 cursor-pointer border-b last:border-b-0 hover:bg-opacity-50"
      style={{
        borderBottomColor: 'var(--border-light)', // Use specific border property to avoid conflict
        ...statusStyles,
        backgroundColor: isHovered ? statusStyles.backgroundColor || 'var(--bg-tertiary)' : statusStyles.backgroundColor || 'transparent'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleMealClick}
    >
      {/* Main content row */}
      <div className="flex items-center justify-between min-h-[24px]">
        {/* Left: Icon and meal info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-lg mt-0.5 flex-shrink-0">{mealIcons[mealType]}</span>
          <div className="flex-1 min-w-0">
            {mealText ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {mealText}
                </span>
              </div>
            ) : (
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {mealLabels[mealType]}
              </span>
            )}
          </div>
        </div>

        {/* Right: Action buttons - simplified for unified modal */}
        <div className="flex items-start gap-2 mt-1">
          {/* Add button for empty slots - desktop hover only */}
          {!mealText && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdd(day, mealType);
              }}
              className={`hidden lg:flex items-center justify-center w-7 h-7 rounded-full transition-all ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                backgroundColor: 'var(--text-muted)',
                color: 'white',
                transform: isHovered ? 'scale(1)' : 'scale(0.8)'
              }}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Add button for mobile - always visible for empty slots */}
          {!mealText && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdd(day, mealType);
              }}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-full"
              style={{
                backgroundColor: 'var(--text-muted)',
                color: 'white'
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Day card component
const DayCard = ({ day, mealPlans, onAddMeal, onEditMeal }) => {
  const isToday = new Date().toDateString() === day.toDateString();
  const dayName = day.toLocaleDateString([], { weekday: 'short' });
  const dayNumber = day.getDate();
  const monthName = day.toLocaleDateString([], { month: 'short' });

  const getMealData = (mealType) => {
    return mealPlans.find(plan => {
      // Compare date strings directly (both should now be in YYYY-MM-DD format)
      const planDateString = plan.date; // Already processed to date-only format
      const dayString = formatDateForAPI(day);

      return planDateString === dayString && plan.mealType === mealType;
    });
  };

  return (
    <div className="day-card bg-white rounded-lg border mb-4 overflow-hidden" style={{
      backgroundColor: 'var(--bg-card)',
      borderColor: 'var(--border-light)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Day header - simplified */}
      <div
        className="day-header px-3 sm:px-4 py-3 border-b"
        style={{
          borderColor: 'var(--border-light)',
          backgroundColor: isToday ? 'var(--color-primary-light, #f0f7ff)' : 'transparent'
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div
              className="w-10 h-10 rounded-full flex flex-col items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                backgroundColor: isToday ? 'var(--color-primary)' : 'var(--bg-secondary)',
                color: isToday ? 'white' : 'var(--text-primary)'
              }}
            >
              <span className="text-xs leading-none">{dayName}</span>
              <span className="text-sm leading-none">{dayNumber}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {day.toLocaleDateString([], { weekday: 'long' })}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {monthName} {dayNumber}
              </div>
            </div>
          </div>
          {isToday && (
            <div
              className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              Today
            </div>
          )}
        </div>
      </div>

      {/* Meal slots - no padding container */}
      <div>
        {['breakfast', 'lunch', 'dinner', 'snacks'].map(mealType => (
          <MealSlot
            key={`${formatDateForAPI(day)}-${mealType}`}
            day={day}
            mealType={mealType}
            mealData={getMealData(mealType)}
            onAdd={onAddMeal}
            onEdit={onEditMeal}
          />
        ))}
      </div>
    </div>
  );
};

export default function PlannerPage() {
  const context = useOutletContext();
  const { userToken, activeHomeId } = context || {};

  // State
  const [currentWeekStart, setCurrentWeekStart] = useState(null);
  const [mealPlans, setMealPlans] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUnifiedMealModal, setShowUnifiedMealModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);

  // Initialize current week
  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(sunday);
  }, []);

  // Generate days for current week
  const weekDays = currentWeekStart ? Array.from({ length: 7 }, (_, i) => {
    const day = new Date(currentWeekStart);
    day.setDate(currentWeekStart.getDate() + i);
    return day;
  }) : [];

  // Week days are generated correctly for the current week

  // Navigation functions
  const goToPreviousWeek = () => {
    const prevWeek = new Date(currentWeekStart);
    prevWeek.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(prevWeek);
  };

  const goToNextWeek = () => {
    const nextWeek = new Date(currentWeekStart);
    nextWeek.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(nextWeek);
  };

  // Fetch meal plans
  // Auth headers callback
  const getAuthHeaders = useCallback(() => ({
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }), [userToken]);

  const fetchMealPlans = useCallback(async () => {
    if (!userToken || !activeHomeId || !currentWeekStart) return;

    setIsLoading(true);
    try {
      const endDate = new Date(currentWeekStart);
      endDate.setDate(currentWeekStart.getDate() + 6);

      const response = await fetch(
        `/api/planner/${activeHomeId}?startDate=${formatDateForAPI(currentWeekStart)}&endDate=${formatDateForAPI(endDate)}`,
        {
          headers: getAuthHeaders()
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Fix: Extract date-only string from ISO timestamps to match day comparison format
        const plansWithDates = data.map(plan => ({
          ...plan,
          date: typeof plan.date === 'string' ? plan.date.split('T')[0] : formatDateForAPI(new Date(plan.date))
        }));

        setMealPlans(plansWithDates);
        setError('');
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch meal plans:', response.status, errorText);
        if (response.status === 401) {
          setError('Session expired. Please refresh the page.');
        } else {
          setError('Failed to load meal plans');
        }
        setMealPlans([]);
      }
    } catch (err) {
      console.error('Error fetching meal plans:', err);
      setError('Failed to load meal plans');
      setMealPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, [userToken, activeHomeId, currentWeekStart, getAuthHeaders]);

  // Fetch pantry items
  const fetchPantryItems = useCallback(async () => {
    if (!userToken || !activeHomeId) return;

    try {
      const response = await fetch(`/api/pantry/${activeHomeId}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const items = await response.json();
        setPantryItems(items);
      } else {
        console.error('Failed to fetch pantry items:', response.status);
        setPantryItems([]);
      }
    } catch (err) {
      console.error('Error fetching pantry items:', err);
      setPantryItems([]);
    }
  }, [userToken, activeHomeId, getAuthHeaders]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchMealPlans();
    fetchPantryItems();
  }, [fetchMealPlans, fetchPantryItems]);

  // Event handlers
  const handleAddMeal = (day, mealType) => {
    setSelectedDate(day);
    setSelectedMealType(mealType);
    setEditingMeal(null);
    setShowUnifiedMealModal(true);
  };

  const handleEditMeal = (mealData, section) => {
    setEditingMeal(mealData);
    // Pass date as string to avoid timezone conversion
    setSelectedDate(mealData.date);
    setSelectedMealType(mealData.mealType);
    setShowUnifiedMealModal(true);
  };

  const handleMealSaved = (savedMeal) => {
    if (!savedMeal) {
      // Handle deletion case (savedMeal is null) - remove meal from state immediately
      if (editingMeal && editingMeal.id) {
        setMealPlans(prevPlans => prevPlans.filter(plan => plan.id !== editingMeal.id));
      }
      // Clear selections after deletion
      setSelectedDate(null);
      setSelectedMealType(null);
      setEditingMeal(null);
      return;
    }

    // Update meal plans with the saved meal
    setMealPlans(prevPlans => {
      const updatedPlans = [...prevPlans];

      // For new meals, savedMeal.id might not exist yet, so we also check by date/mealType
      let existingIndex = -1;
      if (savedMeal.id) {
        existingIndex = updatedPlans.findIndex(plan => plan.id === savedMeal.id);
      }

      // If no ID match found, check by date/mealType combination for new meals
      if (existingIndex === -1) {
        const savedMealDate = typeof savedMeal.date === 'string' ? savedMeal.date.split('T')[0] : formatDateForAPI(savedMeal.date);
        existingIndex = updatedPlans.findIndex(plan =>
          plan.date === savedMealDate && plan.mealType === savedMeal.mealType
        );
      }

      // Keep date as string and ensure consistent format (same as API processing)
      const mealWithDateString = {
        ...savedMeal,
        date: typeof savedMeal.date === 'string' ? savedMeal.date.split('T')[0] : formatDateForAPI(savedMeal.date)
      };

      if (existingIndex >= 0) {
        // Update existing meal plan
        updatedPlans[existingIndex] = mealWithDateString;
      } else {
        // Add new meal plan
        updatedPlans.push(mealWithDateString);
      }

      return updatedPlans;
    });

    // Clear selections
    setSelectedDate(null);
    setSelectedMealType(null);
    setEditingMeal(null);
  };

  const handleQuickAddFAB = () => {
    const now = new Date();
    const currentHour = now.getHours();

    // Suggest meal type based on time
    let suggestedMealType = 'snacks';
    if (currentHour < 10) suggestedMealType = 'breakfast';
    else if (currentHour < 15) suggestedMealType = 'lunch';
    else if (currentHour < 21) suggestedMealType = 'dinner';

    setSelectedDate(now);
    setSelectedMealType(suggestedMealType);
    setEditingMeal(null);
    setShowUnifiedMealModal(true);
  };

  // Loading state
  if (isLoading && mealPlans.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <div className="mb-4">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--color-primary)' }}></div>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading meal plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-padding">
      <div className="container-mobile lg:max-w-none lg:px-8">
        {/* Page Header */}
        <div className="animate-fade-in mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            📅 Meal Planner
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Plan and track your meals for the week ahead
          </p>
        </div>

        {/* Week Navigation */}
        <div className="mb-6">
          {currentWeekStart && (
            <div className="flex items-center justify-between">
              <button
                onClick={goToPreviousWeek}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors card-interactive"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="font-medium">Previous</span>
              </button>

              <div className="text-center">
                <div className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                  {currentWeekStart.toLocaleDateString([], { month: 'long', day: 'numeric' })} - {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString([], { month: 'long', day: 'numeric' })}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {currentWeekStart.getFullYear()}
                </div>
              </div>

              <button
                onClick={goToNextWeek}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors card-interactive"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
              >
                <span className="font-medium">Next</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div>
        {error && (
          <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)' }}>
            {error}
          </div>
        )}

        {/* Mobile: Vertical list */}
        <div className="lg:hidden">
          {weekDays.map(day => (
            <DayCard
              key={day.toDateString()}
              day={day}
              mealPlans={mealPlans}
              onAddMeal={handleAddMeal}
              onEditMeal={handleEditMeal}
            />
          ))}
        </div>

        {/* Desktop: Split week across 2 rows for better space utilization */}
        <div className="hidden lg:block">
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {weekDays.slice(0, 4).map(day => (
                <DayCard
                  key={day.toDateString()}
                  day={day}
                  mealPlans={mealPlans}
                  onAddMeal={handleAddMeal}
                  onEditMeal={handleEditMeal}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {weekDays.slice(4, 7).map(day => (
                <DayCard
                  key={day.toDateString()}
                  day={day}
                  mealPlans={mealPlans}
                  onAddMeal={handleAddMeal}
                  onEditMeal={handleEditMeal}
                />
              ))}
            </div>
          </div>
        </div>

        </div>

        {/* Floating Action Button (Mobile) */}
        <button
          className="lg:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: 'var(--color-primary)' }}
          onClick={handleQuickAddFAB}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Unified Meal Modal */}
      <UnifiedMealModal
        isOpen={showUnifiedMealModal}
        onClose={() => {
          setShowUnifiedMealModal(false);
          setSelectedDate(null);
          setSelectedMealType(null);
          setEditingMeal(null);
        }}
        onSave={handleMealSaved}
        meal={editingMeal}
        selectedDate={selectedDate}
        selectedMealType={selectedMealType}
        getAuthHeaders={getAuthHeaders}
        activeHomeId={activeHomeId}
        pantryItems={pantryItems}
      />
    </div>
  );
}