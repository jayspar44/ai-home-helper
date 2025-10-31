// aiHelpers.js - Shared utilities for AI service functions

/**
 * Parses JSON from AI response text
 * Handles common patterns: JSON extraction from potentially messy responses,
 * consistent error logging, and standardized error messages
 *
 * @param {string} text - Raw AI response text (may contain markdown or extra text)
 * @param {Object} logger - Pino logger instance
 * @param {Object} context - Additional context for error logging (e.g., { itemName, homeId })
 * @returns {Object|Array} Parsed JSON object or array
 * @throws {Error} If JSON cannot be extracted or parsed
 */
function parseAIJsonResponse(text, logger, context = {}) {
  try {
    // Match JSON object or array
    // Supports both objects {...} and arrays [...]
    const jsonMatch = text.match(/[{[][\s\S]*[}\]]/s);

    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    return JSON.parse(jsonMatch[0]);

  } catch (err) {
    logger.error({
      err,
      text: text.substring(0, 200),
      ...context
    }, 'Error parsing AI JSON response');

    throw new Error('Failed to parse AI response');
  }
}

module.exports = {
  parseAIJsonResponse
};
