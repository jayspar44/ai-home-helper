import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { daysToExpiryDate, expiryDateToDays } from '../utils/dateUtils';

const LocationSelect = ({ value, onChange, disabled }) => (
  <select 
    value={value} 
    onChange={e => onChange(e.target.value)}
    className="input-base focus-ring"
    disabled={disabled}
  >
    <option value="pantry">🏠 Pantry</option>
    <option value="fridge">❄️ Fridge</option>
    <option value="freezer">🧊 Freezer</option>
  </select>
);

const EditItemModal = ({ 
  isOpen, 
  item, 
  onClose, 
  onSave,
  onDelete
}) => {
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    expiresAt: '',
    location: 'pantry'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        quantity: item.quantity || '',
        expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().split('T')[0] : (item.daysUntilExpiry ? daysToExpiryDate(item.daysUntilExpiry).toISOString().split('T')[0] : ''),
        location: item.location || 'pantry'
      });
      setError('');
    }
  }, [item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const updatedItem = {
        ...item,
        name: formData.name.trim(),
        location: formData.location,
        ...(formData.quantity && { quantity: formData.quantity }),
        ...(formData.expiresAt && { expiresAt: new Date(formData.expiresAt) }),
      };

      await onSave(updatedItem);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        setIsLoading(true);
        await onDelete(item.id);
        onClose();
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Edit Item
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-opacity-80 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-4 rounded-lg" style={{ 
                backgroundColor: 'var(--color-error-light)', 
                borderLeft: '4px solid var(--color-error)',
                color: 'var(--color-error)' 
              }}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="editItemName" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Item Name *
              </label>
              <input
                type="text"
                id="editItemName"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input-base focus-ring w-full"
                placeholder="e.g., 'eggs', 'milk', 'chocolate'"
                required
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label htmlFor="editQuantity" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Quantity
              </label>
              <input 
                type="text" 
                id="editQuantity" 
                value={formData.quantity} 
                onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                className="input-base focus-ring w-full" 
                placeholder="e.g., 1 dozen"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label htmlFor="editExpiresAt" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Expires on
              </label>
              <input
                type="date"
                id="editExpiresAt"
                value={formData.expiresAt}
                onChange={e => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                className="input-base focus-ring w-full" 
                placeholder="e.g., 7"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label htmlFor="editLocation" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Location
              </label>
              <LocationSelect 
                value={formData.location} 
                onChange={value => setFormData(prev => ({ ...prev, location: value }))}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between p-6 pt-0 border-t" style={{ borderColor: 'var(--border-light)' }}>
            <button 
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="btn-base px-4 py-2"
              style={{ 
                backgroundColor: 'var(--color-error-light)',
                color: 'var(--color-error)',
                borderColor: 'var(--color-error)'
              }}
            >
              Delete Item
            </button>
            
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={onClose} 
                disabled={isLoading}
                className="btn-base btn-ghost"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isLoading || !formData.name.trim()}
                className="btn-base btn-primary"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditItemModal;
