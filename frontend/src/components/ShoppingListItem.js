import React from 'react';
import { Trash2, Check } from 'lucide-react';
import { formatRelativeTime } from '../utils/dateUtils';

/**
 * Shopping list item component - matches pantry design
 * Features checkbox, plain text display, click-to-edit modal pattern
 */
const ShoppingListItem = ({ item, onCheck, onEdit, onDelete, homeMembers = [] }) => {
  const handleRowClick = (e) => {
    // Don't trigger edit if clicking checkbox or delete button
    if (e.target.closest('.shopping-list-checkbox') || e.target.closest('.list-item-actions')) {
      return;
    }
    onEdit(item);
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onCheck(item.id, !item.checked);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(item.id);
  };

  // Get user name from ID
  const getUserName = (userId) => {
    if (!userId || homeMembers.length === 0) return null;
    const member = homeMembers.find(m => m.id === userId);
    return member ? member.name : null;
  };

  // Format metadata string
  const getMetadataText = () => {
    const timeText = formatRelativeTime(item.addedAt);
    const userName = getUserName(item.addedBy);

    // Only show user name if there are multiple members
    if (homeMembers.length > 1 && userName) {
      return `${timeText} • ${userName}`;
    }
    return timeText;
  };

  // Get category emoji
  const getCategoryEmoji = (category) => {
    const emojiMap = {
      produce: '🥬',
      dairy: '🥛',
      meat: '🥩',
      pantry: '🏺',
      frozen: '❄️',
      other: '📦'
    };
    return emojiMap[category] || '📦';
  };

  return (
    <div className="relative">
      <div
        className="list-item"
        onClick={handleRowClick}
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          borderLeftColor: item.checked ? 'var(--color-success)' : 'var(--border-light)'
        }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Checkbox button */}
          <button
            className="shopping-list-checkbox"
            onClick={handleCheckboxClick}
            aria-label={`Check ${item.name}`}
            style={{
              backgroundColor: item.checked ? 'var(--color-success)' : 'transparent',
              border: item.checked ? 'none' : '2px solid var(--border-medium)',
              color: 'white'
            }}
          >
            {item.checked && <Check size={16} />}
          </button>

          {/* Item info - plain text like pantry */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm" style={{
              color: item.checked ? 'var(--text-muted)' : 'var(--text-primary)',
              textDecoration: item.checked ? 'line-through' : 'none'
            }}>
              {item.name}
              <span className="text-xs font-normal ml-2" style={{ color: 'var(--text-muted)' }}>
                {item.quantity} {item.unit}
              </span>
              {item.source?.name && (
                <span className="text-xs ml-2 font-normal italic" style={{ color: 'var(--text-muted)' }}>
                  (from {item.source.name})
                </span>
              )}
            </div>
            {/* Metadata (time + user) */}
            {item.addedAt && (
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {getMetadataText()}
              </div>
            )}
          </div>

          {/* Category badge (matching pantry location badge styling) */}
          <div className="text-xs px-2 py-1 rounded-full" style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-light)'
          }}>
            {getCategoryEmoji(item.category)}
          </div>
        </div>

        {/* Delete button (fade in on hover like pantry) */}
        <div className="list-item-actions">
          <button
            onClick={handleDelete}
            className="btn-icon-delete"
            aria-label={`Delete ${item.name}`}
            title="Delete item"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShoppingListItem;
