/**
 * AI Configuration
 *
 * Centralized configuration for all AI-related settings.
 * This is the single source of truth for AI model selection across all services.
 */

/**
 * Gemini AI model to use for all AI operations.
 *
 * This constant is used across all AI services:
 * - Recipe generation (recipeAI.js)
 * - Pantry management (pantryAI.js)
 * - Shopping list parsing (shoppingListAI.js)
 *
 * @constant {string}
 * @default 'gemini-2.5-flash'
 */
const GEMINI_MODEL = 'gemini-2.5-flash';

module.exports = {
  GEMINI_MODEL
};
