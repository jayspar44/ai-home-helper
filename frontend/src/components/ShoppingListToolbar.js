import React from 'react';
import { Search, Filter, Trash2, ChevronDown } from 'lucide-react';

/**
 * Toolbar for shopping list with search, filters, grouping, and actions
 */
const ShoppingListToolbar = ({
  searchQuery,
  onSearchChange,
  onOpenFilter,
  activeFiltersCount = 0,
  groupBy = 'category',
  onGroupByChange,
  totalItems = 0,
  checkedItems = 0,
  onClearChecked,
  homeMembers = []
}) => {
  // Group by options (conditional on home members count)
  const groupByOptions = [
    { value: 'category', label: 'Category' },
    { value: 'date', label: 'Date Added' },
    ...(homeMembers.length > 1 ? [{ value: 'user', label: 'User' }] : []),
    { value: 'status', label: 'Status' },
    { value: 'none', label: 'No Grouping' }
  ];

  return (
    <div className="card p-4 mb-6">
      <div className="flex flex-col gap-4">
        {/* Top Row: Search + Item Count */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 icon-color-muted" />
            </div>
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input-base focus-ring w-full"
              style={{ paddingLeft: '48px' }}
            />
          </div>

          {/* Item Count Badge */}
          {totalItems > 0 && (
            <div className="item-count-badge">
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Bottom Row: Filter + Group By + Actions */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Filter Button */}
          <button
            onClick={onOpenFilter}
            className="btn-base btn-ghost px-4 py-2 flex items-center gap-2 relative"
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="notification-badge">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Group By Selector */}
          <div className="relative">
            <select
              value={groupBy}
              onChange={(e) => onGroupByChange(e.target.value)}
              className="btn-base btn-ghost px-4 py-2.5 appearance-none cursor-pointer"
              style={{
                backgroundImage: 'none',
                lineHeight: '1.5',
                paddingRight: '2.5rem',
                minWidth: '160px'
              }}
            >
              {groupByOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="w-4 h-4 icon-color-muted absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
            />
          </div>

          {/* Clear Checked Button */}
          {checkedItems > 0 && (
            <button
              onClick={onClearChecked}
              className="btn-base btn-error px-4 py-2 text-sm font-medium flex items-center gap-2 transition-all ml-auto"
            >
              <Trash2 size={16} />
              Clear {checkedItems} Checked
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShoppingListToolbar;
