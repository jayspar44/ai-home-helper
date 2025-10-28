# Implementation Prompt for Claude Code

## Context
You are implementing a Smart Shopping List feature for Roscoe, an AI-powered home helper app. The app uses React frontend, Node.js/Express backend, Firebase Firestore, and Google Gemini AI. The codebase follows existing patterns for pantry management, recipes, and meal planning.

## Tech Stack
- **Frontend**: React 18, React Router v6, CSS custom properties, Lucide React icons
- **Backend**: Node.js + Express, Firebase Admin SDK, Firestore, Google Gemini 2.5 Flash
- **Authentication**: Firebase Auth with homeId-based multi-tenancy
- **Logging**: Pino for backend, custom lightweight logger for frontend

## Feature Requirements

### 1. List Management
- Single shared shopping list per home (homeId-scoped)
- Real-time updates (Firestore listeners)
- Items persist until manually deleted or checked off (i.e. because they were purchased)
- Auto-categorize items: Produce, Dairy, Meat, Pantry, Frozen, Other

### 2. Adding Items

**Manual Add (Inline):**
- Text input at top of list (no modal)
- Type item and press Enter or click Add
- AI parsing via backend: "2 lbs chicken breast" → structured data
- Show loading state while parsing
- Default quantity: 1, default unit: "each" if not specified

### 3. List Display

**View:**
- Group items by category (collapsible sections)
- Each category shows count: "PRODUCE (3)"
- Unchecked items at top, checked items at bottom (grayed out)
- Sort unchecked by: category → addedAt (most recent first within category)
- Empty state: "Your shopping list is empty. Add items manually or generate from your meal plan."

**Item Display (Inline Editing):**
```
☐ Chicken Breast    2 lbs    [Edit] [Delete]
```
- Checkbox on left
- Item name (clickable to edit inline)
- Quantity + unit (clickable to edit inline)
- Edit/Delete icons on right (visible on hover/desktop, always visible on mobile)
- Show "Added 2h ago by [user name]" timestamp on tap/hover

**Category Sections:**
- Expandable/collapsible headers
- Default: all expanded
- Emoji icons: 🥬 Produce, 🥛 Dairy, 🍖 Meat, 🥫 Pantry, ❄️ Frozen, 📦 Other
- Show checked count: "PRODUCE (2 of 5 checked)"

### 4. Checking Off Items

**Interaction:**
- Tap checkbox → item checked
- Item moves to bottom of its category, grayed out
- Strikethrough text style
- Show "Undo" toast/snackbar for 5 seconds
- Simple button to clear checked items

**No Auto-Add to Pantry (for now):**
- Keep it simple - just check/uncheck
- We'll add pantry integration in Phase 2

### 6. Smart Features

**AI Category Assignment:**
- Backend uses Gemini to categorize items when added
- Categories: produce, dairy, meat, pantry, frozen, other
- Fallback to "other" if AI unsure

**AI Parsing (Natural Language):**
- Input: "2 lbs chicken breast"
- Output: `{name: "chicken breast", quantity: 2, unit: "lbs", category: "meat"}`
- Handle variations: "chicken", "2 chicken breasts", "chicken breast 2 lbs"
- Common units: lbs, oz, kg, g, gallons, cups, tbsp, tsp, each, bunch, bag, can, box

**Quantity Aggregation (Meal Plan Generation):**
- When AI parsing combine duplicate items
- Example: User adds "2 eggs", shopping list already has "4 eggs" → "6 eggs"

---

## Data Model

### Firestore Collection: `shopping_lists`
```javascript
// Document ID: homeId
{
  homeId: "home123",
  items: [
    {
      id: "uuid_v4", // generated client-side or backend
      name: "Chicken Breast",
      quantity: 2,
      unit: "lbs",
      category: "meat", // produce|dairy|meat|pantry|frozen|other
      checked: false,
      addedBy: "userId123",
      addedAt: Timestamp,
      source: {
        type: "recipe" | "meal_plan" | "manual",
        id: "recipe_xyz", // optional, if from recipe
        name: "Thai Basil Chicken", // optional, display name
      },
      notes: "", // optional, future use
    }
  ],
  lastUpdated: Timestamp,
  createdAt: Timestamp,
}
```

