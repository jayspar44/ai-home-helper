# Recipe Generator Redesign: Implementation Tracking

**Status**: 🟡 In Progress
**Started**: 2025-11-02
**Objective**: Merge two recipe generation flows into one unified progressive disclosure interface

---

## Overview

### Goals
- ✅ Merge "Ask Roscoe" and "Start Customizing" into single flow
- ✅ Implement 3-level progressive disclosure (clean → more options → advanced)
- ✅ Preserve all existing AI features (pantry matching, variety logic, shopping list)
- ✅ Update terminology: "meals" not "recipes", "No Constraints" not "unconstrained"
- ✅ Implement settings summary showing active options
- ✅ Update expiring items threshold from 3 to 7 days
- ✅ Default to Pantry + Shopping mode with expiring items prioritized

### UI Structure Changes

**BEFORE (2 flows)**:
- Menu View → Choose "Ask Roscoe" OR "Start Customizing"
- Each flow has separate options and API endpoints
- Different AI prompt strategies

**AFTER (1 flow)**:
```
Level 1 (Always Visible):
  - Number of meals [+/-]
  - Settings summary (dynamic)
  - Generate Meals button
  - "Show more options" link

Level 2 (Expandable):
  - Quick meals checkbox
  - Pantry mode [Pantry Only | Pantry + Shopping | No Constraints]
  - Use expiring items first checkbox
  - Main prompt textarea
  - "Show even more options" link

Level 3 (Expandable):
  - Preferences (multi-select)
  - Cuisines (multi-select)
  - Proteins (multi-select)
  - Servings [+/-]
  - Pantry Integration (collapsible ingredient picker)
```

---

## Implementation Checklist

### Phase 1: Backend Updates

#### 1.1 Update AI Service Constants
**File**: `backend/services/recipeAI.js`

- [ ] Update `EXPIRING_SOON_THRESHOLD_DAYS` from 3 to 7 (Line ~15)
  - Current: `const EXPIRING_SOON_THRESHOLD_DAYS = 3;`
  - New: `const EXPIRING_SOON_THRESHOLD_DAYS = 7;`

#### 1.2 Create Unified AI Generation Function
**File**: `backend/services/recipeAI.js`

