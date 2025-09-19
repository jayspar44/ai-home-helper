import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Edit2, Trash2, Sparkles, Clock, AlertTriangle, X, AlertCircle } from 'lucide-react';
import { getExpiryInfo, daysToExpiryDate, calculateRemainingDays } from '../utils/dateUtils';

const ItemListItem = ({ item, onEdit, onDelete, onApplyEnhancement, onDismissEnhancement, processingEnhancement = false }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ right: 0, top: '100%', left: 'auto', bottom: 'auto' });
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const portalMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (portalMenuRef.current && !portalMenuRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate optimal menu position when opening menu
  const calculateMenuPosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0 };

    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 140; // Minimum width of menu
    const menuHeight = 88; // Approximate height of menu (44px * 2 items)
    
    // Calculate position relative to viewport
    let top = rect.bottom + 4; // 4px gap below button
    let left = rect.right - menuWidth; // Align right edge
    
    // Adjust if menu would overflow viewport
    if (left < 8) {
      left = rect.left; // Align left edge instead
    }
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }
    
    // Open upward if no space below
    if (top + menuHeight > window.innerHeight - 8) {
      top = rect.top - menuHeight - 4;
    }
    
    // Ensure menu stays within viewport
    if (top < 8) {
      top = 8;
    }
    
    return { top, left };
  };

  const handleMenuToggle = () => {
    if (!showMenu) {
      setMenuPosition(calculateMenuPosition());
    }
    setShowMenu(!showMenu);
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
        className="flex items-center justify-between p-3 rounded-lg hover:bg-opacity-50 transition-colors border-l-4"
        style={{ 
          backgroundColor: 'var(--bg-tertiary)',
          borderLeftColor: expiryInfo.isExpired ? 'var(--color-error)' : 
                           expiryInfo.isExpiringSoon ? 'var(--color-warning)' : 
                           'var(--border-light)'
        }}
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

      {/* Three-dot menu */}
      <div className="relative ml-4" ref={menuRef}>
        <button
          ref={buttonRef}
          onClick={handleMenuToggle}
          className="p-2 rounded hover:bg-opacity-80 transition-colors"
          style={{ 
            color: 'var(--text-muted)',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Item options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMenu && createPortal(
          <div 
            className="fixed bg-white rounded-lg shadow-xl border min-w-[140px]"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border-light)',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              zIndex: 9999,
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`
            }}
          >
            <button
              onClick={() => {
                onEdit(item);
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors rounded-t-lg"
              style={{ 
                color: 'var(--text-primary)',
                minHeight: '44px'
              }}
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => {
                onDelete(item.id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-red-50 flex items-center gap-3 transition-colors rounded-b-lg"
              style={{ 
                color: 'var(--color-error)',
                minHeight: '44px'
              }}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>,
          document.body
        )}
      </div>
      </div>
      
      {/* AI Enhancement Overlay */}
      {item.pendingEnhancement && (
        <div className="absolute inset-0 bg-white bg-opacity-95 rounded-lg border-2 border-dashed animate-fade-in"
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