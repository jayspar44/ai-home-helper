import React, { useState } from 'react';
import { Plus } from 'lucide-react';

/**
 * Inline input component for adding items to shopping list
 * Features AI parsing on submit
 */
const ShoppingListInput = ({ onAdd, loading }) => {
  const [text, setText] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!text.trim() || loading) return;

    const success = await onAdd(text);
    if (success) {
      setText(''); // Clear input on success
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="shopping-list-input">
      <input
        type="text"
        className="shopping-list-input-field"
        placeholder="Add item (e.g., 2 lbs chicken, milk, 3 apples)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={loading}
        autoComplete="off"
      />
      <button
        className="shopping-list-add-btn"
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
      >
        {loading ? (
          <>
            <span className="spinner-small"></span>
            Adding...
          </>
        ) : (
          <>
            <Plus size={20} />
            Add
          </>
        )}
      </button>
    </div>
  );
};

export default ShoppingListInput;
