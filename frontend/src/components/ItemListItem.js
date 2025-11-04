import React from 'react';
import { Trash2, Sparkles, X, AlertCircle } from 'lucide-react';
import { getExpiryInfo, daysToExpiryDate, calculateRemainingDays } from '../utils/dateUtils';

const ItemListItem = ({ item, onEdit, onDelete, onApplyEnhancement, onDismissEnhancement, processingEnhancement = false }) => {
  const handleRowClick = (e) => {
    // Don't trigger edit if clicking delete button or enhancement actions
    if (e.target.closest('.list-item-actions') || e.target.closest('.pantry-item-enhancement')) {
      return;
    }
    onEdit(item);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    await onDelete(item.id);
  };

  // Custom getExpiryInfo for list items (shows short format)
  const getExpiryInfoForList = (item) => {
    const baseInfo = getExpiryInfo(item);
    if (!baseInfo.remainingDays) return baseInfo;

    // Customize text for list display - shorter format
    if (baseInfo.isExpired) {
      return { ...baseInfo, text: 'Expired!' };
    }
    return { ...baseInfo, text: `${baseInfo.remainingDays}d` };
  };

  const expiryInfo = getExpiryInfoForList(item);
  const ExpiryIcon = expiryInfo.icon;

  return (
    <div className="relative">
      <div
        className="list-item bg-tertiary"
        style={{
          borderLeftColor: expiryInfo.isExpired ? 'var(--color-error)' :
                           expiryInfo.isExpiringSoon ? 'var(--color-warning)' :
                           'var(--border-light)'
        }}
        onClick={handleRowClick}
      >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Item Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-color-primary">
            {item.name}
            {processingEnhancement ? (
              <div className="inline-flex items-center gap-1 ml-1">
                <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent icon-color-primary" />
              </div>
            ) : item.detectedBy === 'ai' && (
              <Sparkles className="inline w-3 h-3 ml-1 icon-color-primary" />
            )}
          </div>
          {item.quantity && (
            <div className="text-xs mt-1 text-color-muted">
              {item.quantity}
            </div>
          )}
        </div>

        {/* Location Badge */}
        <div className="text-xs px-2 py-1 rounded-full bg-card text-color-muted border border-color-light">
          {item.location === 'pantry' ? '🏠' : item.location === 'fridge' ? '❄️' : '🧊'}
        </div>

        {/* Expiry Info */}
        <div className="text-right min-w-[60px]">
          <div className="text-xs font-medium flex items-center justify-end gap-1" style={{ color: expiryInfo.color }}>
            {ExpiryIcon && <ExpiryIcon className="w-3 h-3" />}
            {expiryInfo.text}
          </div>
        </div>
      </div>

      {/* Delete button */}
      <div className="list-item-actions">
        <button
          onClick={handleDelete}
          className="btn-icon-delete"
          aria-label={`Delete ${item.name}`}
          title="Delete item"
        >
          <Trash2 size={16} />
        </button>
      </div>
      </div>
      
      {/* AI Enhancement Overlay */}
      {item.pendingEnhancement && (
        <div className="absolute inset-0 bg-white bg-opacity-95 rounded-lg border-2 border-dashed animate-fade-in pantry-item-enhancement"
             style={{ borderColor: item.pendingEnhancement.isLowConfidence ? 'var(--color-warning)' : 'var(--color-primary)' }}>
          <div className="p-3 h-full flex items-center gap-4">
            <div className="flex items-center gap-2">
              {item.pendingEnhancement.isLowConfidence ? (
                <AlertCircle className="w-4 h-4 icon-color-warning" />
              ) : (
                <Sparkles className="w-4 h-4 icon-color-primary" />
              )}
              <span className={`text-sm font-semibold ${
                item.pendingEnhancement.isLowConfidence ? 'icon-color-warning' : 'icon-color-primary'
              }`}>
                {item.pendingEnhancement.isLowConfidence ? 'Needs review:' : 'AI suggests:'}
              </span>
            </div>

            <div className="flex-1 text-sm text-color-secondary">
              {item.pendingEnhancement.isLowConfidence ? (
                <span className="font-medium text-color-primary">
                  "{item.name}" {item.pendingEnhancement.guidance?.message}
                  {item.pendingEnhancement.guidance?.examples &&
                    ` Try: ${item.pendingEnhancement.guidance.examples.slice(0, 2).join(', ')}`
                  }
                </span>
              ) : (
                <>
                  <span className="font-medium text-color-primary">
                    "{item.name}"
                  </span>
                  <span className="mx-1">→</span>
                  <span className="font-medium icon-color-primary">
                    "{item.pendingEnhancement.name}"
                  </span>
                  {item.pendingEnhancement.quantity && `, ${item.pendingEnhancement.quantity}`}
                  {' '}in {item.pendingEnhancement.location}, expires in {item.pendingEnhancement.expiresAt ? `${calculateRemainingDays(item.pendingEnhancement.expiresAt)} days` : `${item.pendingEnhancement.daysUntilExpiry} days`}
                </>
              )}
            </div>

            <div className="flex gap-2">
              {item.pendingEnhancement.isLowConfidence ? (
                <button
                  onClick={() => onEdit(item)}
                  className="btn-base btn-warning px-3 py-1 text-sm font-medium"
                >
                  Update
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onApplyEnhancement?.(item.id, item.pendingEnhancement)}
                    className="btn-base btn-success px-3 py-1 text-sm font-medium"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => onEdit({
                      ...item,
                      name: item.pendingEnhancement.name,
                      quantity: item.pendingEnhancement.quantity || item.quantity,
                      location: item.pendingEnhancement.location,
                      expiresAt: item.pendingEnhancement.expiresAt || daysToExpiryDate(item.pendingEnhancement.daysUntilExpiry || 7)
                    })}
                    className="btn-base btn-secondary px-3 py-1 text-sm"
                  >
                    Edit
                  </button>
                </>
              )}
              <button
                onClick={() => onDismissEnhancement?.(item.id)}
                className="p-1 rounded hover:bg-gray-100 transition-colors text-color-muted"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemListItem;