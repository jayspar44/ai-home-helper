# Roscoe Meal Planner - Design Update Guide

## Overview
Update the existing Meal Planner page design to match the new mockup. The functionality is already implemented - this is a visual/UX redesign focusing on:
- Progressive disclosure (only show planned meals, not empty slots)
- Improved desktop layout with functional sidebar
- Mini calendar navigation
- Better responsive behavior

## Design Reference
See the attached mockup file: `meal-planner-updated-option1.html`

This shows both mobile and desktop layouts with:
- Mobile: Vertical feed with mini calendar at top
- Desktop: Sidebar with calendar + stats, main feed area with 2-column layout

## What's Changing

### Current Design Issues
- Shows all empty meal slots (breakfast, lunch, dinner, snacks) for every day
- Desktop has wasted space on the left
- Hard to scan and see what's actually planned
- No calendar overview

### New Design Goals
- **Progressive disclosure**: Only show meals that are actually planned
- **Desktop sidebar**: Calendar, stats, quick actions, upcoming meals
- **Mini calendar**: Visual overview with dots showing which days have meals
- **Better information hierarchy**: Easier to see what's planned at a glance
- **Maintain existing modals**: For now, all existing modals should continue to work e.g. adding a meal, editing a meal, completing a meal should all work and use the current modal design

## Component Updates Needed

### 1. MiniCalendar Component (NEW)
**Location**: Mobile header + Desktop sidebar

**Structure**:
```jsx
<div className="mini-calendar">
  <div className="mini-calendar-header">
    <div className="mini-calendar-month">October 2025</div>
    <div className="mini-calendar-nav">
      <button>‹</button>
      <button>›</button>
    </div>
  </div>
  <div className="mini-calendar-grid">
    {/* Day labels: S M T W T F S */}
    {/* Day cells with dots for meals */}
  </div>
</div>
```

**Features**:
- 7-column grid (Sun-Sat)
- Days with meals show green dots below the number (max 4 dots visible)
- Today highlighted with green background
- Click day to scroll feed to that date
- Month navigation arrows

**Styling** (key points):
- Day cells: aspect-ratio 1:1, 13px font
- Green dots: 4px circles, positioned at bottom of cell
- Today background: #4CAF50
- Hover state on days: #2a2a2a background

### 2. Desktop Sidebar (NEW)
**Location**: Left side on desktop (≥768px), hidden on mobile

**Width**: 320px

**Sections** (top to bottom):
1. **Title**: "📅 Meal Planner"
2. **Quick Stats**: 2-column grid showing:
   - "Meals Planned" count for current week
   - "Days Covered" count of unique days with meals
3. **Mini Calendar**: Full month view with meal indicators
4. **Quick Actions**: "+ Add Meal" button (opens add modal)
5. **Next Up**: Shows next 2 upcoming meals with emoji, name, time context

**Styling**:
- Background: #0f0f0f
- Border-right: 1px solid #2a2a2a
- Padding: 30px 20px
- Stat cards: #252525 background, green value text
- Section titles: 12px, uppercase, #666

### 3. MealFeed Component (UPDATE)
**Changes**:
- Remove pre-rendered empty slots for breakfast/lunch/dinner/snacks
- Only render `DaySection` components for days that have at least one meal
- Desktop: 2-column grid layout
- Mobile: Single column

**Empty Day State**:
When a day has no meals, show:
```jsx
<div className="empty-day">
  + Plan meals for [Day Name]
</div>
```
- Dashed border, clickable
- Opens add meal modal with that date pre-selected

**Desktop Layout**:
```css
.desktop-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}
```

### 4. DaySection Component (UPDATE)
**Current**: Shows all 4 meal type slots even if empty
**New**: Only shows meals that exist, no empty slots

**Structure**:
```jsx
<div className="day-section">
  <div className="day-header">
    <div>
      <span className="day-title">Monday</span>
      <span className="day-date">Oct 27</span>
    </div>
    <button className="add-meal-btn">+ Add</button>
  </div>
  {meals.length > 0 ? (
    meals.map(meal => <MealCard meal={meal} />)
  ) : (
    <div className="empty-day">+ Plan meals for Monday</div>
  )}
</div>
```

### 5. MealCard Component (UPDATE)
**Changes**:
- Simplify icon: Remove gradient backgrounds, use simple #2a2a2a background
- Emoji should be larger and centered in icon box
- Keep meal type label small and subtle

**Structure**:
```jsx
<div className="meal-card">
  <div className="meal-icon">{meal.emoji}</div>
  <div className="meal-info">
    <div className="meal-type">{meal.mealType}</div>
    <div className="meal-name">{meal.name}</div>
  </div>
</div>
```

**Icon Styling**:
- 50x50px square
- Border-radius: 8px
- Background: #2a2a2a (flat, no gradient)
- Emoji: 28px font size
- Centered with flexbox

### 6. Page Header (UPDATE)
**Mobile**: Add MiniCalendar widget after title, before feed starts
**Desktop**: Move to sidebar instead

### 7. Floating Add Button (KEEP on mobile)
**Current**: Already exists
**Ensure**: Only shows on mobile (<768px), hidden on desktop

### 8. Week Navigation (UPDATE)
**Mobile**: Keep Previous/Next buttons in header
**Desktop**: Can move to sidebar or keep above feed - designer's choice

## Styling Updates

