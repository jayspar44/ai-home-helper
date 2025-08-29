import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, Sparkles, Clock, AlertTriangle } from 'lucide-react';

const ItemListItem = ({ item, onEdit, onDelete }) => {
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
        text: `${remainingDays}d`, 
        color: 'var(--color-error)',
        icon: AlertTriangle,
        isExpired: false,
        isExpiringSoon: true
      };
    } else if (remainingDays <= 7) {
      return { 
        text: `${remainingDays}d`, 
        color: 'var(--color-warning)',
        icon: Clock,
        isExpired: false,
        isExpiringSoon: true
      };
    } else {
      return { 
        text: `${remainingDays}d`, 
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
            {item.detectedBy === 'ai' && (
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
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 rounded hover:bg-opacity-80 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Item options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMenu && (
          <div 
            className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-10 min-w-[120px]"
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
              className="w-full px-3 py-2 text-left text-xs hover:bg-opacity-50 flex items-center gap-2 transition-colors rounded-t-lg"
              style={{ color: 'var(--text-primary)' }}
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => {
                onDelete(item.id);
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-xs hover:bg-opacity-50 flex items-center gap-2 transition-colors rounded-b-lg"
              style={{ color: 'var(--color-error)' }}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemListItem;