import React, { useEffect, useState } from 'react';
import { CheckCircle, X, Eye } from 'lucide-react';

const Toast = ({ message, action, onAction, onDismiss, type = 'success', duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    setIsVisible(true);

    // Auto dismiss if duration is set
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss?.();
    }, 200); // Wait for animation to complete
  };

  const typeStyles = {
    success: {
      background: 'var(--color-success)',
      icon: CheckCircle
    },
    error: {
      background: 'var(--color-error)',
      icon: X
    },
    info: {
      background: 'var(--color-primary)',
      icon: CheckCircle
    }
  };

  const style = typeStyles[type];
  const Icon = style.icon;

  return (
    <div 
      className={`toast fixed top-4 right-4 z-50 transition-all duration-200 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      style={{
        backgroundColor: style.background,
        color: 'white',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        maxWidth: '400px',
        minWidth: '300px'
      }}
    >
      <div className="flex items-center gap-3 p-4">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1 text-sm font-medium">{message}</span>
        
        {action && onAction && (
          <button
            onClick={onAction}
            className="px-3 py-1 text-xs font-medium rounded bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
          >
            {action}
          </button>
        )}
        
        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-white hover:bg-opacity-20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;