import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import QuickMealModal from '../components/QuickMealModal';
import PlannerRecipeCard from '../components/PlannerRecipeCard';


// Meal slot component
const MealSlot = ({ day, mealType, mealData, onAdd, onEdit }) => {
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

  const hasPlanned = mealData?.planned?.recipeName || mealData?.planned?.description;
  const hasActual = mealData?.actual?.description;

  return (
    <div className="meal-slot border-b" style={{ borderColor: 'var(--border-light)', padding: '12px 16px' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{mealIcons[mealType]}</span>
          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            {mealLabels[mealType]}
          </span>
        </div>
        <button
          onClick={() => onAdd(day, mealType)}
          className="p-1 rounded-md hover:bg-opacity-80 transition-colors"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Planned section */}
      {hasPlanned && (
        <div className="mb-3">
          <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
            PLANNED
          </div>

          {mealData.planned.recipeId || mealData.planned.ingredients ? (
            <PlannerRecipeCard
              recipe={mealData.planned}
              plannedData={mealData.planned}
              isCompact={true}
              onClick={() => onEdit(mealData, 'planned')}
              showIngredientStatus={false}
            />
          ) : (
            <div onClick={() => onEdit(mealData, 'planned')}>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {mealData.planned.recipeName || mealData.planned.description || 'Custom Meal'}
              </div>
              {hasActual && mealData.actual.description === (mealData.planned.recipeName || mealData.planned.description) && (
                <div className="flex items-center mt-1 gap-1" style={{ color: 'var(--color-success)' }}>
                  <span className="text-xs">✓</span>
                  <span className="text-xs">As planned</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actual section */}
      {hasActual ? (
        <div>
          <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
            ACTUAL
          </div>

          {/* Check if it was made as planned */}
          {hasPlanned && mealData.actual.description === (mealData.planned.recipeName || mealData.planned.description) ? (
            <div
              className="inline-block px-3 py-1 rounded-full text-xs font-medium cursor-pointer"
              style={{
                backgroundColor: 'var(--color-success)',
                color: 'white'
              }}
              onClick={() => onEdit(mealData, 'actual')}
            >
              Made as planned
            </div>
          ) : (
            <div
              className="cursor-pointer"
              onClick={() => onEdit(mealData, 'actual')}
            >
              <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {mealData.actual.description}
              </div>
              {mealData.actual.loggedAt && (
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Logged {new Date(mealData.actual.loggedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : hasPlanned && (
        <div>
          <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
            ACTUAL
          </div>
          <button
            onClick={() => onEdit(mealData, 'actual')}
            className="text-sm px-3 py-1 rounded-full border-2 border-dashed transition-colors hover:bg-opacity-10"
            style={{
              borderColor: 'var(--color-primary)',
              color: 'var(--color-primary)',
              backgroundColor: 'transparent'
            }}
          >
            Made as planned?
          </button>
        </div>
      )}

      {/* Empty state */}
      {!hasPlanned && !hasActual && (
        <button
          onClick={() => onAdd(day, mealType)}
          className="w-full p-3 rounded-lg border-2 border-dashed text-sm transition-colors hover:bg-opacity-50"
          style={{
            borderColor: 'var(--border-medium)',
            color: 'var(--text-muted)',
            backgroundColor: 'transparent'
          }}
        >
          Add {mealLabels[mealType].toLowerCase()}
        </button>
      )}
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
      const planDate = plan.date instanceof Date ? plan.date : new Date(plan.date);
      return planDate.toDateString() === day.toDateString() &&
        plan.mealType === mealType;
    });
  };

  return (
    <div className="day-card bg-card rounded-lg shadow-sm mb-4" style={{ backgroundColor: 'var(--bg-card)' }}>
      {/* Day header */}
      <div
        className="day-header p-4 border-b"
        style={{ borderColor: 'var(--border-light)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-full flex flex-col items-center justify-center text-sm font-bold ${
                isToday ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: isToday ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                color: isToday ? 'white' : 'var(--text-primary)'
              }}
            >
              <span className="text-xs">{dayName}</span>
              <span>{dayNumber}</span>
            </div>
            <div>
              <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {day.toLocaleDateString([], { weekday: 'long' })}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {monthName} {dayNumber}
              </div>
            </div>
          </div>
          {isToday && (
            <div
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              Today
            </div>
          )}
        </div>
      </div>

      {/* Meal slots */}
      <div>
        {['breakfast', 'lunch', 'dinner', 'snacks'].map(mealType => (
          <MealSlot
            key={mealType}
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
  const [showQuickMealModal, setShowQuickMealModal] = useState(false);
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
        `/api/planner/${activeHomeId}?startDate=${currentWeekStart.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: getAuthHeaders()
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Convert date strings back to Date objects
        const plansWithDates = data.map(plan => ({
          ...plan,
          date: new Date(plan.date)
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
    setShowQuickMealModal(true);
  };

  const handleEditMeal = (mealData, section) => {
    setEditingMeal(mealData);
    setSelectedDate(new Date(mealData.date));
    setSelectedMealType(mealData.mealType);
    setShowQuickMealModal(true);
  };

  const handleMealSaved = (savedMeal) => {
    // Update meal plans with the saved meal
    setMealPlans(prevPlans => {
      const updatedPlans = [...prevPlans];
      const existingIndex = updatedPlans.findIndex(plan => plan.id === savedMeal.id);

      // Ensure the saved meal has a proper Date object
      const mealWithDateObject = {
        ...savedMeal,
        date: savedMeal.date instanceof Date ? savedMeal.date : new Date(savedMeal.date)
      };

      if (existingIndex >= 0) {
        // Update existing meal plan
        updatedPlans[existingIndex] = mealWithDateObject;
      } else {
        // Add new meal plan
        updatedPlans.push(mealWithDateObject);
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
    setShowQuickMealModal(true);
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

        {/* Desktop: Grid layout (TODO: Implement 2-week view) */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-7 gap-4">
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

      {/* Quick Meal Modal */}
      <QuickMealModal
        isOpen={showQuickMealModal}
        onClose={() => {
          setShowQuickMealModal(false);
          setSelectedDate(null);
          setSelectedMealType(null);
          setEditingMeal(null);
        }}
        onSave={handleMealSaved}
        selectedDate={selectedDate}
        selectedMealType={selectedMealType}
        initialData={editingMeal}
        getAuthHeaders={getAuthHeaders}
        activeHomeId={activeHomeId}
        pantryItems={pantryItems}
      />
    </div>
  );
}