import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, Sparkles, Clock, AlertTriangle } from 'lucide-react';

const ItemCard = ({ item, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      className="card-interactive p-3 rounded-lg hover-lift transition-all duration-200 relative"
      style={{ 
        backgroundColor: 'var(--bg-tertiary)',
        border: expiryInfo.isExpired ? '2px solid var(--color-error)' : 
               expiryInfo.isExpiringSoon ? '2px solid var(--color-warning)' : 
               '1px solid var(--border-light)',
        minHeight: '80px'
      }}
    >
      {/* Expired/Expiring Soon Badge */}
      {(expiryInfo.isExpired || expiryInfo.isExpiringSoon) && (
        <div 
          className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
          style={{ 
            backgroundColor: expiryInfo.isExpired ? 'var(--color-error)' : 'var(--color-warning)',
            color: 'white'
          }}
        >
          {ExpiryIcon && <ExpiryIcon className="w-2.5 h-2.5" />}
          {expiryInfo.isExpired ? 'Expired' : 'Soon'}
        </div>
      )}

      <div className="flex items-center justify-between h-full">
        {/* Main Content - Horizontal Layout */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Item Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm mb-0.5 truncate" style={{ color: 'var(--text-primary)' }}>
              {item.name}
            </div>
            
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              {/* Location */}
              <span>{item.location === 'pantry' ? '🏠' : item.location === 'fridge' ? '❄️' : '🧊'}</span>
              
              {/* Quantity */}
              {item.quantity && (
                <>
                  <span>•</span>
                  <span>{item.quantity}</span>
                </>
              )}
              
              {/* AI Badge */}
              {item.detectedBy === 'ai' && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1" 
                        style={{ color: 'var(--color-primary)' }}>
                    <Sparkles className="w-2.5 h-2.5" /> AI
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Expiry Info */}
          <div className="text-right flex items-center gap-1">
            <div className="text-xs font-medium flex items-center gap-1" style={{ color: expiryInfo.color }}>
              {ExpiryIcon && <ExpiryIcon className="w-3 h-3" />}
              <span className="whitespace-nowrap">{expiryInfo.text}</span>
            </div>
          </div>
        </div>

        {/* Three-dot menu */}
        <div className="relative ml-4" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-opacity-80 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Item options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div 
              className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-10 min-w-[140px]"
              style={{ 
                backgroundColor: 'var(--bg-card)', 
                borderColor: 'var(--border-light)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
            >
              <button
                onClick={() => {
                  onEdit(item);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-opacity-50 flex items-center gap-2 transition-colors rounded-t-lg"
                style={{ color: 'var(--text-primary)' }}
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => {
                  onDelete(item.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-opacity-50 flex items-center gap-2 transition-colors rounded-b-lg"
                style={{ color: 'var(--color-error)' }}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemCard;