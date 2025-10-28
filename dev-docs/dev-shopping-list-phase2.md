
**PHASE 2**
**Add items**
**From Recipe (Missing Ingredients):**
- Add button on Recipe detail page: "Add Missing to Shopping List"
- Backend compares recipe ingredients vs current pantry inventory
- Only add items not in pantry OR insufficient quantity
- Pre-fill with recipe quantities

**From Meal Plan (Bulk Generate):**
- Button on Meal Planner page: "Generate Shopping List"
- Scan all "planned" state meals (not completed)
- Aggregate ingredients across multiple recipes
- Smart deduplication: combine quantities for same items
- Remove items already in pantry (sufficient quantity)
- Show confirmation: "Added 18 items to shopping list"

**Item display**
- If from recipe/meal: Show small tag "From: [Recipe Name]"

**AI features**
- If adding from recipe/meal: check if already on the shopping list and combine e.g. "2 eggs" on the list, recipe needs "4 eggs" -> 6 eggs
- Show source breakdown on item detail (tap to expand): "6 eggs (2 from Pasta, 4 from Cake)"

**Pantry Integration (Missing Ingredients):**
- When adding from recipe: compare recipe.ingredients vs pantry items
- Logic: 
  - If pantry has item AND quantity >= needed → skip
  - If pantry has item BUT quantity < needed → add (needed - current)
  - If pantry doesn't have item → add full recipe amount
- Show notification: "Added 5 items (3 new, 2 restocked)"


---

### `POST /api/shopping-list/generate-from-recipe`
**Request:**
```json
{
  "recipeId": "recipe_xyz"
}
```
**Response:**
```json
{
  "addedItems": [...],
  "skippedItems": [...] // items already in pantry with sufficient quantity
}
```
**Logic:**
1. Verify auth and homeId
2. Fetch recipe by id
3. Fetch pantry items for homeId
4. For each recipe ingredient:
   - Check if in pantry with sufficient quantity
   - If not, add to shopping list with recipe as source
5. Parse ingredient text using AI if needed
6. Return summary

---

### `POST /api/shopping-list/generate-from-meals`
**Request:**
```json
{
  "dateRange": {
    "start": "2025-10-27",
    "end": "2025-11-02"
  }
}
// Or omit dateRange to use "current week"
```
**Response:**
```json
{
  "addedItems": [...],
  "aggregatedCount": 24, // total ingredients before aggregation
  "finalCount": 18, // after deduplication and pantry check
}
```
**Logic:**
1. Verify auth and homeId
2. Fetch meal_plans for homeId with state="planned" within dateRange
3. Fetch all associated recipes
4. Aggregate all ingredients (combine quantities for duplicates)
5. Fetch pantry items
6. Remove items with sufficient pantry quantity
7. Add remaining items to shopping list with source.type="meal_plan"
8. Return summary



### Recipe Page Integration
- Add "Add Missing to Shopping List" button to RecipeDetail component
- Call `/api/shopping-list/generate-from-recipe` with recipeId
- Show success toast: "Added 5 items to shopping list"

### Meal Planner Integration
- Add "Generate Shopping List" button to MealPlanner component (prominent, above calendar)
- Call `/api/shopping-list/generate-from-meals`
- Show modal/toast with summary: "Added 18 items from 4 meals"

**Success criteria**

✅ Users can generate shopping list from recipes
✅ Users can generate shopping list from meal plan
✅ Items from meal plan aggregate quantities correctly
✅ Pantry integration prevents duplicate purchases