// pantryAI.js - AI pantry management service

const { parseAIJsonResponse } = require('../utils/aiHelpers');
const { GEMINI_MODEL } = require('../config/ai');

/**
 * Suggests pantry items based on user input with confidence scoring
 * Uses AI to provide specific suggestions, variations, or guidance
 *
 * @param {string} itemName - The item name to analyze
 * @param {Object} genAI - Google Generative AI instance
 * @param {Object} logger - Pino logger instance
 * @returns {Promise<Object>} Suggestion data with confidence, action, suggestions, and guidance
 */
async function suggestPantryItem(itemName, genAI, logger) {
  const startTime = Date.now();

  const prompt = `Analyze this food/pantry item name: "${itemName}"

Your goal is to help users create specific, useful pantry entries. Provide suggestions based on confidence level:

HIGH CONFIDENCE (>80%): Item is specific and clearly identifiable
- Return ONE detailed suggestion with exact name, typical quantity, shelf life
- Example: "eggs" → "Large white eggs, dozen, 21-28 days"

MEDIUM CONFIDENCE (40-80%): Item is recognizable but vague/ambiguous
- Return 3-4 common specific variations
- Include brand examples and common sizes
- Encourage user to be more specific
- Example: "chocolate" → ["Milk chocolate bar 1.5oz", "Dark chocolate chips 12oz", "Chocolate candy assorted 8oz"]

LOW CONFIDENCE (<40%): Item is too vague, unclear, or non-food
- Provide guidance on being more specific
- Give examples of better alternatives
- Suggest photo upload for unclear items
- Example: "stuff" → guidance to be more specific

Focus on:
- Common grocery items and typical household sizes
- Realistic shelf life estimates (in days)
- Encouraging specificity over generic terms
- Educational guidance for better entries

Return JSON format:
{
  "confidence": 0.0-1.0,
  "action": "accept" | "choose" | "specify",
  "suggestions": [
    {
      "name": "Specific item name",
      "quantity": "Amount with unit",
      "shelfLife": "X days",
      "location": "pantry" | "fridge" | "freezer",
      "daysUntilExpiry": number
    }
  ],
  "guidance": {
    "message": "Helpful message",
    "examples": ["example1", "example2"],
    "reasoning": "Why this confidence level"
  }
}`;

  try {
    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse AI response
    const suggestionData = parseAIJsonResponse(text, logger, { itemName, context: 'suggest-item' });

    logger.debug({
      itemName,
      confidence: suggestionData.confidence,
      action: suggestionData.action,
      suggestionCount: suggestionData.suggestions?.length,
      aiResponseTime: Date.now() - startTime
    }, 'AI suggestions returned');

    return suggestionData;

  } catch (error) {
    logger.error({ err: error, itemName }, 'Error in suggestPantryItem');
    throw error;
  }
}

/**
 * Gets quick defaults (location and expiry) for a pantry item
 * Provides fast smart defaults with fallback logic
 *
 * @param {string} itemName - The item name to analyze
 * @param {Object} genAI - Google Generative AI instance
 * @param {Object} logger - Pino logger instance
 * @returns {Promise<Object>} Object with location and daysUntilExpiry
 */
async function getQuickDefaults(itemName, genAI, logger) {
  const startTime = Date.now();

  const prompt = `For the food item "${itemName}", provide quick smart defaults for location and expiry days.

Respond with ONLY this JSON format (no other text):
{
  "location": "pantry" | "fridge" | "freezer",
  "daysUntilExpiry": number
}

Use these rules:
- Fresh produce, dairy, meat → "fridge"
- Frozen items → "freezer"
- Dry goods, canned items, snacks → "pantry"
- Reasonable expiry days (1-3 for fresh, 7-30 for pantry items)`;

  try {
    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse AI response
    let defaultsData;
    try {
      defaultsData = parseAIJsonResponse(text, logger, { itemName, context: 'quick-defaults' });
    } catch (parseError) {
      logger.warn({ err: parseError, itemName }, 'Error parsing quick defaults, using fallback');
      // Return sensible fallback
      defaultsData = createDefaultsFallback(itemName);
    }

    logger.debug({
      itemName,
      location: defaultsData.location,
      daysUntilExpiry: defaultsData.daysUntilExpiry,
      aiResponseTime: Date.now() - startTime
    }, 'AI defaults returned');

    return defaultsData;

  } catch (error) {
    logger.warn({ err: error, itemName }, 'Error in getQuickDefaults, using fallback');
    // Return sensible fallback on error
    return createDefaultsFallback(itemName);
  }
}

