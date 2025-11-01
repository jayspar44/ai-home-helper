import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { Plus } from 'lucide-react';
import UnifiedMealModal from '../components/UnifiedMealModal';
import PlannerSidebar from '../components/PlannerSidebar';
import DaySection from '../components/DaySection';
import WeekView from '../components/WeekView';
import logger from '../utils/logger';
import { formatDateForAPI, getMealTypeByTime } from '../utils/dateUtils';
import { MEAL_FETCH_WINDOW, MEAL_TIME_BOUNDARIES } from '../constants/plannerConstants';
import '../styles/Planner.css';


export default function PlannerPage() {
  const context = useOutletContext();
  const { userToken, activeHomeId } = context || {};

  // State
  const [currentWeekStart, setCurrentWeekStart] = useState(null);
  const [calendarWeekStart, setCalendarWeekStart] = useState(null); // Track which week calendar is showing
  const [mealPlans, setMealPlans] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUnifiedMealModal, setShowUnifiedMealModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);

  // Refs for day sections (for scrolling)
  const daySectionRefs = useRef({});

  // Initialize current week
  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(sunday);
    setCalendarWeekStart(sunday); // Initialize calendar to current week too
  }, []);

  // Generate days for current week
  const weekDays = currentWeekStart ? Array.from({ length: 7 }, (_, i) => {
    const day = new Date(currentWeekStart);
    day.setDate(currentWeekStart.getDate() + i);
    return day;
  }) : [];

  // Handle calendar week change (when navigating with arrows)
  const handleCalendarWeekChange = (weekStart) => {
    setCalendarWeekStart(weekStart);
    setCurrentWeekStart(weekStart); // Also update feed view to show selected week
  };

  // Handle calendar day click - update feed to show that week and scroll to day
  const handleDayClick = (date) => {
    // Calculate the start of the week for the clicked date
    const dayOfWeek = date.getDay();
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    // Update the main feed's week
    setCurrentWeekStart(weekStart);

    // After state updates, scroll to the day (use setTimeout to ensure DOM is updated)
    setTimeout(() => {
      const dateString = formatDateForAPI(date);
      const daySection = daySectionRefs.current[dateString];
      if (daySection) {
        daySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Auth headers callback
  const getAuthHeaders = useCallback(() => ({
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }), [userToken]);

  // Fetch meal plans
  const fetchMealPlans = useCallback(async () => {
    if (!userToken || !activeHomeId || !currentWeekStart) return;

    setIsLoading(true);
    try {
      // Fetch ±4 weeks of data so calendar widget can show dots for browsed weeks
      const startDate = new Date(currentWeekStart);
      startDate.setDate(currentWeekStart.getDate() - 28); // 4 weeks before

      const endDate = new Date(currentWeekStart);
      endDate.setDate(currentWeekStart.getDate() + 48); // 6 days current week + 42 days (6 weeks after)

      const response = await fetch(
        `/api/planner/${activeHomeId}?startDate=${formatDateForAPI(startDate)}&endDate=${formatDateForAPI(endDate)}`,
        {
          headers: getAuthHeaders()
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Extract date-only string from ISO timestamps
        const plansWithDates = data.map(plan => ({
          ...plan,
          date: typeof plan.date === 'string' ? plan.date.split('T')[0] : formatDateForAPI(new Date(plan.date))
        }));

        setMealPlans(plansWithDates);
        setError('');
      } else {
        const errorText = await response.text();
        logger.error('Failed to fetch meal plans:', response.status, errorText);
        if (response.status === 401) {
          setError('Session expired. Please refresh the page.');
        } else {
          setError('Failed to load meal plans');
        }
        setMealPlans([]);
      }
    } catch (err) {
      logger.error('Error fetching meal plans:', err);
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
        logger.error('Failed to fetch pantry items:', response.status);
        setPantryItems([]);
      }
    } catch (err) {
      logger.error('Error fetching pantry items:', err);
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

  const handleEditMeal = (mealData, _section) => {
    setEditingMeal(mealData);
    setSelectedDate(mealData.date);
    setSelectedMealType(mealData.mealType);
    setShowUnifiedMealModal(true);
  };

  const handleCompleteMeal = async (mealData) => {
    if (!mealData || !mealData.id) return;

    try {
      const updatedMeal = {
        ...mealData,
        completed: true,
        completedDate: formatDateForAPI(new Date()),
        completionType: 'as-planned',
        actual: {
          recipeName: mealData.planned?.recipeName,
          description: mealData.planned?.description || mealData.planned?.recipeName
        }
      };

      const response = await fetch(`/api/planner/${activeHomeId}/${mealData.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedMeal)
      });

      if (response.ok) {
        const savedMeal = await response.json();
        setMealPlans(prevPlans => {
          const updatedPlans = [...prevPlans];
          const existingIndex = updatedPlans.findIndex(plan => plan.id === savedMeal.id);

          if (existingIndex >= 0) {
            const mealWithDateString = {
              ...savedMeal,
              date: typeof savedMeal.date === 'string' ? savedMeal.date.split('T')[0] : formatDateForAPI(savedMeal.date)
            };
            updatedPlans[existingIndex] = mealWithDateString;
          }

          return updatedPlans;
        });
      } else {
        logger.error('Failed to complete meal:', response.status);
      }
    } catch (err) {
      logger.error('Error completing meal:', err);
    }
  };

  const handleMealSaved = (savedMeal) => {
    if (!savedMeal) {
      // Handle deletion case
      if (editingMeal && editingMeal.id) {
        setMealPlans(prevPlans => prevPlans.filter(plan => plan.id !== editingMeal.id));
      }
      setSelectedDate(null);
      setSelectedMealType(null);
      setEditingMeal(null);
      return;
    }

    // Update meal plans with the saved meal
    setMealPlans(prevPlans => {
      const updatedPlans = [...prevPlans];

      let existingIndex = -1;
      if (savedMeal.id) {
        existingIndex = updatedPlans.findIndex(plan => plan.id === savedMeal.id);
      }

      if (existingIndex === -1) {
        const savedMealDate = typeof savedMeal.date === 'string' ? savedMeal.date.split('T')[0] : formatDateForAPI(savedMeal.date);
        existingIndex = updatedPlans.findIndex(plan =>
          plan.date === savedMealDate && plan.mealType === savedMeal.mealType
        );
      }

      const mealWithDateString = {
        ...savedMeal,
        date: typeof savedMeal.date === 'string' ? savedMeal.date.split('T')[0] : formatDateForAPI(savedMeal.date)
      };

      if (existingIndex >= 0) {
        updatedPlans[existingIndex] = mealWithDateString;
      } else {
        updatedPlans.push(mealWithDateString);
      }

      return updatedPlans;
    });

    setSelectedDate(null);
    setSelectedMealType(null);
    setEditingMeal(null);
  };

  const handleQuickAddFAB = () => {
    const now = new Date();
    const currentHour = now.getHours();

    let suggestedMealType = 'snacks';
    if (currentHour < 10) suggestedMealType = 'breakfast';
    else if (currentHour < 15) suggestedMealType = 'lunch';
    else if (currentHour < 21) suggestedMealType = 'dinner';

    setSelectedDate(now);
    setSelectedMealType(suggestedMealType);
    setEditingMeal(null);
    setShowUnifiedMealModal(true);
  };

  const handleSidebarAddMeal = () => {
    const now = new Date();
    const currentHour = now.getHours();

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
            <div className="btn-icon-desktop border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--color-primary)' }}></div>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading meal plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-padding">
      <div className="container-mobile lg:max-w-none lg:px-8">
        {/* Page Header - Full Width */}
        <div className="animate-fade-in mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            📅 Meal Planner
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Plan and track your meals for the week ahead
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)' }}>
            {error}
          </div>
        )}

        {/* Main content: 2-column grid on desktop, single column on mobile */}
        <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-8">
          {/* Sidebar - Desktop Only */}
          <div className="desktop-only">
            <PlannerSidebar
              mealPlans={mealPlans}
              currentWeekStart={currentWeekStart}
              calendarWeekStart={calendarWeekStart}
              onAddMeal={handleSidebarAddMeal}
              onDayClick={handleDayClick}
              onCalendarWeekChange={handleCalendarWeekChange}
              onEditMeal={handleEditMeal}
            />
          </div>

          {/* Main Feed */}
          <div>
            {/* Week View Calendar - Mobile Only */}
            <div className="lg:hidden mb-6">
              <WeekView
                mealPlans={mealPlans}
                initialWeekStart={currentWeekStart}
                onDayClick={handleDayClick}
              />
            </div>

            {/* Day Sections Feed - Single column on mobile, 2-column on desktop */}
            <div className="lg:desktop-columns">
              {weekDays.map(day => (
                <DaySection
                  key={day.toDateString()}
                  ref={(el) => {
                    if (el) {
                      daySectionRefs.current[formatDateForAPI(day)] = el;
                    }
                  }}
                  day={day}
                  mealPlans={mealPlans}
                  onAddMeal={handleAddMeal}
                  onEditMeal={handleEditMeal}
                  onCompleteMeal={handleCompleteMeal}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button (Mobile Only) */}
      <button
        className="mobile-only fixed bottom-20 right-4 btn-icon-fab rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: 'var(--color-primary)' }}
        onClick={handleQuickAddFAB}
        aria-label="Add new meal"
      >
        <Plus className="icon-large" />
      </button>

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