---

## Backend API Endpoints

### `POST /api/shopping-list/items`
**Request:**
```json
{
  "text": "2 lbs chicken breast" // raw text input
}
```
**Response:**
```json
{
  "item": {
    "id": "uuid",
    "name": "chicken breast",
    "quantity": 2,
    "unit": "lbs",
    "category": "meat",
    "checked": false,
    "addedBy": "userId",
    "addedAt": "2025-10-27T...",
    "source": { "type": "manual" }
  }
}
```
**Logic:**
1. Verify user auth and get homeId
2. Call Gemini AI to parse text (prompt: extract name, quantity, unit, category)
3. Add item to shopping_lists/{homeId}/items array
4. Update lastUpdated timestamp
5. Return parsed item

---

### `GET /api/shopping-list`
**Response:**
```json
{
  "items": [...],
  "lastUpdated": "timestamp"
}
```
**Logic:**
1. Verify auth and get homeId
2. Fetch shopping_lists/{homeId}
3. Return items array

---

### `PATCH /api/shopping-list/items/:itemId/check`
**Request:**
```json
{
  "checked": true
}
```
**Response:**
```json
{
  "success": true,
  "item": {...}
}
```
**Logic:**
1. Verify auth and homeId
2. Find item in items array by id
3. Update checked field
4. Update lastUpdated timestamp
5. Return updated item

---

### `PATCH /api/shopping-list/items/:itemId`
**Request:**
```json
{
  "name": "Organic Chicken Breast", // optional
  "quantity": 3, // optional
  "unit": "lbs", // optional
  "category": "meat" // optional
}
```
**Response:**
```json
{
  "success": true,
  "item": {...}
}
```
**Logic:**
1. Verify auth and homeId
2. Find item by id
3. Update provided fields only
4. Update lastUpdated
5. Return updated item

---

### `DELETE /api/shopping-list/items/:itemId`
**Response:**
```json
{
  "success": true
}
```
**Logic:**
1. Verify auth and homeId
2. Remove item from items array
3. Update lastUpdated

---

## Frontend Components

### File Structure
```
frontend/src/
├── pages/
│   └── ShoppingList.js           # Main shopping list page
├── components/
│   ├── ShoppingListItem.js       # Individual item component
│   ├── ShoppingListCategory.js   # Category section component
│   ├── ShoppingListInput.js      # Inline add input
│   └── ShoppingListEmpty.js      # Empty state
├── hooks/
│   └── useShoppingList.js         # Custom hook for list logic
└── styles/
    └── ShoppingList.css           # Shopping list styles
```

---

### Component: `ShoppingList.jss`
**Features:**
- Fetch shopping list on mount (with Firestore real-time listener for future)
- Group items by category
- Render category sections (collapsible)
- Inline add input at top
- "Generate from Meal Plan" button (prominent)
- Empty state when no items
- Loading state
- Error handling

**Layout:**
```jsx
<div className="shopping-list-page">
  <header>
    <h1>🛒 Shopping List</h1>
    <span className="item-count">12 items</span>
  </header>

  <ShoppingListInput onAdd={handleAddItem} />

  <button onClick={handleGenerateFromMeals}>
    Generate from Meal Plan
  </button>

  {loading ? (
    <LoadingSpinner />
  ) : items.length === 0 ? (
    <ShoppingListEmpty />
  ) : (
    <div className="shopping-list-categories">
      {categories.map(cat => (
        <ShoppingListCategory
          key={cat}
          category={cat}
          items={itemsByCategory[cat]}
          onCheck={handleCheck}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )}
</div>
```

---

### Component: `ShoppingListInput.js`
**Features:**
- Text input (controlled)
- "Add" button or Enter key to submit
- Loading state while AI parsing
- Clear input after successful add
- Error message if parsing fails

