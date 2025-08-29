import React from 'react';
import { X, RotateCcw } from 'lucide-react';

const FilterModal = ({ 
  isOpen, 
  onClose, 
  filters, 
  onFiltersChange,
  onClearFilters 
}) => {
  if (!isOpen) return null;

  const handleLocationChange = (location, checked) => {
    const newLocations = checked 
      ? [...filters.locations, location]
      : filters.locations.filter(l => l !== location);
    
    onFiltersChange({
      ...filters,
      locations: newLocations
    });
  };

  const handleExpirationStatusChange = (status) => {
    onFiltersChange({
      ...filters,
      expirationStatus: status
    });
  };

  const isFilterActive = () => {
    const defaultFilters = {
      locations: ['pantry', 'fridge', 'freezer'],
      expirationStatus: 'all'
    };
    
    return JSON.stringify(filters) !== JSON.stringify(defaultFilters);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Filter Items
          </h2>
          <div className="flex items-center gap-2">
            {isFilterActive() && (
              <button
                onClick={onClearFilters}
                className="p-2 rounded-lg hover:bg-opacity-80 transition-colors flex items-center gap-1 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-opacity-80 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Location Filters */}
          <div>
            <h3 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              Location
            </h3>
            <div className="space-y-2">
              {[
                { id: 'pantry', label: '🏠 Pantry', emoji: '🏠' },
                { id: 'fridge', label: '❄️ Fridge', emoji: '❄️' },
                { id: 'freezer', label: '🧊 Freezer', emoji: '🧊' }
              ].map(({ id, label }) => (
                <label key={id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.locations.includes(id)}
                    onChange={(e) => handleLocationChange(id, e.target.checked)}
                    className="form-checkbox h-4 w-4 rounded"
                    style={{ 
                      accentColor: 'var(--color-primary)',
                      color: 'var(--color-primary)'
                    }}
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Expiration Status Filters */}
          <div>
            <h3 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              Expiration Status
            </h3>
            <div className="space-y-2">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'fresh', label: 'Fresh (8+ days)' },
                { id: 'expiring-soon', label: 'Expiring Soon (1-7 days)' },
                { id: 'expired', label: 'Expired' }
              ].map(({ id, label }) => (
                <label key={id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="expirationStatus"
                    checked={filters.expirationStatus === id}
                    onChange={() => handleExpirationStatusChange(id)}
                    className="form-radio h-4 w-4"
                    style={{ 
                      accentColor: 'var(--color-primary)',
                      color: 'var(--color-primary)'
                    }}
                  />
                  <span 
                    style={{ 
                      color: id === 'expired' ? 'var(--color-error)' :
                             id === 'expiring-soon' ? 'var(--color-warning)' :
                             'var(--text-secondary)'
                    }}
                  >
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              <div className="flex justify-between py-1">
                <span>Selected locations:</span>
                <span>{filters.locations.length}/3</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Status filter:</span>
                <span className="capitalize">
                  {filters.expirationStatus === 'expiring-soon' ? 'Expiring Soon' : 
                   filters.expirationStatus === 'all' ? 'All' :
                   filters.expirationStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 pt-0">
          <button 
            onClick={onClose} 
            className="btn-base btn-ghost"
          >
            Cancel
          </button>
          <button 
            onClick={onClose} 
            className="btn-base btn-primary"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;