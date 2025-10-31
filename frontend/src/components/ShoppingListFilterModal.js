import React from 'react';
import { X, RotateCcw } from 'lucide-react';

/**
 * Filter modal for shopping list
 * Allows filtering by category, status, user, and date
 */
const ShoppingListFilterModal = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onClearFilters,
  homeMembers = []
}) => {
  if (!isOpen) return null;

  const handleCategoryChange = (category, checked) => {
    const newCategories = checked
      ? [...filters.categories, category]
      : filters.categories.filter(c => c !== category);

    onFiltersChange({
      ...filters,
      categories: newCategories
    });
  };

  const handleStatusChange = (status) => {
    onFiltersChange({
      ...filters,
      status
    });
  };

  const handleUserChange = (userId, checked) => {
    const newUsers = checked
      ? [...filters.users, userId]
      : filters.users.filter(u => u !== userId);

    onFiltersChange({
      ...filters,
      users: newUsers
    });
  };

  const handleDateChange = (dateAdded) => {
    onFiltersChange({
      ...filters,
      dateAdded
    });
  };

  const isFilterActive = () => {
    const defaultFilters = {
      categories: ['produce', 'dairy', 'meat', 'pantry', 'frozen', 'other'],
      status: 'all',
      users: [],
      dateAdded: 'all'
    };

    return JSON.stringify(filters) !== JSON.stringify(defaultFilters);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            Filter Items
          </h2>
          <div className="flex items-center gap-2">
            {isFilterActive() && (
              <button
                onClick={onClearFilters}
                className="modal-close flex items-center gap-1 text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
            <button
              onClick={onClose}
              className="modal-close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="modal-body space-y-6">
          {/* Category Filters */}
          <div>
            <h3 className="font-medium mb-3 text-color-primary">
              Category
            </h3>
            <div className="space-y-2">
              {[
                { id: 'produce', label: '🥬 Produce' },
                { id: 'dairy', label: '🥛 Dairy' },
                { id: 'meat', label: '🍖 Meat' },
                { id: 'pantry', label: '🥫 Pantry' },
                { id: 'frozen', label: '❄️ Frozen' },
                { id: 'other', label: '📦 Other' }
              ].map(({ id, label }) => (
                <label key={id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(id)}
                    onChange={(e) => handleCategoryChange(id, e.target.checked)}
                    className="form-checkbox h-4 w-4 rounded"
                    style={{
                      accentColor: 'var(--color-primary)',
                      color: 'var(--color-primary)'
                    }}
                  />
                  <span className="text-color-secondary">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <h3 className="font-medium mb-3 text-color-primary">
              Status
            </h3>
            <div className="space-y-2">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'unchecked', label: 'Unchecked Only' },
                { id: 'checked', label: 'Checked Only' }
              ].map(({ id, label }) => (
                <label key={id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={filters.status === id}
                    onChange={() => handleStatusChange(id)}
                    className="form-radio h-4 w-4"
                    style={{
                      accentColor: 'var(--color-primary)',
                      color: 'var(--color-primary)'
                    }}
                  />
                  <span className="text-color-secondary">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* User Filter - only show if multiple members */}
          {homeMembers.length > 1 && (
            <div>
              <h3 className="font-medium mb-3 text-color-primary">
                Added By
              </h3>
              <div className="space-y-2">
                {homeMembers.map(member => (
                  <label key={member.id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.users.includes(member.id)}
                      onChange={(e) => handleUserChange(member.id, e.target.checked)}
                      className="form-checkbox h-4 w-4 rounded"
                      style={{
                        accentColor: 'var(--color-primary)',
                        color: 'var(--color-primary)'
                      }}
                    />
                    <span className="text-color-secondary">{member.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Date Added Filter */}
          <div>
            <h3 className="font-medium mb-3 text-color-primary">
              Date Added
            </h3>
            <div className="space-y-2">
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'this-week', label: 'This Week' },
                { id: 'older', label: 'Older' }
              ].map(({ id, label }) => (
                <label key={id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="dateAdded"
                    checked={filters.dateAdded === id}
                    onChange={() => handleDateChange(id)}
                    className="form-radio h-4 w-4"
                    style={{
                      accentColor: 'var(--color-primary)',
                      color: 'var(--color-primary)'
                    }}
                  />
                  <span className="text-color-secondary">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingListFilterModal;