- [ ] Create `generateUnifiedRecipe(options, genAI, logger)` function
  - [ ] Accept unified options object:
    ```javascript
    {
      homeId,
      numberOfMeals, // renamed from numberOfRecipes
      quickMealsOnly,
      pantryMode, // 'pantry_only' | 'pantry_plus_shopping' | 'no_constraints'
      prioritizeExpiring, // default true
      mainPrompt,
      preferences,
      cuisines,
      proteins,
      servingSize,
      specificIngredients
    }
    ```
  - [ ] Merge prompt construction from both `generateRoscoesChoiceRecipe` and `generateCustomRecipe`
  - [ ] **CRITICAL**: Preserve meal variety logic from lines 35-45 (avoid repeating pantry items)
  - [ ] Handle pantry mode:
    - `pantry_only`: Use ONLY pantry items
    - `pantry_plus_shopping` (default): Prefer pantry, supplement with shopping
    - `no_constraints`: Ignore pantry completely (don't fetch)
  - [ ] Apply `prioritizeExpiring` (default true) for 7-day threshold
  - [ ] Implement smart constraint merging
  - [ ] Maintain quality scoring (MIN_QUALITY_SCORE = 50)
  - [ ] Maintain retry logic (MAX_AI_RETRY_ATTEMPTS = 3)
  - [ ] Handle AI refusals gracefully
  - [ ] Generate multiple meals in parallel if numberOfMeals > 1
  - [ ] Apply variation family UUID grouping

#### 1.3 Create Unified API Endpoint
**File**: `backend/server.js`

- [ ] Add new endpoint: `POST /api/generate-recipe/unified`
  - [ ] Apply `checkAuth` middleware
  - [ ] Apply `aiRateLimiter` middleware
  - [ ] Validate request body
  - [ ] Set defaults:
    - `numberOfMeals`: 3
    - `pantryMode`: 'pantry_plus_shopping'
    - `prioritizeExpiring`: true
    - `servingSize`: 2
    - `quickMealsOnly`: false
  - [ ] Fetch pantry items (unless pantryMode === 'no_constraints')
  - [ ] Call `generateUnifiedRecipe()`
  - [ ] Add metadata: `createdBy`, `createdAt`, `generationMode`, `variationFamily`
  - [ ] Handle errors and refusals
  - [ ] Return response with recipes

- [ ] Add deprecation notices to old endpoints:
  - `POST /api/generate-recipe/roscoes-choice` (Line ~598)
  - `POST /api/generate-recipe/customize` (Line ~715)

#### 1.4 Backend Testing
- [ ] Test with Postman/curl:
  - [ ] Default behavior (Pantry + Shopping, expiring=true)
  - [ ] Pantry Only mode (with items)
  - [ ] Pantry Only mode (empty pantry → AI refusal)
  - [ ] No Constraints mode (pantry not fetched)
  - [ ] Multiple meals (2, 3, 5) with variety verification
  - [ ] All constraint combinations
  - [ ] Edge cases (1 meal, 10 servings, etc.)

---

### Phase 2: Frontend Components

#### 2.1 Create NumberControl Component
**File**: `frontend/src/components/recipe/NumberControl.js` (NEW)

- [ ] Create reusable +/- control component
  - [ ] Props: `value`, `min`, `max`, `label`, `onChange`
  - [ ] Render: `[ - ] {value} {label} [ + ]`
  - [ ] Disable buttons at min/max bounds
  - [ ] Accessibility: aria-label, keyboard support
  - [ ] Mobile: 44px min touch target
  - [ ] Styling: Use design tokens

#### 2.2 Create SettingsSummary Component
**File**: `frontend/src/components/recipe/SettingsSummary.js` (NEW)

- [ ] Create dynamic settings summary component
  - [ ] Props: all current option states
  - [ ] Generate summary text (2-4 items, bullet-separated)
  - [ ] Priority order:
    1. Pantry mode (always)
    2. Expiring items (if true and not no_constraints)
    3. Quick meals (if true)
    4. Servings (if not default 2)
    5. Cuisines (limit to 2, then "+X more")
    6. Proteins (limit to 2)
    7. Preferences (if selected)
  - [ ] Styling: Small text (0.75rem), muted color
  - [ ] Mobile: Allow text wrap (max 3 lines)

#### 2.3 Create EmptyPantryBanner Component
**File**: `frontend/src/components/recipe/EmptyPantryBanner.js` (NEW)

- [ ] Create info banner component
  - [ ] Props: `onDismiss`
  - [ ] Render: Info icon, message, close button
  - [ ] Message: "Your pantry is empty, so we've switched to No Constraints mode..."
  - [ ] Styling: Info color (blue/gray), left accent bar (3px)
  - [ ] Dismissible with X button

---

### Phase 3: Frontend Restructure

#### 3.1 Update State Management
**File**: `frontend/src/pages/RecipeGenerator.js`

- [ ] Remove/update state variables:
  - [ ] Remove `expandedSection` (no more two flows)
  - [ ] Add `showMoreOptions` (boolean, default false)
  - [ ] Add `showAdvancedOptions` (boolean, default false)
  - [ ] Rename `numberOfRecipes` → `numberOfMeals` (default 3)
  - [ ] Update `servingSize` default to 2
  - [ ] Update `pantryMode` values and default to 'pantry_plus_shopping'
  - [ ] Add/update `prioritizeExpiring` (default true)
  - [ ] Add/update `quickMealsOnly` (default false)
  - [ ] Rename `aiPrompt` → `mainPrompt`
  - [ ] Update `customizePantryMode` → merge into `pantryMode`

#### 3.2 Implement Level 1 UI
**File**: `frontend/src/pages/RecipeGenerator.js`

- [ ] Build clean, minimal Level 1:
  - [ ] Heading: "Ask Roscoe" with sparkle icon
  - [ ] Subheading text
  - [ ] NumberControl for meals (1-5, default 3)
  - [ ] SettingsSummary component (dynamic)
  - [ ] Generate Meals button (always enabled)
  - [ ] "Show more options" link (toggle Level 2)

#### 3.3 Implement Level 2 UI (Moved Options)
**File**: `frontend/src/pages/RecipeGenerator.js`

- [ ] Build expandable Level 2:
  - [ ] Quick meals checkbox
  - [ ] Pantry mode button group (3 buttons with icons)
    - [ ] Pantry Only 🥘
    - [ ] Pantry + Shopping 🛒 (default selected)
    - [ ] No Constraints 🌍
  - [ ] Use expiring items first checkbox (default checked, hide if no_constraints)
  - [ ] Main prompt textarea ("What would you like to cook today?")
  - [ ] "Show even more options" link (toggle Level 3)

#### 3.4 Implement Level 3 UI
**File**: `frontend/src/pages/RecipeGenerator.js`

- [ ] Build expandable Level 3 (5 sections):
  - [ ] Preferences: Multi-select buttons (Quick, Healthy, Comfort, Easy)
  - [ ] Cuisines: Multi-select buttons (8 options)
  - [ ] Proteins: Multi-select buttons (8 options)
  - [ ] Servings: NumberControl (1-10, default 2)
  - [ ] Pantry Integration: Collapsible ingredient picker (hide if no_constraints)

#### 3.5 Implement Progressive Disclosure
**File**: `frontend/src/pages/RecipeGenerator.js`

- [ ] Add expand/collapse logic:
  - [ ] "Show more options" → toggle `showMoreOptions`, update link text
  - [ ] "Show even more options" → toggle `showAdvancedOptions`, update link text
  - [ ] Smooth animations (CSS transitions)
  - [ ] Remember state (don't collapse on re-render)

#### 3.6 Implement Empty Pantry Logic
**File**: `frontend/src/pages/RecipeGenerator.js`

- [ ] Add empty pantry detection:
  - [ ] Check pantry items length
  - [ ] Auto-switch `pantryMode` to 'no_constraints'
  - [ ] Show EmptyPantryBanner component
  - [ ] Hide "Use expiring items" checkbox
  - [ ] Hide "Pantry Integration" section
  - [ ] Update settings summary
  - [ ] Allow manual mode switch (show validation if needed)

#### 3.7 Update API Integration
**File**: `frontend/src/pages/RecipeGenerator.js`

- [ ] Update recipe generation function:
  - [ ] Change endpoint to `/api/generate-recipe/unified`
  - [ ] Update request body mapping (use `numberOfMeals`, new structure)
  - [ ] Send defaults explicitly (pantryMode, prioritizeExpiring, etc.)
  - [ ] Handle response (same format as before)
  - [ ] Update error handling

#### 3.8 Update Results View
**File**: `frontend/src/pages/RecipeGenerator.js`

- [ ] Update recipe display:
  - [ ] Use "Meal X of Y" terminology
  - [ ] Hide pantry section if pantryMode was 'no_constraints'
  - [ ] Add generation metadata (use settings summary format)
  - [ ] Keep all existing features (navigation, save, schedule, feedback)

#### 3.9 Terminology Updates
**File**: `frontend/src/pages/RecipeGenerator.js`

- [ ] Global find/replace:
  - [ ] "recipe" → "meal" (in user-facing text only, not code)
  - [ ] "recipes" → "meals" (in user-facing text)
  - [ ] "unconstrained" → "No Constraints" (in UI labels)
  - [ ] "ignore_pantry" → "no_constraints" (in code)

---

### Phase 4: Mobile Optimization

#### 4.1 Responsive Design
**File**: `frontend/src/pages/RecipeGenerator.js`

- [ ] Mobile (≤768px):
  - [ ] Level 1: Stack vertically, larger touch targets
  - [ ] Settings summary: Allow text wrap (max 3 lines)
  - [ ] Generate button: Full width, sticky at bottom
  - [ ] Level 2: Pantry mode buttons (vertical stack or dropdown)
  - [ ] Level 3: Single column, simplified grids
  - [ ] Servings control: Center aligned

- [ ] Web (>768px):
  - [ ] Level 1: Centered layout
  - [ ] Level 2: 2-column grid for options
  - [ ] Level 3: 2-3 column grids

#### 4.2 Mobile Testing
- [ ] Test on iOS Safari
- [ ] Test on Chrome Android
- [ ] Verify touch targets (min 44px)
- [ ] Verify text input doesn't cause zoom (16px min font)
- [ ] Test sticky button behavior
- [ ] Test progressive disclosure animations

---

### Phase 5: Comprehensive Testing

#### 5.1 Frontend Tests
- [ ] Default state (Level 1 visible, 2/3 collapsed)
- [ ] Settings summary accuracy (all combinations)
- [ ] Progressive disclosure (expand/collapse animations)
- [ ] +/- controls (boundaries, disabled states)
- [ ] Pantry mode switching (all 3 modes)
- [ ] Empty pantry flow (auto-switch, banner, dismiss)
- [ ] Non-empty pantry (default behavior)
- [ ] Mobile responsive (all levels, touch targets)
- [ ] Web responsive (grid layouts, spacing)

#### 5.2 Backend Tests
- [ ] Default behavior (Pantry + Shopping, expiring=true)
- [ ] No Constraints mode (pantry not fetched)
- [ ] Pantry Only (empty → refusal, non-empty → success)
- [ ] Pantry + Shopping (optimize + supplement)
- [ ] **CRITICAL: Multiple meals variety**:
  - [ ] 2 meals: Different proteins/ingredients
  - [ ] 3 meals: Diverse meal types
  - [ ] 5 meals: Maximum variety, no repeated pantry items
- [ ] Expiring items prioritization (7-day threshold)
- [ ] Multiple constraints (cuisines, proteins, preferences)
- [ ] Minimal input (defaults only)
- [ ] Maximum input (all options filled)
- [ ] Edge cases (1 meal, 10 servings, etc.)

#### 5.3 AI Quality Tests
- [ ] Pantry matching accuracy
- [ ] Expiring item prioritization (7 days)
- [ ] Shopping list generation (categories, priority)
- [ ] Constraint satisfaction
- [ ] mainPrompt influence on results
- [ ] Quality scoring (reject below 50)
- [ ] AI refusals (graceful handling)
- [ ] No Constraints mode (truly ignores pantry)
- [ ] **Meal variety logic** (different ingredients per meal)

#### 5.4 Integration Tests
- [ ] Recipe navigation (multiple meals)
- [ ] Recipe save/bookmark
- [ ] Recipe scheduling (meal planner integration)
- [ ] Feedback/regeneration
- [ ] Shopping list "Add All" button
- [ ] Recent recipes (localStorage)

#### 5.5 Cross-Browser Tests
- [ ] Chrome (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Edge (desktop)
- [ ] Safari (iOS)
- [ ] Chrome (Android)

---

## Key Code References

### Backend Files
- `backend/services/recipeAI.js`: Lines 15 (threshold), 35-45 (variety logic), 292-385 (Roscoe's), 620-709 (Customize)
- `backend/server.js`: Lines 598-712 (Roscoe's endpoint), 715-832 (Customize endpoint)

### Frontend Files
- `frontend/src/pages/RecipeGenerator.js`: Full file (~1790 lines) - major refactor
- Components to create:
  - `frontend/src/components/recipe/NumberControl.js` (NEW)
  - `frontend/src/components/recipe/SettingsSummary.js` (NEW)
  - `frontend/src/components/recipe/EmptyPantryBanner.js` (NEW)

### Design System
- Utility classes: `.btn-base`, `.btn-primary`, `.btn-ghost`, `.card`, `.text-color-muted`
- Design tokens: `var(--bg-card)`, `var(--color-primary)`, `var(--text-muted)`, `var(--bg-tertiary)`
- Touch targets: Min 44px on mobile

---

## Critical Features to Preserve

### 1. Meal Variety Logic (Lines 35-45 in recipeAI.js)
**MUST PRESERVE**: When generating multiple meals, AI distributes pantry items to avoid repetition
- Example: 2 meals → chicken pasta + beef stir-fry (different proteins)
- Each meal uses different pantry items
- Maximum variety across all generated meals

### 2. Pantry Matching (Lines 919-1027 in recipeAI.js)
**MUST PRESERVE**: AI intelligently matches recipe ingredients to pantry items
- Returns `{ pantryMatches, shoppingItems }`
- Fallback to string matching if AI fails

### 3. Quality Scoring
**MUST PRESERVE**: AI rates recipes 50-100, rejects below MIN_QUALITY_SCORE (50)
- Retry up to 3 times if quality too low

### 4. AI Refusal Handling
**MUST PRESERVE**: Graceful refusals with suggestions
- Not enough pantry items
- Incompatible ingredients
- Cannot fulfill constraints

### 5. Shopping List Generation
**MUST PRESERVE**: AI categorizes and prioritizes shopping items
- Categories: produce, dairy, meat, pantry
- Priority: essential, optional

### 6. Variation Families
**MUST PRESERVE**: Multiple meals grouped with UUID
- Enables navigation between related meals
- Tracks generation session

---

## Defaults Configuration

**Level 1**:
- numberOfMeals: 3
- All Level 2/3 collapsed

**Level 2**:
- pantryMode: 'pantry_plus_shopping'
- prioritizeExpiring: true
- quickMealsOnly: false
- mainPrompt: '' (empty)

**Level 3**:
- servingSize: 2
- preferences: []
- cuisines: []
- proteins: []
- specificIngredients: []

---

## Success Criteria

### Functional Requirements
- ✅ Single unified flow (no more two flows)
- ✅ 3-level progressive disclosure with smooth animations
- ✅ +/- controls for meals (1-5) and servings (1-10)
- ✅ Settings summary dynamically shows active options
- ✅ "Meals" terminology throughout (not "recipes")
- ✅ "No Constraints" label (not "unconstrained")
- ✅ Empty pantry auto-switches with info banner
- ✅ Defaults: Pantry + Shopping, expiring=true

### AI Requirements
- ✅ All existing AI features preserved
- ✅ Meal variety logic intact (different ingredients per meal)
- ✅ Expiring threshold updated to 7 days
- ✅ Unified prompt construction (smart merging)
- ✅ No Constraints mode ignores pantry (no fetch)
- ✅ Quality scoring, refusals, retry logic preserved

### UX Requirements
- ✅ Mobile responsive (proper touch targets, sticky button)
- ✅ Web responsive (multi-column grids)
- ✅ Clean Level 1 (minimal, focused)
- ✅ Progressive disclosure works smoothly
- ✅ Settings summary accurate in all cases

### Technical Requirements
- ✅ No regressions in results view
- ✅ No regressions in recipe features (save, schedule, feedback)
- ✅ Clean code following design system
- ✅ No new dependencies
- ✅ Old endpoints deprecated (not removed yet)

---

## Progress Tracking

### Backend
- [x] Constants updated (expiring threshold) - COMPLETED
- [x] Unified AI function created - COMPLETED
- [x] Unified endpoint added - COMPLETED
- [ ] Old endpoints deprecated (will be done after testing)
- [ ] Backend tests passed

### Frontend Components
- [x] NumberControl component created - COMPLETED
- [x] SettingsSummary component created - COMPLETED
- [x] EmptyPantryBanner component created - COMPLETED

### Frontend Restructure
- [ ] State management updated
- [ ] Level 1 UI built
- [ ] Level 2 UI built
- [ ] Level 3 UI built
- [ ] Progressive disclosure implemented
- [ ] Empty pantry logic implemented
- [ ] API integration updated
- [ ] Results view updated
- [ ] Terminology updated

### Testing
- [ ] Frontend tests completed
- [ ] Backend tests completed
- [ ] AI quality tests completed
- [ ] Integration tests completed
- [ ] Mobile optimization completed
- [ ] Cross-browser tests completed

### Deployment
- [ ] Changes merged to feature branch
- [ ] PR submitted to develop
- [ ] PR reviewed and approved
- [ ] Deployed to dev environment
- [ ] Tested in dev environment
- [ ] Ready for production

---

## Notes & Decisions

### 2025-11-02 - Session 1 (Backend + Components Complete)
- ✅ Started implementation
- ✅ Created tracking document (RECIPE_REDESIGN_IMPLEMENTATION.md)
- ✅ Updated EXPIRING_SOON_THRESHOLD_DAYS from 3 to 7 days
- ✅ Created generateUnifiedRecipe() function in recipeAI.js (~375 lines)
  - Merges Roscoe's Choice and Customize logic
  - Preserves meal variety guidance (lines 35-45)
  - Smart prompt construction based on pantryMode
  - Handles all constraints (quick meals, expiring, cuisines, proteins, preferences)
- ✅ Added unified endpoint: POST /api/generate-recipe/unified
  - Validates pantryMode (pantry_only, pantry_plus_shopping, no_constraints)
  - Sets defaults: numberOfMeals=3, prioritizeExpiring=true, servingSize=2
  - Skips pantry fetch for no_constraints mode
  - Returns recipes with variationFamily for multiple meals
- ✅ Created 3 reusable frontend components:
  - NumberControl.js: +/- control for meals/servings
  - SettingsSummary.js: Dynamic settings display with bullet separation
  - EmptyPantryBanner.js: Info banner with dismiss functionality

**Next Steps**:
- Restructure RecipeGenerator.js (major refactor ~1790 lines)
  - Update state management (consolidate, add new states)
  - Build 3-level progressive UI
  - Implement empty pantry auto-switch logic
  - Wire up unified API endpoint
  - Update terminology (recipes → meals)
- Test thoroughly (especially meal variety logic)
- Deploy to dev environment for testing

---

## Next Steps
1. ✅ Create this tracking document
2. ⏳ Update backend (recipeAI.js)
3. ⏳ Add unified endpoint (server.js)
4. ⏳ Create frontend components
5. ⏳ Restructure RecipeGenerator.js
6. ⏳ Test everything thoroughly
7. ⏳ Deploy to dev environment
