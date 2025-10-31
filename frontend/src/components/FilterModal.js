import React, { useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';

const FilterModal = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onClearFilters
}) => {
  // ESC key handler
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
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
          {/* Location Filters */}
          <div>
            <h3 className="font-medium mb-3 text-color-primary">
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
                  <span className="text-color-secondary">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Expiration Status Filters */}
          <div>
            <h3 className="font-medium mb-3 text-color-primary">
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
                  <span className={
                    id === 'expired' ? 'text-color-error' :
                    id === 'expiring-soon' ? 'text-color-warning' :
                    'text-color-secondary'
                  }>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="pt-4 border-t-light">
            <div className="text-sm text-color-muted">
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
        <div className="modal-footer">
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