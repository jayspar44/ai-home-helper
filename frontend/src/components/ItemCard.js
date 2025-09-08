import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Edit2, Trash2, Sparkles, Clock, AlertTriangle, X, AlertCircle } from 'lucide-react';

const ItemCard = ({ item, onEdit, onDelete, onApplyEnhancement, onDismissEnhancement }) => {
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

  const getExpiryInfo = (item) => {
    if (!item.createdAt || item.daysUntilExpiry === null || item.daysUntilExpiry === undefined) {
      return { 
        text: 'No expiry date', 
        color: 'var(--text-muted)',
        icon: null,
        isExpired: false,
        isExpiringSoon: false
      };
    }
    
    const expiryDate = Date.parse(item.createdAt) + (item.daysUntilExpiry * 24 * 60 * 60 * 1000);
    const remainingDays = Math.round((expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (remainingDays <= 0) {
      return { 
        text: 'Expired!', 
        color: 'var(--color-error)',
        icon: AlertTriangle,
        isExpired: true,
        isExpiringSoon: false
      };
    } else if (remainingDays <= 3) {
      return { 
        text: `Expires in ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`, 
        color: 'var(--color-error)',
        icon: AlertTriangle,
        isExpired: false,
        isExpiringSoon: true
      };
    } else if (remainingDays <= 7) {
      return { 
        text: `Expires in ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`, 
        color: 'var(--color-warning)',
        icon: Clock,
        isExpired: false,
        isExpiringSoon: true
      };
    } else {
      return { 
        text: `Expires in ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`, 
        color: 'var(--color-success)',
        icon: null,
        isExpired: false,
        isExpiringSoon: false
      };
    }
  };

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
            color: 'white'
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
            
            {/* AI Badge */}
            {item.detectedBy === 'ai' && (
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
             style={{ borderColor: item.pendingEnhancement.isLowConfidence ? 'var(--color-warning)' : 'var(--color-primary)' }}>
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              {item.pendingEnhancement.isLowConfidence ? (
                <AlertCircle className="w-4 h-4" style={{ color: 'var(--color-warning)' }} />
              ) : (
                <Sparkles className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
              )}
              <span className="text-sm font-semibold" style={{ 
                color: item.pendingEnhancement.isLowConfidence ? 'var(--color-warning)' : 'var(--color-primary)' 
              }}>
                {item.pendingEnhancement.isLowConfidence ? 'Item Needs Review' : 'AI Enhancement'}
              </span>
              <button 
                onClick={() => onDismissEnhancement?.(item.id)}
                className="ml-auto p-1 rounded hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            
            {item.pendingEnhancement.isLowConfidence ? (
              <div className="flex-1 mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <div className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  {item.pendingEnhancement.guidance?.message}
                </div>
                {item.pendingEnhancement.guidance?.examples && (
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Try instead:</div>
                    <div className="text-xs">
                      {item.pendingEnhancement.guidance.examples.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  "{item.pendingEnhancement.name}"
                </div>
                {item.pendingEnhancement.quantity && (
                  <div>Qty: {item.pendingEnhancement.quantity}</div>
                )}
                <div>Location: {item.pendingEnhancement.location}</div>
                <div>Expires in: {item.pendingEnhancement.daysUntilExpiry} days</div>
              </div>
            )}
            
            <div className="flex gap-2">
              {item.pendingEnhancement.isLowConfidence ? (
                <button 
                  onClick={() => onEdit(item)}
                  className="flex-1 btn-base py-2 text-sm font-medium"
                  style={{ 
                    backgroundColor: 'var(--color-warning)', 
                    color: 'white',
                    border: '1px solid var(--color-warning)'
                  }}
                >
                  Update Item
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => onApplyEnhancement?.(item.id, item.pendingEnhancement)}
                    className="flex-1 btn-base py-2 text-sm font-medium"
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
                      daysUntilExpiry: item.pendingEnhancement.daysUntilExpiry
                    })}
                    className="flex-1 btn-base py-2 text-sm"
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