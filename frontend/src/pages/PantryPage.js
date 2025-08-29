import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

// New Components
import AddItemSection from '../components/AddItemSection';
import PantryToolbar from '../components/PantryToolbar';
import PantryViewSection from '../components/PantryViewSection';
import FilterModal from '../components/FilterModal';
import EditItemModal from '../components/EditItemModal';

// Custom Hooks
import usePantryFilters from '../hooks/usePantryFilters';
import useItemManager from '../hooks/useItemManager';

export default function PantryPage() {
  const navigate = useNavigate();
  const context = useOutletContext();
  const { userToken, activeHomeId } = context || {};

  // Core state
  const [items, setItems] = useState([]);
  const [viewMode, setViewMode] = useState('card');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Custom hooks
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    groupedItems,
    activeFiltersCount,
    clearFilters
  } = usePantryFilters(items);

  const {
    isLoading: itemManagerLoading,
    error: itemManagerError,
    setError: setItemManagerError,
    handleDirectAddItem,
    handleEditItem,
    handleDeleteItem,
    handleAIItemsDetected
  } = useItemManager(
    useCallback(() => ({
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    }), [userToken]),
    activeHomeId
  );

  // Fetch items
  useEffect(() => {
    const fetchItems = async () => {
      if (!userToken || !activeHomeId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/pantry/${activeHomeId}`, {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch pantry items');
        const data = await response.json();
        
        // Convert Firestore timestamps to Date objects
        const processedData = data.map(item => ({
          ...item,
          createdAt: item.createdAt && item.createdAt._seconds 
            ? new Date(item.createdAt._seconds * 1000).toISOString()
            : item.createdAt
        }));
        
        setItems(processedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchItems();
  }, [activeHomeId, userToken]);

  // Handlers
  const handleDirectAdd = async (itemToAdd) => {
    await handleDirectAddItem(itemToAdd, setItems);
  };

  const handleAIItemsAdd = async (detectedItems) => {
    await handleAIItemsDetected(detectedItems, setItems);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
  };

  const handleSaveEdit = async (updatedItem) => {
    await handleEditItem(updatedItem, setItems);
  };

  const handleDelete = async (itemId) => {
    await handleDeleteItem(itemId, setItems);
  };

  const handleCreateRecipe = () => {
    navigate('/recipe-generator', { 
      state: { ingredients: items.map(item => item.name) }
    });
  };

  if (!context) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const totalItems = items.length;
  const displayError = error || itemManagerError;

  return (
    <div className="section-padding">
      <div className="container-mobile lg:max-w-none lg:px-8">
        {/* Page Header */}
        <div className="animate-fade-in mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            🥫 Pantry Manager
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Keep track of your ingredients across pantry, fridge, and freezer
          </p>
        </div>

        {/* Add Items Section */}
        <AddItemSection
          onDirectAdd={handleDirectAdd}
          onAIItemsDetected={handleAIItemsAdd}
          activeHomeId={activeHomeId}
          userToken={userToken}
          getAuthHeaders={useCallback(() => ({
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }), [userToken])}
        />

        {/* View & Manage Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Your Items ({totalItems})
          </h2>

          {/* Toolbar */}
          <PantryToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onOpenFilter={() => setShowFilterModal(true)}
            activeFiltersCount={activeFiltersCount}
          />

          {/* Error Display */}
          {displayError && (
            <div className="mb-6 p-4 rounded-lg" style={{ 
              backgroundColor: 'var(--color-error-light)', 
              borderLeft: '4px solid var(--color-error)',
              color: 'var(--color-error)' 
            }}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{displayError}</span>
                <button 
                  onClick={() => {
                    setError('');
                    setItemManagerError('');
                  }}
                  className="ml-auto text-sm underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Items Display */}
          {isLoading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="animate-shimmer h-6 rounded mb-4"></div>
                  <div className="space-y-3">
                    {[1, 2, 3].map(j => (
                      <div key={j} className="animate-shimmer h-16 rounded"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
              <PantryViewSection
                title="🏠 Pantry"
                items={groupedItems.pantry}
                viewMode={viewMode}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isEmpty={groupedItems.pantry.length === 0}
              />
              <PantryViewSection
                title="❄️ Fridge"
                items={groupedItems.fridge}
                viewMode={viewMode}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isEmpty={groupedItems.fridge.length === 0}
              />
              <PantryViewSection
                title="🧊 Freezer"
                items={groupedItems.freezer}
                viewMode={viewMode}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isEmpty={groupedItems.freezer.length === 0}
              />
            </div>
          )}
        </div>

        {/* Create Recipe Button */}
        <div className="mb-8">
          <button
            onClick={handleCreateRecipe}
            disabled={totalItems === 0}
            className="w-full btn-base py-3 text-base font-semibold transition-all disabled:opacity-50 hover-lift"
            style={{ 
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
              color: 'white',
              border: 'none'
            }}
          >
            ✨ Create a Recipe with What I Have
          </button>
          <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
            {totalItems === 0 ? 'Add some items to get started' : `${totalItems} item${totalItems !== 1 ? 's' : ''} available`}
          </p>
        </div>

        {/* Modals */}
        <FilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={clearFilters}
        />

        <EditItemModal
          isOpen={!!editingItem}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}