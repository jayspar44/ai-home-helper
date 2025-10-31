import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import ShoppingListItem from './ShoppingListItem';

/**
 * Category section for shopping list items
 * Features collapsible header with emoji and item counts
 */

// Display metadata for different group types
const GROUP_META = {
  // Categories
  produce: { emoji: '🥬', name: 'Produce' },
  dairy: { emoji: '🥛', name: 'Dairy' },
  meat: { emoji: '🍖', name: 'Meat' },
  pantry: { emoji: '🥫', name: 'Pantry' },
  frozen: { emoji: '❄️', name: 'Frozen' },
  other: { emoji: '📦', name: 'Other' },
  // Date groups
  today: { emoji: '📅', name: 'Today' },
  yesterday: { emoji: '📅', name: 'Yesterday' },
  'this-week': { emoji: '📅', name: 'This Week' },
  older: { emoji: '📅', name: 'Older' },
  // Status groups
  unchecked: { emoji: '⚪', name: 'Unchecked' },
  checked: { emoji: '✅', name: 'Checked' },
  // No grouping
  all: { emoji: '📋', name: 'All Items' }
};

const ShoppingListCategory = ({ category, items, onCheck, onEdit, onDelete, homeMembers = [] }) => {
  const [expanded, setExpanded] = useState(true);

  // Get display metadata - support user IDs by finding user name
  let meta = GROUP_META[category];
  if (!meta && homeMembers.length > 0) {
    // Check if category is a userId
    const member = homeMembers.find(m => m.id === category);
    if (member) {
      meta = { emoji: '👤', name: member.name };
    }
  }
  // Fallback
  if (!meta) {
    meta = { emoji: '📦', name: category };
  }
  const totalCount = items.length;
  const checkedCount = items.filter(item => item.checked).length;

  const countText = checkedCount > 0
    ? `${checkedCount} of ${totalCount} checked`
    : `${totalCount}`;

  return (
    <div className="category-group">
      <button
        className="category-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="category-title">
          <span className="shopping-list-category-emoji">{meta.emoji}</span>
          <span className="shopping-list-category-name">{meta.name.toUpperCase()}</span>
        </div>
        <div className="shopping-list-category-meta">
          <span className="shopping-list-category-count">{countText}</span>
          <ChevronDown
            size={20}
            className={`category-chevron ${expanded ? 'expanded' : ''}`}
          />
        </div>
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
              homeMembers={homeMembers}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ShoppingListCategory;
