import React from 'react';
import { ShoppingCart } from 'lucide-react';

/**
 * Empty state component for shopping list
 * Shows when no items are in the list
 */
const ShoppingListEmpty = () => {
  return (
    <div className="empty-state">
      <ShoppingCart size={64} className="empty-state-icon" />
      <h3 className="empty-state-title">Your shopping list is empty</h3>
      <p className="empty-state-text">
        Add items manually above using natural language like "2 lbs chicken" or "milk"
      </p>
    </div>
  );
};

export default ShoppingListEmpty;