/**
 * Detects food items from an image using AI
 * Returns structured data with item details, location, and expiry estimates
 *
 * @param {string} base64Image - Base64 encoded image data
 * @param {string} mimeType - Image MIME type (e.g., 'image/jpeg')
 * @param {Object} genAI - Google Generative AI instance
 * @param {Object} logger - Pino logger instance
 * @returns {Promise<Object[]>} Array of detected items with formatted data
 */
async function detectItemsFromImage(base64Image, mimeType, genAI, logger) {
  const startTime = Date.now();

  const prompt = `You are an expert at identifying food items in images. Analyze this image and detect all food items visible.

For each item detected, you MUST provide ALL fields:
1. Name: Be specific (e.g., "Honeycrisp Apples" not just "apples", "Whole Wheat Bread" not just "bread")
2. Quantity: Estimate based on visual cues (e.g., "3 apples", "1 loaf", "2 lbs", "1 carton")
3. Location: ALWAYS determine storage location based on item type:
   - Fresh produce, dairy, meat, leftovers → "fridge"
   - Frozen items → "freezer"
   - Dry goods, canned items, snacks, spices → "pantry"
4. Days until expiry: ALWAYS estimate realistic shelf life:
   - Fresh produce: 3-10 days
   - Dairy: 5-14 days
   - Meat/fish: 1-5 days
   - Bread: 3-7 days
   - Pantry items: 30-365 days
   - Consider visible freshness cues
5. Confidence: Your confidence level (0.0-1.0) in this detection

CRITICAL: Every item MUST have location and daysUntilExpiry fields filled with realistic values.

Respond ONLY with a JSON array, no other text:
[
  {
    "name": "Item name",
    "quantity": "Amount with unit",
    "location": "pantry|fridge|freezer",
    "daysUntilExpiry": number,
    "confidence": 0.0-1.0
  }
]

If no food items are detected, return an empty array: []`;

  try {
    // Call Gemini API with image
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse AI response (expects array of detected items)
    const detectedItems = parseAIJsonResponse(text, logger, { context: 'detect-items' });

    // Validate and format detected items
    const formattedItems = detectedItems.map(item => {
      const daysUntilExpiry = item.daysUntilExpiry || 7;
      const expiresAt = new Date(Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000);

      return {
        name: item.name || 'Unknown Item',
        quantity: item.quantity || '1 item',
        location: ['pantry', 'fridge', 'freezer'].includes(item.location) ? item.location : 'pantry',
        expiresAt,
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.7,
        detectedBy: 'ai'
      };
    });

    logger.debug({
      itemsDetected: formattedItems.length,
      aiResponseTime: Date.now() - startTime
    }, 'AI detected items from image');

    return formattedItems;

  } catch (error) {
    logger.error({ err: error }, 'Error in detectItemsFromImage');
    throw error;
  }
}

/**
 * Creates fallback defaults for quick-defaults endpoint
 * @private
 */
function createDefaultsFallback(itemName) {
  const nameLower = itemName.toLowerCase();
  const isFridge = nameLower.includes('milk') ||
                   nameLower.includes('yogurt') ||
                   nameLower.includes('cheese') ||
                   nameLower.includes('meat') ||
                   nameLower.includes('fish');

  return {
    location: isFridge ? 'fridge' : 'pantry',
    daysUntilExpiry: 7
  };
}

module.exports = {
  suggestPantryItem,
  getQuickDefaults,
  detectItemsFromImage
};
