import React from 'react';
import ItemCard from './ItemCard';
import ItemListItem from './ItemListItem';

const PantryViewSection = ({ 
  title, 
  items, 
  viewMode, 
  onEdit, 
  onDelete,
  isEmpty 
}) => {
  if (isEmpty) {
    return (
      <div className="card p-8">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No items yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Add items to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h2>
      
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default PantryViewSection;