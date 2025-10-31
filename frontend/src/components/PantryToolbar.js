import React from 'react';
import { Search, Filter, Download, ChevronDown } from 'lucide-react';

const PantryToolbar = ({
  searchQuery,
  onSearchChange,
  onOpenFilter,
  activeFiltersCount,
  groupBy = 'none',
  onGroupByChange,
  onCreateRecipe,
  onExportJSON,
  totalItems
}) => {
  // Group by options
  const groupByOptions = [
    { value: 'location', label: 'Location' },
    { value: 'expiration', label: 'Expiration' },
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
            <div className="shopping-list-item-count">
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Bottom Row: Filter + Actions */}
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {/* JSON Export Button */}
            <button
              onClick={onExportJSON}
              disabled={totalItems === 0}
              className={`p-2 rounded-lg transition-colors disabled:opacity-50 bg-tertiary border border-color-light ${
                totalItems > 0 ? 'text-color-primary' : 'text-color-muted'
              }`}
              title={totalItems === 0 ? 'Add some items to export data' : `Export ${totalItems} items as JSON`}
              aria-label="Export pantry data as JSON"
            >
              <Download className="icon-small" />
            </button>

            {/* Create Recipe Button */}
            <button
              onClick={onCreateRecipe}
              disabled={totalItems === 0}
              className={`btn-base px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 border-0 ${
                totalItems > 0 ? 'text-white' : 'text-color-muted'
              }`}
              style={{
                background: totalItems > 0 ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)' : 'var(--bg-tertiary)'
              }}
              title={totalItems === 0 ? 'Add some items to create recipes' : `Create recipe with ${totalItems} items`}
            >
              ✨ Recipe ({totalItems})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PantryToolbar;