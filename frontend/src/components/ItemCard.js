import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Edit2, Trash2, Sparkles, Clock, AlertTriangle, X, AlertCircle } from 'lucide-react';
import { getExpiryInfo, daysToExpiryDate, calculateRemainingDays } from '../utils/dateUtils';

const ItemCard = ({ item, onEdit, onDelete, onApplyEnhancement, onDismissEnhancement, processingEnhancement = false }) => {
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

  // getExpiryInfo moved to dateUtils

  const expiryInfo = getExpiryInfo(item);
  const ExpiryIcon = expiryInfo.icon;

  return (
    <div 
      className={`card-interactive p-4 rounded-lg hover-lift transition-all duration-200 relative ${showMenu ? 'overflow-visible' : ''}`}
      style={{ 
        backgroundColor: 'var(--bg-tertiary)',
        border: expiryInfo.isExpired ? '2px solid var(--color-error)' : 
               expiryInfo.isExpiringSoon ? '2px solid var(--color-warning)' : 
               '1px solid var(--border-light)',
        minHeight: '140px'
      }}
    >
      {/* Expired/Expiring Soon Badge */}
      {(expiryInfo.isExpired || expiryInfo.isExpiringSoon) && (
        <div 
          className="absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
          style={{ 
            backgroundColor: expiryInfo.isExpired ? 'var(--color-error)' : 'var(--color-warning)',
            color: 'white',
            zIndex: 1
          }}
        >
          {ExpiryIcon && <ExpiryIcon className="w-3 h-3" />}
          {expiryInfo.isExpired ? 'Expired' : 'Soon'}
        </div>
      )}

      <div className="flex flex-col h-full">
        {/* Item Name */}
        <div className="flex-1 mb-3">
          <h3 
            className="font-medium text-sm leading-tight mb-2"
            style={{ 
              color: 'var(--text-primary)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
            title={item.name}
          >
            {item.name}
          </h3>
          
          {/* Location Badge */}
          <div className="inline-flex items-center text-xs px-2 py-1 rounded-full mb-2" 
               style={{ 
                 backgroundColor: 'var(--bg-card)', 
                 color: 'var(--text-muted)',
                 border: '1px solid var(--border-light)'
               }}>
            <span className="mr-1">
              {item.location === 'pantry' ? '🏠' : item.location === 'fridge' ? '❄️' : '🧊'}
            </span>
            <span className="capitalize">{item.location}</span>
          </div>

          {/* Quantity */}
          {item.quantity && (
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Qty: {item.quantity}
            </div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="flex items-end justify-between">
          {/* Expiry Info */}
          <div className="flex-1">
            <div className="text-xs font-medium flex items-center gap-1" style={{ color: expiryInfo.color }}>
              {ExpiryIcon && <ExpiryIcon className="w-3 h-3" />}
              <span className="truncate">{expiryInfo.text}</span>
            </div>
            
            {/* AI Badge / Processing Indicator */}
            {processingEnhancement ? (
              <div className="text-xs mt-1 inline-flex items-center gap-1" 
                   style={{ color: 'var(--color-primary)' }}>
                <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent" />
                AI processing...
              </div>
            ) : item.detectedBy === 'ai' && (
              <div className="text-xs mt-1 inline-flex items-center gap-1" 
                   style={{ color: 'var(--color-primary)' }}>
                <Sparkles className="w-3 h-3" /> AI
              </div>
            )}
          </div>

          {/* Three-dot menu */}
          <div className="relative ml-2" ref={menuRef}>
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
                ref={portalMenuRef}
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
      </div>

      {/* AI Enhancement Overlay */}
      {item.pendingEnhancement && (
        <div className="absolute inset-0 bg-white bg-opacity-95 rounded-lg border-2 border-dashed animate-fade-in"
             style={{ borderColor: item.pendingEnhancement.isLowConfidence ? 'var(--color-error)' : 'var(--color-primary)' }}>
          <div className="p-3 h-full flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                {item.pendingEnhancement.isLowConfidence ? (
                  <AlertCircle className="w-3 h-3" style={{ color: 'var(--color-error)' }} />
                ) : (
                  <Sparkles className="w-3 h-3" style={{ color: 'var(--color-primary)' }} />
                )}
                <span className="text-xs font-semibold" style={{ 
                  color: item.pendingEnhancement.isLowConfidence ? 'var(--color-error)' : 'var(--color-primary)' 
                }}>
                  {item.pendingEnhancement.isLowConfidence ? 'Needs Review' : 'AI Suggestion'}
                </span>
              </div>
              <button 
                onClick={() => onDismissEnhancement?.(item.id)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            
            {/* Original → Suggestion */}
            <div className="flex-1 text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              {item.pendingEnhancement.isLowConfidence ? (
                <div>
                  <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    "{item.name}" doesn't look like food
                  </div>
                  {item.pendingEnhancement.guidance?.examples && (
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Try: {item.pendingEnhancement.guidance.examples.slice(0, 2).join(', ')}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="mb-1">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>"{item.name}"</span>
                    <span className="mx-1">→</span>
                    <span className="font-medium" style={{ color: 'var(--color-primary)' }}>"{item.pendingEnhancement.name}"</span>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {item.pendingEnhancement.quantity && `${item.pendingEnhancement.quantity} • `}
                    {item.pendingEnhancement.location} • {item.pendingEnhancement.expiresAt ? `${calculateRemainingDays(item.pendingEnhancement.expiresAt)}d` : `${item.pendingEnhancement.daysUntilExpiry}d`}
                  </div>
                </div>
              )}
            </div>
            
            {/* Buttons */}
            <div className="flex gap-1">
              {item.pendingEnhancement.isLowConfidence ? (
                <>
                  <button 
                    onClick={() => onEdit(item)}
                    className="flex-1 btn-base py-1 text-xs font-medium"
                    style={{ 
                      backgroundColor: 'var(--color-error)', 
                      color: 'white',
                      border: '1px solid var(--color-error)'
                    }}
                  >
                    Update
                  </button>
                  <button 
                    onClick={() => onDelete(item.id)}
                    className="flex-1 btn-base py-1 text-xs"
                    style={{ 
                      backgroundColor: 'var(--bg-card)', 
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)'
                    }}
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => onApplyEnhancement?.(item.id, item.pendingEnhancement)}
                    className="flex-1 btn-base py-1 text-xs font-medium"
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
                    className="flex-1 btn-base py-1 text-xs"
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemCard;