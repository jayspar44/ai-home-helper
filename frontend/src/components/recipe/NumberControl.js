// NumberControl.js - Reusable +/- control for numeric inputs
import React from 'react';

/**
 * Reusable number control with increment/decrement buttons
 * Used for meal count and serving size
 *
 * @param {number} value - Current value
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {string} label - Display label (e.g., "meals", "servings")
 * @param {function} onChange - Callback when value changes
 */
export default function NumberControl({ value, min, max, label, onChange }) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const canDecrement = value > min;
  const canIncrement = value < max;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <button
        onClick={handleDecrement}
        disabled={!canDecrement}
        className="btn-base"
        style={{
          width: '36px',
          height: '36px',
          padding: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          opacity: canDecrement ? 1 : 0.4,
          cursor: canDecrement ? 'pointer' : 'not-allowed',
          border: '1px solid var(--border-color-light)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-color-primary)'
        }}
        aria-label={`Decrease ${label}`}
      >
        −
      </button>

      <span style={{
        fontSize: '1rem',
        fontWeight: '500',
        minWidth: '100px',
        textAlign: 'center',
        color: 'var(--text-color-primary)'
      }}>
        {value} {label}
      </span>

      <button
        onClick={handleIncrement}
        disabled={!canIncrement}
        className="btn-base"
        style={{
          width: '36px',
          height: '36px',
          padding: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          opacity: canIncrement ? 1 : 0.4,
          cursor: canIncrement ? 'pointer' : 'not-allowed',
          border: '1px solid var(--border-color-light)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-color-primary)'
        }}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}
