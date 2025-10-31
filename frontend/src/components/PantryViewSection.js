import React from 'react';
import ItemListItem from './ItemListItem';

const PantryViewSection = ({
  title,
  items,
  onEdit,
  onDelete,
  isEmpty
}) => {
  if (isEmpty) {
    return (
      <div className="card p-8">
        <h2 className="text-xl font-semibold mb-4 text-color-primary">
          {title}
        </h2>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-sm text-color-muted">
            No items yet
          </p>
          <p className="text-xs mt-1 text-color-muted">
            Add items to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-6 text-color-primary">
        {title}
      </h2>

      <div className="space-y-2">
        {items.map(item => (
          <ItemListItem
            key={item.id}
            item={item}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default PantryViewSection;