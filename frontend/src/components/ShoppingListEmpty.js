import React from 'react';
import { ShoppingCart } from 'lucide-react';

/**
 * Empty state component for shopping list
 * Shows when no items are in the list
 */
const ShoppingListEmpty = () => {
  return (
    <div className="shopping-list-empty">
      <ShoppingCart size={64} className="shopping-list-empty-icon" />
      <h3 className="shopping-list-empty-title">Your shopping list is empty</h3>
      <p className="shopping-list-empty-text">
        Add items manually above using natural language like "2 lbs chicken" or "milk"
      </p>
    </div>
  );
};

export default ShoppingListEmpty;
