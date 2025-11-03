// RecipeListItem.js - List view for saved/recent recipes matching pantry/shopping design
import React from 'react';
import { Clock, Flame, Users } from 'lucide-react';

/**
 * Recipe list item component - matches pantry/shopping list design
 * Features plain text display, hover effect, click to view pattern
 */
const RecipeListItem = ({ recipe, onClick, borderColor = 'var(--border-light)' }) => {
  return (
    <div className="relative">
      <div
        className="list-item bg-tertiary"
        style={{ borderLeftColor: borderColor }}
        onClick={() => onClick(recipe)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Recipe Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-color-primary line-clamp-2">
              {recipe.title}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-color-muted">
              {recipe.prepTime && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {recipe.prepTime}
                </span>
              )}
              {recipe.cookTime && (
                <span className="flex items-center gap-1">
                  <Flame size={12} />
                  {recipe.cookTime}
                </span>
              )}
              {recipe.servings && (
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {recipe.servings}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeListItem;
