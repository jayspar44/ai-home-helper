import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [toastHeights, setToastHeights] = useState({});
  const toastRefs = useRef({});

  const showToast = useCallback((message, options = {}) => {
    const id = ++toastId;
    const toast = {
      id,
      message,
      type: options.type || 'success',
      action: options.action,
      onAction: options.onAction,
      duration: options.duration !== undefined ? options.duration : 3000
    };

    setToasts(prev => [...prev, toast]);

    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    // Clean up refs and heights for dismissed toast
    delete toastRefs.current[id];
    setToastHeights(prev => {
      const newHeights = { ...prev };
      delete newHeights[id];
      return newHeights;
    });
  }, []);

  // Measure toast heights dynamically
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const toastId = entry.target.dataset.toastId;
        if (toastId) {
          setToastHeights(prev => ({
            ...prev,
            [toastId]: entry.target.offsetHeight
          }));
        }
      });
    });

    // Observe all current toast refs
    Object.values(toastRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [toasts]);

  const showSuccess = useCallback((message, options = {}) => {
    return showToast(message, { ...options, type: 'success' });
  }, [showToast]);

  const showError = useCallback((message, options = {}) => {
    return showToast(message, { ...options, type: 'error' });
  }, [showToast]);

  const showInfo = useCallback((message, options = {}) => {
    return showToast(message, { ...options, type: 'info' });
  }, [showToast]);

  const value = {
    showToast,
    showSuccess,
    showError,
    showInfo,
    dismissToast
  };

  // Calculate cumulative positions based on measured heights
  const reversedToasts = [...toasts].reverse();
  const GAP = 8; // Gap between toasts in pixels
  const DEFAULT_HEIGHT = 64; // Fallback height if not measured yet

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Render toasts */}
      {reversedToasts.map((toast, index) => {
        // Calculate top position based on cumulative heights of toasts above
        let topPosition = 16; // Initial top margin
        for (let i = 0; i < index; i++) {
          const prevToast = reversedToasts[i];
          const prevHeight = toastHeights[prevToast.id] || DEFAULT_HEIGHT;
          topPosition += prevHeight + GAP;
        }

        return (
          <div
            key={toast.id}
            ref={(el) => {
              if (el) toastRefs.current[toast.id] = el;
            }}
            data-toast-id={toast.id}
            style={{
              position: 'fixed',
              top: `${topPosition}px`,
              right: '16px',
              zIndex: 1000 + (toasts.length - index) // Newest toast has highest z-index
            }}
          >
            <Toast
              message={toast.message}
              action={toast.action}
              onAction={toast.onAction}
              onDismiss={() => dismissToast(toast.id)}
              type={toast.type}
              duration={toast.duration}
            />
          </div>
        );
      })}
    </ToastContext.Provider>
  );
};