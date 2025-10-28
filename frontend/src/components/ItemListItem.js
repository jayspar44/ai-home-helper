import React from 'react';
import { Trash2, Sparkles, X, AlertCircle } from 'lucide-react';
import { getExpiryInfo, daysToExpiryDate, calculateRemainingDays } from '../utils/dateUtils';

const ItemListItem = ({ item, onEdit, onDelete, onApplyEnhancement, onDismissEnhancement, processingEnhancement = false }) => {
  const handleRowClick = (e) => {
    // Don't trigger edit if clicking delete button or enhancement actions
    if (e.target.closest('.pantry-item-actions') || e.target.closest('.pantry-item-enhancement')) {
      return;
    }
    onEdit(item);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(item.id);
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
    <div className="relative pantry-list-item-wrapper">
      <div
        className="flex items-center justify-between p-3 rounded-lg transition-colors border-l-4 pantry-list-item"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          borderLeftColor: expiryInfo.isExpired ? 'var(--color-error)' :
                           expiryInfo.isExpiringSoon ? 'var(--color-warning)' :
                           'var(--border-light)',
          cursor: 'pointer'
        }}
        onClick={handleRowClick}
      >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Item Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            {item.name}
            {processingEnhancement ? (
              <div className="inline-flex items-center gap-1 ml-1">
                <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent" 
                     style={{ color: 'var(--color-primary)' }} />
              </div>
            ) : item.detectedBy === 'ai' && (
              <Sparkles className="inline w-3 h-3 ml-1" style={{ color: 'var(--color-primary)' }} />
            )}
          </div>
          {item.quantity && (
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {item.quantity}
            </div>
          )}
        </div>

        {/* Location Badge */}
        <div className="text-xs px-2 py-1 rounded-full" style={{ 
          backgroundColor: 'var(--bg-card)', 
          color: 'var(--text-muted)',
          border: '1px solid var(--border-light)'
        }}>
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
      <div className="pantry-item-actions">
        <button
          onClick={handleDelete}
          className="pantry-delete-btn"
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
                <AlertCircle className="w-4 h-4" style={{ color: 'var(--color-warning)' }} />
              ) : (
                <Sparkles className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
              )}
              <span className="text-sm font-semibold" style={{ 
                color: item.pendingEnhancement.isLowConfidence ? 'var(--color-warning)' : 'var(--color-primary)' 
              }}>
                {item.pendingEnhancement.isLowConfidence ? 'Needs review:' : 'AI suggests:'}
              </span>
            </div>
            
            <div className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {item.pendingEnhancement.isLowConfidence ? (
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  "{item.name}" {item.pendingEnhancement.guidance?.message}
                  {item.pendingEnhancement.guidance?.examples && 
                    ` Try: ${item.pendingEnhancement.guidance.examples.slice(0, 2).join(', ')}`
                  }
                </span>
              ) : (
                <>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    "{item.name}"
                  </span>
                  <span className="mx-1">→</span>
                  <span className="font-medium" style={{ color: 'var(--color-primary)' }}>
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
                  className="btn-base px-3 py-1 text-sm font-medium"
                  style={{ 
                    backgroundColor: 'var(--color-warning)', 
                    color: 'white',
                    border: '1px solid var(--color-warning)'
                  }}
                >
                  Update
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => onApplyEnhancement?.(item.id, item.pendingEnhancement)}
                    className="btn-base px-3 py-1 text-sm font-medium"
                    style={{ 
                      backgroundColor: 'var(--color-primary)', 
                      color: 'white',
                      border: '1px solid var(--color-primary)'
                    }}
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
                    className="btn-base px-3 py-1 text-sm"
                    style={{ 
                      backgroundColor: 'var(--bg-card)', 
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)'
                    }}
                  >
                    Edit
                  </button>
                </>
              )}
              <button 
                onClick={() => onDismissEnhancement?.(item.id)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--text-muted)' }}
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