**Layout:**
```jsx
<div className="shopping-list-input">
  <input
    type="text"
    placeholder="Add item (e.g., 2 lbs chicken)"
    value={text}
    onChange={e => setText(e.target.value)}
    onKeyPress={e => e.key === 'Enter' && handleAdd()}
  />
  <button onClick={handleAdd} disabled={loading}>
    {loading ? 'Adding...' : 'Add'}
  </button>
</div>
```

---

### Component: `ShoppingListCategory.js`
**Features:**
- Collapsible category header
- Show category emoji + name + count
- Render all items in category
- Unchecked items first, then checked items (grayed)

**Layout:**
```jsx
<div className="shopping-list-category">
  <button 
    className="category-header"
    onClick={() => setExpanded(!expanded)}
  >
    <span>{emoji} {categoryName.toUpperCase()}</span>
    <span className="category-count">
      {checkedCount > 0 ? `${checkedCount} of ${totalCount} checked` : `${totalCount}`}
    </span>
    <ChevronDown className={expanded ? 'rotate' : ''} />
  </button>

  {expanded && (
    <div className="category-items">
      {items.map(item => (
        <ShoppingListItem
          key={item.id}
          item={item}
          onCheck={onCheck}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )}
</div>
```

---

### Component: `ShoppingListItem.js`
**Features:**
- Checkbox (large tap target)
- Item name (inline editable - click to edit, blur to save)
- Quantity + unit (inline editable)
- Edit/Delete buttons (show on hover desktop, always visible mobile)
- Strikethrough + gray when checked
- Show source tag if from recipe/meal plan
- Undo toast on check (5 sec timeout)

**Layout:**
```jsx
<div className={`shopping-list-item ${item.checked ? 'checked' : ''}`}>
  <input
    type="checkbox"
    checked={item.checked}
    onChange={() => onCheck(item.id, !item.checked)}
  />

  <div className="item-details">
    <input
      className="item-name"
      value={editedName}
      onChange={e => setEditedName(e.target.value)}
      onBlur={() => handleSave('name', editedName)}
    />
    
    <div className="item-quantity">
      <input
        value={editedQuantity}
        onChange={e => setEditedQuantity(e.target.value)}
        onBlur={() => handleSave('quantity', editedQuantity)}
      />
      <input
        value={editedUnit}
        onChange={e => setEditedUnit(e.target.value)}
        onBlur={() => handleSave('unit', editedUnit)}
      />
    </div>

    {item.source?.name && (
      <span className="item-source">From: {item.source.name}</span>
    )}
  </div>

  <div className="item-actions">
    <button onClick={() => onDelete(item.id)}>
      <Trash2 size={16} />
    </button>
  </div>
</div>
```

---

### Hook: `useShoppingList.js`
**Features:**
- Fetch shopping list from backend
- Add item (with AI parsing)
- Check/uncheck item
- Edit item
- Delete item
- Generate from meal plan
- Handle loading/error states
- Group items by category

**Export:**
```javascript
export const useShoppingList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch list
  useEffect(() => { ... }, []);

  // Add item
  const addItem = async (text) => { ... };

  // Toggle check
  const toggleCheck = async (itemId, checked) => { ... };

  // Edit item
  const editItem = async (itemId, updates) => { ... };

  // Delete item
  const deleteItem = async (itemId) => { ... };

  // Generate from meals
  const generateFromMeals = async (dateRange) => { ... };

  // Group by category
  const itemsByCategory = useMemo(() => {
    // Group and sort
  }, [items]);

  return {
    items,
    itemsByCategory,
    loading,
    error,
    addItem,
    toggleCheck,
    editItem,
    deleteItem,
    generateFromMeals,
  };
};
```

---

## Styling Guidelines

**Follow existing Roscoe design system:**
- Use CSS custom properties: `var(--primary)`, `var(--primary-light)`, `var(--text-primary)`
- Mobile-first responsive breakpoints
- Card-based UI with subtle shadows
- Smooth transitions (200ms ease)
- High contrast for accessibility
- Focus states for keyboard navigation

**Shopping List specific styles:**
- Category headers: Bold, uppercase, with accent border-bottom
- Items: List style, 12px padding, hover state (use the same as the lists from the pantry page)
- Checkboxes: Large (24px), custom styled to match brand
- Inline editing: Underline on focus, subtle background change
- Checked items: 50% opacity, strikethrough
- Empty state: Centered, muted color, helpful message

---

## AI Prompt Engineering

### For Item Parsing (Gemini)
```
You are a shopping list assistant. Parse the following text into a structured item.

Input: "{user_input}"

Output JSON format:
{
  "name": "item name (lowercase, singular)",
  "quantity": number,
  "unit": "lbs|oz|kg|g|gallons|cups|tbsp|tsp|each|bunch|bag|can|box",
  "category": "produce|dairy|meat|pantry|frozen|other"
}

Examples:
- "2 lbs chicken breast" -> {"name": "chicken breast", "quantity": 2, "unit": "lbs", "category": "meat"}
- "milk" -> {"name": "milk", "quantity": 1, "unit": "gallon", "category": "dairy"}
- "3 apples" -> {"name": "apple", "quantity": 3, "unit": "each", "category": "produce"}

Rules:
- Default quantity is 1
- Default unit is "each"
- Category must be one of: produce, dairy, meat, pantry, frozen, other
- Name should be singular and first letter capitalized e.g. Milk, Chicken breast
- If unit is ambiguous, use common sense (milk = gallon, chicken = lbs)

Return ONLY valid JSON, no explanation.
```

### For Category Assignment (if needed separately)
```
Categorize this grocery item: "{item_name}"

Categories: produce, dairy, meat, pantry, frozen, other

Return only the category name, lowercase, no explanation.
```

---

## Integration Points

### Navigation
- Add route: `/shopping-list` 
- Add to sidebar/bottom nav: 🛒 Shopping List icon (use `<ShoppingCart>` from lucide-react)
- Update SharedLayout to include new route

---

## Testing Checklist

**Backend:**
- [ ] AI parsing handles various input formats
- [ ] Category assignment works correctly
- [ ] Quantity aggregation combines duplicates
- [ ] Pantry comparison excludes sufficient items
- [ ] Auth middleware protects all endpoints
- [ ] Firestore updates are atomic

**Frontend:**
- [ ] Real-time updates work (or polling for now)
- [ ] Inline editing saves on blur
- [ ] Checkboxes toggle correctly
- [ ] Undo toast appears and works
- [ ] Category collapsing persists state
- [ ] Mobile responsive layout works
- [ ] Keyboard navigation functional
- [ ] Loading states display properly
- [ ] Error messages are helpful

**Edge Cases:**
- [ ] Empty shopping list shows helpful state
- [ ] No pantry items doesn't break generation
- [ ] No planned meals shows appropriate message
- [ ] Duplicate manual adds are handled
- [ ] Very long item names don't break layout
- [ ] Special characters in item names work
- [ ] Network errors are caught and displayed

---

## Implementation Order

1. **Backend API** (start here)
   - Set up routes in Express
   - Implement AI parsing function
   - Implement CRUD endpoints
   - Test with Postman/curl

2. **Frontend Hook**
   - Create useShoppingList hook
   - Implement API calls
   - Handle loading/error states

3. **UI Components**
   - Build ShoppingListInput
   - Build ShoppingListItem
   - Build ShoppingListCategory
   - Build main ShoppingList page

4. **Styling**
   - Create ShoppingList.css
   - Implement responsive design
   - Test on mobile devices

5. **Integration**
   - Add route to App.jsx
   - Update navigation
   - Add buttons to Recipe and MealPlanner pages

6. **Testing & Polish**
   - Test all user flows
   - Fix edge cases
   - Optimize performance
   - Add loading indicators

---

## Success Criteria

✅ Users can manually add items with natural language
✅ Items are auto-categorized correctly (>80% accuracy)
✅ UI is responsive and works on mobile
✅ Check/uncheck interaction is smooth and immediate
✅ Inline editing works without modals

---

**Begin implementation. Follow existing code patterns in the repository. Ask clarifying questions if anything is ambiguous. Good luck!** 🚀


