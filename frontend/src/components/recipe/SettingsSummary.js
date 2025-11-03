// SettingsSummary.js - Dynamic settings summary display
import React from 'react';

/**
 * Displays a dynamic summary of active recipe generation settings
 * Shows 2-4 key settings separated by bullets
 *
 * @param {string} pantryMode - 'pantry_only' | 'pantry_plus_shopping' | 'no_constraints'
 * @param {boolean} prioritizeExpiring - Use expiring items first
 * @param {boolean} quickMealsOnly - Quick meals constraint
 * @param {number} numberOfMeals - Number of meals (only show if > 1)
 * @param {number} servingSize - Servings (only show if not default 2)
 * @param {string[]} cuisines - Selected cuisines
 * @param {string[]} proteins - Selected proteins
 * @param {string[]} preferences - Selected preferences
 */
export default function SettingsSummary({
  pantryMode,
  prioritizeExpiring,
  quickMealsOnly,
  numberOfMeals,
  servingSize,
  cuisines = [],
  proteins = [],
  preferences = []
}) {
  const summaryParts = [];

  // 1. Always show pantry mode
  const modeLabels = {
    'pantry_only': 'Pantry Only',
    'pantry_plus_shopping': 'Pantry + Shopping',
    'no_constraints': 'No Constraints'
  };
  summaryParts.push(modeLabels[pantryMode] || 'Pantry + Shopping');

  // 2. Show expiring items if enabled and not no_constraints
  if (prioritizeExpiring && pantryMode !== 'no_constraints') {
    summaryParts.push('Expiring items first');
  }

  // 3. Show quick meals if enabled
  if (quickMealsOnly) {
    summaryParts.push('Quick meals');
  }

  // 4. Show servings if not default (2)
  if (servingSize && servingSize !== 2) {
    summaryParts.push(`${servingSize} servings`);
  }

  // 5. Show cuisines (limit to 2, then "+X more")
  if (cuisines.length > 0) {
    const cuisineText = cuisines.slice(0, 2).join(', ');
    const remaining = cuisines.length - 2;
    summaryParts.push(remaining > 0 ? `${cuisineText} +${remaining}` : cuisineText);
  }

  // 6. Show proteins (limit to 2)
  if (proteins.length > 0) {
    const proteinText = proteins.slice(0, 2).join(', ');
    const remaining = proteins.length - 2;
    summaryParts.push(remaining > 0 ? `${proteinText} +${remaining}` : proteinText);
  }

  // 7. Show preferences (if selected)
  if (preferences.length > 0 && summaryParts.length < 4) {
    const prefText = preferences.slice(0, 2).join(', ');
    summaryParts.push(prefText);
  }

  // Limit to 4 items max
  const displayParts = summaryParts.slice(0, 4);

  return (
    <div style={{
      fontSize: '0.875rem',
      color: 'var(--text-muted)',
      margin: '0.5rem 0 0.75rem 0',
      textAlign: 'center'
    }}>
      {displayParts.join(' • ')}
      {summaryParts.length > 4 && '...'}
    </div>
  );
}
