import React from 'react';
import { Search, Filter, LayoutGrid, List } from 'lucide-react';

const PantryToolbar = ({ 
  searchQuery, 
  onSearchChange, 
  viewMode, 
  onViewModeChange, 
  onOpenFilter,
  activeFiltersCount 
}) => {
  return (
    <div className="card p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          </div>
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input-base focus-ring pl-10 w-full"
          />
        </div>

        {/* Filter Button */}
        <button
          onClick={onOpenFilter}
          className="btn-base btn-ghost px-4 py-2 flex items-center gap-2 relative"
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFiltersCount > 0 && (
            <span 
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <button
            onClick={() => onViewModeChange('card')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'card' 
                ? 'bg-white shadow-sm' 
                : 'hover:bg-white hover:bg-opacity-50'
            }`}
            style={{ 
              backgroundColor: viewMode === 'card' ? 'var(--bg-card)' : 'transparent',
              color: viewMode === 'card' ? 'var(--color-primary)' : 'var(--text-muted)'
            }}
            aria-label="Card view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list' 
                ? 'bg-white shadow-sm' 
                : 'hover:bg-white hover:bg-opacity-50'
            }`}
            style={{ 
              backgroundColor: viewMode === 'list' ? 'var(--bg-card)' : 'transparent',
              color: viewMode === 'list' ? 'var(--color-primary)' : 'var(--text-muted)'
            }}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PantryToolbar;