// EmptyPantryBanner.js - Info banner for empty pantry state
import React from 'react';
import { AlertCircle, X } from 'lucide-react';

/**
 * Displays an informational banner when pantry is empty
 * Automatically switched to No Constraints mode
 *
 * @param {function} onDismiss - Callback when user dismisses the banner
 */
export default function EmptyPantryBanner({ onDismiss }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-tertiary)',
      borderLeft: '3px solid var(--color-primary)',
      borderRadius: '0.375rem',
      padding: '1rem',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem'
    }}>
      {/* Info Icon */}
      <AlertCircle
        size={20}
        style={{
          color: 'var(--color-primary)',
          flexShrink: 0,
          marginTop: '0.125rem'
        }}
      />

      {/* Message */}
      <div style={{ flex: 1 }}>
        <p style={{
          margin: 0,
          fontSize: '0.9375rem',
          color: 'var(--text-color-primary)',
          lineHeight: '1.5'
        }}>
          Your pantry is empty, so we've switched to <strong>No Constraints</strong> mode.
          Add items to your pantry to use pantry-based meal planning!
        </p>
      </div>

      {/* Close Button */}
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          padding: '0.25rem',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
        aria-label="Dismiss banner"
      >
        <X size={18} />
      </button>
    </div>
  );
}
