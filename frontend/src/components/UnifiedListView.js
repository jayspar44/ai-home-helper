import React from 'react';
import ItemCard from './ItemCard';
import ItemListItem from './ItemListItem';

const UnifiedListView = ({ 
  items, 
  viewMode, 
  onEdit, 
  onDelete,
  isEmpty 
}) => {
  if (isEmpty) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          No items yet
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Add some items to your pantry to get started
        </p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-1">
        {items.map(item => (
          <ItemListItem
            key={item.id}
            item={item}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {items.map(item => (
        <ItemCard
          key={item.id}
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default UnifiedListView;