### Color Palette (no changes)
Use existing Roscoe dark theme colors:
- Background: #0f0f0f
- Surface: #1a1a1a  
- Surface elevated: #252525
- Border: #2a2a2a
- Text primary: #ffffff
- Text secondary: #e0e0e0
- Text tertiary: #888888
- Accent: #4CAF50
- Accent hover: #45a049

### Key Style Changes

**Meal Icons**:
```css
.meal-icon {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  background: #2a2a2a; /* No gradients */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}
```

**Empty Day State**:
```css
.empty-day {
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 14px;
  border: 1px dashed #2a2a2a;
  border-radius: 8px;
  cursor: pointer;
}

.empty-day:hover {
  border-color: #4CAF50;
  color: #4CAF50;
}
```

**Desktop Layout**:
```css
@media (min-width: 768px) {
  .meal-planner-layout {
    display: flex;
    height: 100vh;
  }
  
  .desktop-sidebar {
    width: 320px;
    background: #0f0f0f;
    border-right: 1px solid #2a2a2a;
    overflow-y: auto;
  }
  
  .desktop-main {
    flex: 1;
    overflow-y: auto;
    padding: 30px;
  }
  
  .desktop-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
  }
}
```

## Implementation Approach

### Step 1: Create MiniCalendar Component
- New component file
- Takes `meals` data and displays month grid
- Calculates which days have meals and shows dots
- Handles month navigation
- Emits date click events

### Step 2: Create Desktop Sidebar Component
- New component wrapping MiniCalendar + stats + actions
- Calculate stats from meals data:
  - Count meals in current week
  - Count unique days with meals
- "Next Up" shows next 2 chronologically upcoming meals
- Only renders on desktop (CSS media query or conditional render)

### Step 3: Update MealFeed Component
- Remove logic that pre-renders empty meal slots
- Filter days to only show those with meals OR show empty state
- Add 2-column grid on desktop
- Keep single column on mobile

### Step 4: Update DaySection Component  
- Remove empty slot rendering
- If no meals for day, show empty state div
- Keep "+ Add" button in header

### Step 5: Simplify MealCard Styling
- Remove gradient CSS classes
- Update icon background to flat #2a2a2a
- Increase emoji size to 28px

### Step 6: Update Page Layout
- Add sidebar on desktop
- Move/add MiniCalendar to mobile header
- Adjust responsive breakpoints

### Step 7: Test Responsive Behavior
- Test at 768px breakpoint
- Verify sidebar shows/hides appropriately
- Test feed 2-column on desktop, 1-column on mobile
- Test all interactions (clicks, navigation)

## Key Behavior Notes

### Progressive Disclosure
- Don't pre-render meal slots
- If a day has zero meals, show one empty state card
- If a day has 1-4 meals, show only those meals
- Users can still add any meal type at any time via "+ Add" button

### Mini Calendar Dots
- Each meal adds one dot (max 4 dots shown even if >4 meals)
- Dots are purely visual indicators
- Clicking a day scrolls to it in the feed (or filters to show just that day)

### Stats Calculation
Example for "This Week":
- If Mon has 2 meals, Tue has 0, Wed has 3, Thu has 1, Fri-Sun have 0
- "Meals Planned": 6
- "Days Covered": 3 (Mon, Wed, Thu)

### Next Up Section
- Shows next 2 upcoming meals chronologically from current date/time
- If it's morning and lunch is planned today, show lunch first
- Format: "🥗 Caesar Salad / Today, Lunch"
- Format: "🍝 Spaghetti / Tomorrow"

## Files to Update
Based on typical React structure, you'll likely need to update:
- `pages/Planner.jsx` (or similar) - main page layout
- `components/MealFeed.jsx` - feed rendering logic  
- `components/DaySection.jsx` - day grouping
- `components/MealCard.jsx` - individual meal card
- Create: `components/MiniCalendar.jsx` - new calendar widget
- Create: `components/DesktopSidebar.jsx` - new sidebar
- `styles/planner.css` (or similar) - update styles

## Testing Checklist

Visual/UX Testing:
- [ ] Desktop shows sidebar with all sections
- [ ] Mini calendar shows correct month
- [ ] Mini calendar dots appear on days with meals
- [ ] Today is highlighted in calendar
- [ ] Stats calculate correctly for current week
- [ ] "Next Up" shows correct upcoming meals
- [ ] Feed only shows days with meals + empty states
- [ ] Empty day state is clickable and opens add modal
- [ ] Desktop feed shows 2-column layout
- [ ] Mobile feed shows single column
- [ ] Mobile shows mini calendar in header
- [ ] Floating + button only shows on mobile
- [ ] Meal icons use simple flat background
- [ ] Meal type labels are subtle/small
- [ ] Hover states work on clickable elements
- [ ] Responsive breakpoint at 768px works smoothly
- [ ] No layout shift when toggling between views

Functional Testing (should already work):
- [ ] Can still add meals
- [ ] Can still edit meals  
- [ ] Can still delete meals
- [ ] Week navigation still works
- [ ] All existing functionality preserved

## Questions for Implementation

1. What's the current file structure for the planner page?
2. Are you using CSS modules, styled-components, or plain CSS?
3. Is there a shared component library I should use for buttons, etc?
4. Should the calendar click scroll to the day or filter to show only that day?
5. Do you want the week navigation to stay in the header or move to sidebar on desktop?

---

The mockup HTML file has all the exact styling, spacing, and structure you need. This guide focuses on translating that design to your existing React components. Let me know if you need clarification on any part!