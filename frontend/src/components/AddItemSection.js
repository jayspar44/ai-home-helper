import React, { useState, useRef } from 'react';
import { Bot, Camera, Plus } from 'lucide-react';
import AddItemModal from './AddItemModal';

const AddItemSection = ({ 
  onDirectAdd, 
  onAIItemsDetected, 
  activeHomeId, 
  userToken, 
  getAuthHeaders 
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const itemNameInputRef = useRef(null);

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAddName.trim()) return;

    const itemToAdd = {
      name: quickAddName.trim(),
      location: 'pantry'
    };

    await onDirectAdd(itemToAdd);
    setQuickAddName('');
  };

  const openAddModal = (mode = 'manual') => {
    setShowAddModal(mode);
  };

  return (
    <>
      <div className="card p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Add New Item
        </h2>
        
        {/* Quick Add Form */}
        <form onSubmit={handleQuickAdd} className="mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                ref={itemNameInputRef}
                value={quickAddName}
                onChange={e => setQuickAddName(e.target.value)}
                className="input-base focus-ring w-full"
                placeholder="Quick add item (e.g., 'milk', 'eggs')"
              />
            </div>
            <div className="flex gap-2">
              <button 
                type="submit"
                disabled={!quickAddName.trim()}
                className="btn-base btn-primary px-4 py-2 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        </form>

        {/* Advanced Add Options */}
        <div className="flex flex-wrap gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
          <button 
            type="button"
            onClick={() => openAddModal('ai')}
            className="btn-base btn-secondary flex items-center gap-2"
          >
            <Bot className="w-4 h-4" />
            Get AI Suggestions
          </button>
          <button 
            type="button"
            onClick={() => openAddModal('photo')}
            className="btn-base flex items-center gap-2"
            style={{ 
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              borderColor: 'var(--color-accent)'
            }}
          >
            <Camera className="w-4 h-4" />
            Upload Photo
          </button>
          <button 
            type="button"
            onClick={() => openAddModal('manual')}
            className="btn-base btn-ghost flex items-center gap-2"
          >
            More Options
          </button>
        </div>
      </div>

      <AddItemModal
        isOpen={!!showAddModal}
        initialMode={showAddModal}
        onClose={() => setShowAddModal(false)}
        onDirectAdd={onDirectAdd}
        onAIItemsDetected={onAIItemsDetected}
        activeHomeId={activeHomeId}
        userToken={userToken}
        getAuthHeaders={getAuthHeaders}
      />
    </>
  );
};

export default AddItemSection;