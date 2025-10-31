import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Trash2 } from 'lucide-react';

const CategorySelect = ({ value, onChange, disabled }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className="input-base focus-ring"
    disabled={disabled}
  >
    <option value="produce">🥬 Produce</option>
    <option value="dairy">🥛 Dairy</option>
    <option value="meat">🥩 Meat</option>
    <option value="pantry">🏺 Pantry</option>
    <option value="frozen">❄️ Frozen</option>
    <option value="other">📦 Other</option>
  </select>
);

const EditShoppingItemModal = ({
  isOpen,
  item,
  onClose,
  onSave,
  onDelete
}) => {
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: '',
    category: 'other'
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
        unit: item.unit || '',
        category: item.category || 'other'
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
      const updates = {
        name: formData.name.trim(),
        quantity: parseFloat(formData.quantity) || 1,
        unit: formData.unit.trim() || '',
        category: formData.category
      };

      await onSave(item.id, updates);
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            Edit Shopping Item
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
                placeholder="e.g., 'milk', 'chicken', 'apples'"
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="editQuantity" className="block text-sm font-medium mb-2 text-color-secondary">
                  Quantity
                </label>
                <input
                  type="number"
                  id="editQuantity"
                  value={formData.quantity}
                  onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  className="input-base focus-ring w-full"
                  placeholder="e.g., 2"
                  min="0"
                  step="0.1"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="editUnit" className="block text-sm font-medium mb-2 text-color-secondary">
                  Unit
                </label>
                <input
                  type="text"
                  id="editUnit"
                  value={formData.unit}
                  onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="input-base focus-ring w-full"
                  placeholder="e.g., lbs"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="editCategory" className="block text-sm font-medium mb-2 text-color-secondary">
                Category
              </label>
              <CategorySelect
                value={formData.category}
                onChange={value => setFormData(prev => ({ ...prev, category: value }))}
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

export default EditShoppingItemModal;
