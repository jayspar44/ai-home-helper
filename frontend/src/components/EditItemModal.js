import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Trash2 } from 'lucide-react';
import { daysToExpiryDate, expiryDateToDays, safeToDateInputValue } from '../utils/dateUtils';

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

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        quantity: item.quantity || '',
        expiresAt: item.expiresAt ? safeToDateInputValue(item.expiresAt) : (item.daysUntilExpiry ? safeToDateInputValue(daysToExpiryDate(item.daysUntilExpiry)) : ''),
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
    try {
      setIsLoading(true);
      await onDelete(item.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            Edit Item
          </h2>
          <button
            onClick={onClose}
            className="modal-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            {error && (
              <div className="alert alert-error">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="editItemName" className="block text-sm font-medium mb-2 text-color-secondary">
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
              <label htmlFor="editQuantity" className="block text-sm font-medium mb-2 text-color-secondary">
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
              <label htmlFor="editExpiresAt" className="block text-sm font-medium mb-2 text-color-secondary">
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
              <label htmlFor="editLocation" className="block text-sm font-medium mb-2 text-color-secondary">
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
          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="btn-icon-delete"
              aria-label={`Delete ${item.name}`}
              title="Delete item"
            >
              <Trash2 size={20} />
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
