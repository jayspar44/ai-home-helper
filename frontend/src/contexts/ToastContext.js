import React, { createContext, useContext, useState, useCallback } from 'react';
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
  }, []);

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

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Render toasts */}
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: 'fixed',
            top: `${16 + index * 80}px`, // Stack toasts
            right: '16px',
            zIndex: 1000 + index
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
      ))}
    </ToastContext.Provider>
  );
};