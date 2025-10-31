import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import ItemListItem from './ItemListItem';

/**
 * Category section for pantry items
 * Features collapsible header with emoji and item counts
 */

// Display metadata for different group types
const GROUP_META = {
  // Location groups
  pantry: { emoji: '🏠', name: 'Pantry' },
  fridge: { emoji: '❄️', name: 'Fridge' },
  freezer: { emoji: '🧊', name: 'Freezer' },
  // Expiration groups
  fresh: { emoji: '✅', name: 'Fresh' },
  'expiring-soon': { emoji: '⚠️', name: 'Expiring Soon' },
  expired: { emoji: '❌', name: 'Expired' },
  // No grouping
  all: { emoji: '📦', name: 'All Items' }
};

const PantryCategory = ({
  category,
  items,
  onEdit,
  onDelete,
  onApplyEnhancement,
  onDismissEnhancement,
  processingEnhancementIds = []
}) => {
  const [expanded, setExpanded] = useState(true);

  // Get display metadata
  const meta = GROUP_META[category] || { emoji: '📦', name: category };
  const totalCount = items.length;

  const countText = `${totalCount}`;

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
            <ItemListItem
              key={item.id}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              onApplyEnhancement={onApplyEnhancement}
              onDismissEnhancement={onDismissEnhancement}
              processingEnhancement={processingEnhancementIds.includes(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PantryCategory;
