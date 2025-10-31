import React from 'react';
import ItemListItem from './ItemListItem';

const UnifiedListView = ({
  items,
  onEdit,
  onDelete,
  onApplyEnhancement,
  onDismissEnhancement,
  processingEnhancementIds = [],
  isEmpty
}) => {
  if (isEmpty) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-lg font-semibold mb-2 text-color-primary">
          No items yet
        </h3>
        <p className="text-sm text-color-muted">
          Add some items to your pantry to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map(item => (
        <ItemListItem
          key={item.id}
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onApplyEnhancement={onApplyEnhancement}
          onDismissEnhancement={onDismissEnhancement}
          processingEnhancement={processingEnhancementIds.includes(item.id)}
        />
      ))}
    </div>
  );
};

export default UnifiedListView;