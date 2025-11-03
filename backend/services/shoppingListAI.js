// shoppingListAI.js - AI parsing service for shopping list items

const { parseAIJsonResponse } = require('../utils/aiHelpers');
const { GEMINI_MODEL } = require('../config/ai');

/**
 * Parses natural language shopping list item text into structured data
 * Uses Google Gemini AI to extract name, quantity, unit, and category
 *
 * @param {string} text - Raw text input (e.g., "2 lbs chicken breast")
 * @param {Object} genAI - Google Generative AI instance
 * @param {Object} logger - Pino logger instance
 * @returns {Promise<Object>} Parsed item with name, quantity, unit, category
 */
async function parseShoppingListItem(text, genAI, logger) {
  const startTime = Date.now();

  const prompt = `You are a shopping list assistant. Parse the following text into a structured item.

Input: "${text}"

Output JSON format:
{
  "name": "item name with qualifiers preserved",
  "quantity": number,
  "unit": "lbs|oz|kg|g|gallons|cups|tbsp|tsp|each|bunch|bag|can|box|bottle|jar|dozen|pack|loaf|ct",
  "category": "produce|dairy|meat|pantry|frozen|other"
}

Examples:
- "2 lbs chicken breast" -> {"name": "Chicken Breast", "quantity": 2, "unit": "lbs", "category": "meat"}
- "milk" -> {"name": "Milk", "quantity": 1, "unit": "gallon", "category": "dairy"}
- "3 apples" -> {"name": "Apples", "quantity": 3, "unit": "each", "category": "produce"}
- "dozen eggs" -> {"name": "Eggs", "quantity": 12, "unit": "each", "category": "dairy"}
- "2% milk" -> {"name": "2% Milk", "quantity": 1, "unit": "gallon", "category": "dairy"}
- "greek yogurt" -> {"name": "Greek Yogurt", "quantity": 1, "unit": "each", "category": "dairy"}
- "coca cola 1ltr" -> {"name": "Coca Cola", "quantity": 1, "unit": "Ltr", "category": "other"}
- "extra virgin olive oil" -> {"name": "Extra Virgin Olive Oil", "quantity": 1, "unit": "bottle", "category": "pantry"}
- "red delicious apples" -> {"name": "Red Delicious Apples", "quantity": 1, "unit": "each", "category": "produce"}
- "organic chicken breast" -> {"name": "Organic Chicken Breast", "quantity": 1, "unit": "lbs", "category": "meat"}
- "whole wheat bread" -> {"name": "Whole Wheat Bread", "quantity": 1, "unit": "loaf", "category": "pantry"}

Rules:
- Default quantity is 1
- Default unit is "each"
- Category MUST be one of: produce, dairy, meat, pantry, frozen, other
- PRESERVE ALL qualifiers and descriptors: "2%", "organic", "greek", "extra virgin", varieties, etc.
- CAPITALIZE each significant word in the item name (title case)
- Recognize and properly capitalize brand names: "Coca Cola", "Cheerios", "Kraft", etc.
- DO NOT over-simplify or normalize away important context
- Use plural form for units when quantity > 1 (each, cans, cups, etc.), singular when quantity = 1 or if measured in weight/volume ("2 lbs Chicken Breast" -> "Chicken Breast")
- If unit is ambiguous, use common sense (milk = gallon, chicken = lbs, eggs = dozen/each, oil = bottle, bread = loaf)
- Handle "dozen" = 12 each
- If the item doesn't fit clearly, use category "other"

Return ONLY valid JSON, no explanation or markdown formatting.`;

  try {
    const promptVariables = {
      inputText: text,
      inputLength: text.length
    };

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // Parse JSON from response
    let parsedItem;
    try {
      // Remove markdown code blocks if present (AI sometimes adds these)
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedItem = parseAIJsonResponse(cleanedText, logger, { inputText: text, context: 'shopping-list-item' });
    } catch (parseError) {
      // Return fallback on parsing error
      return createFallbackItem(text);
    }

    // Validate parsed item
    if (!parsedItem.name || typeof parsedItem.quantity !== 'number' || !parsedItem.unit || !parsedItem.category) {
      logger.warn({ parsedItem, inputText: text }, 'Incomplete parsed item, using fallback');
      return createFallbackItem(text);
    }

    // Validate category
    const validCategories = ['produce', 'dairy', 'meat', 'pantry', 'frozen', 'other'];
    if (!validCategories.includes(parsedItem.category)) {
      logger.warn({ category: parsedItem.category, inputText: text }, 'Invalid category, defaulting to "other"');
      parsedItem.category = 'other';
    }

    const responseTime = Date.now() - startTime;

    // Comprehensive AI logging (DEBUG level, dev only)
    logger.debug({
      aiService: 'shoppingListAI',
      aiFunction: 'parseShoppingListItem',
      promptVariables,
      fullPrompt: prompt,
      fullResponse: responseText,
      parsedResult: parsedItem,
      responseTime,
      attempt: 1
    }, 'AI call completed (Shopping List Parsing)');

    logger.debug({
      inputText: text,
      parsedItem,
      aiResponseTime: responseTime
    }, 'Shopping list item parsed successfully');

    return parsedItem;

  } catch (error) {
    logger.error({
      err: error,
      inputText: text
    }, 'Error calling Gemini AI for shopping list parsing');

    // Return fallback item
    return createFallbackItem(text);
  }
}

/**
 * Creates a fallback item when AI parsing fails
 * Uses simple text processing to extract basic info
 *
 * @param {string} text - Raw text input
 * @returns {Object} Fallback item structure
 */
function createFallbackItem(text) {
  // Capitalize first letter
  const name = text.trim().charAt(0).toUpperCase() + text.trim().slice(1);

  return {
    name: name,
    quantity: 1,
    unit: 'each',
    category: 'other'
  };
}

module.exports = {
  parseShoppingListItem
};
