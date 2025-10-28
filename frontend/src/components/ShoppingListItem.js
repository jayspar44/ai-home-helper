import React, { useState, useEffect } from 'react';
import { Trash2, Check } from 'lucide-react';
import { formatRelativeTime } from '../utils/dateUtils';

/**
 * Individual shopping list item with inline editing
 * Features checkbox, editable name/quantity/unit, delete button, metadata display
 */
const ShoppingListItem = ({ item, onCheck, onEdit, onDelete, homeMembers = [] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(item.name);
  const [editedQuantity, setEditedQuantity] = useState(item.quantity);
  const [editedUnit, setEditedUnit] = useState(item.unit);
  const [showMetadata, setShowMetadata] = useState(false);

  // Update local state when item prop changes
  useEffect(() => {
    setEditedName(item.name);
    setEditedQuantity(item.quantity);
    setEditedUnit(item.unit);
  }, [item]);

  const handleCheckboxChange = () => {
    onCheck(item.id, !item.checked);
  };

  const handleSaveName = () => {
    if (editedName.trim() !== item.name && editedName.trim().length > 0) {
      onEdit(item.id, { name: editedName.trim() });
    } else {
      setEditedName(item.name); // Revert if empty or unchanged
    }
  };

  const handleSaveQuantity = () => {
    const quantity = parseFloat(editedQuantity);
    if (!isNaN(quantity) && quantity > 0 && quantity !== item.quantity) {
      onEdit(item.id, { quantity });
    } else {
      setEditedQuantity(item.quantity); // Revert if invalid
    }
  };

  const handleSaveUnit = () => {
    if (editedUnit.trim() !== item.unit && editedUnit.trim().length > 0) {
      onEdit(item.id, { unit: editedUnit.trim() });
    } else {
      setEditedUnit(item.unit); // Revert if empty or unchanged
    }
  };

  const handleDelete = () => {
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

  return (
    <div
      className={`shopping-list-item ${item.checked ? 'checked' : ''}`}
      onMouseEnter={() => setShowMetadata(true)}
      onMouseLeave={() => setShowMetadata(false)}
    >
      <button
        className="shopping-list-checkbox"
        onClick={handleCheckboxChange}
        aria-label={`Check ${item.name}`}
        style={{
          backgroundColor: item.checked ? 'var(--color-success)' : 'transparent',
          border: item.checked ? 'none' : '2px solid var(--border-medium)',
          color: 'white'
        }}
      >
        {item.checked && <Check size={16} />}
      </button>

      <div className="shopping-list-item-details">
        <div className="shopping-list-item-main">
          <input
            type="text"
            className="shopping-list-item-name"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleSaveName}
            onKeyPress={(e) => e.key === 'Enter' && e.target.blur()}
            disabled={item.checked}
          />

          <div className="shopping-list-item-quantity">
            <input
              type="number"
              className="shopping-list-quantity-input"
              value={editedQuantity}
              onChange={(e) => setEditedQuantity(e.target.value)}
              onBlur={handleSaveQuantity}
              onKeyPress={(e) => e.key === 'Enter' && e.target.blur()}
              disabled={item.checked}
              min="0"
              step="0.1"
            />
            <input
              type="text"
              className="shopping-list-unit-input"
              value={editedUnit}
              onChange={(e) => setEditedUnit(e.target.value)}
              onBlur={handleSaveUnit}
              onKeyPress={(e) => e.key === 'Enter' && e.target.blur()}
              disabled={item.checked}
            />
          </div>
        </div>

        {item.source?.name && (
          <span className="shopping-list-item-source">
            From: {item.source.name}
          </span>
        )}

        {/* Metadata - show on hover/tap */}
        {showMetadata && item.addedAt && (
          <span className="shopping-list-item-metadata">
            {getMetadataText()}
          </span>
        )}
      </div>

      <div className="shopping-list-item-actions">
        <button
          className="shopping-list-delete-btn"
          onClick={handleDelete}
          aria-label={`Delete ${item.name}`}
          title="Delete item"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default ShoppingListItem;
