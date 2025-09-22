import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { daysToExpiryDate } from '../utils/dateUtils';

// New Components
import AddItemSection from '../components/AddItemSection';
import PantryToolbar from '../components/PantryToolbar';
import UnifiedListView from '../components/UnifiedListView';
import FilterModal from '../components/FilterModal';
import EditItemModal from '../components/EditItemModal';
import JSONExportModal from '../components/JSONExportModal';

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
  const [processingEnhancementIds, setProcessingEnhancementIds] = useState([]);

  // Modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showJSONExportModal, setShowJSONExportModal] = useState(false);

  // Auth headers callback
  const getAuthHeaders = useCallback(() => ({
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }), [userToken]);

  // Custom hooks
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    filteredItems,
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
  } = useItemManager(getAuthHeaders, activeHomeId);

  // Fetch items
  useEffect(() => {
    const fetchItems = async () => {
      if (!userToken || !activeHomeId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/pantry/${activeHomeId}`, {
          headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Failed to fetch pantry items');
        const data = await response.json();
        
        // Convert Firestore timestamps to Date objects
        const processedData = data.map(item => ({
          ...item,
          createdAt: item.createdAt && item.createdAt._seconds
            ? new Date(item.createdAt._seconds * 1000).toISOString()
            : item.createdAt,
          expiresAt: item.expiresAt && item.expiresAt._seconds
            ? new Date(item.expiresAt._seconds * 1000).toISOString()
            : item.expiresAt
        }));
        
        setItems(processedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchItems();
  }, [activeHomeId, userToken, getAuthHeaders]);

  // Handlers
  const handleDirectAdd = async (itemToAdd) => {
    const addedItem = await handleDirectAddItem(itemToAdd, setItems);
    return addedItem;
  };

  const handleAIItemsAdd = async (detectedItems) => {
    await handleAIItemsDetected(detectedItems, setItems);
  };

  const handleItemEnhancementRequested = (itemId, enhancement) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, pendingEnhancement: enhancement }
        : item
    ));
    // Remove from processing state when enhancement is ready
    setProcessingEnhancementIds(prev => prev.filter(id => id !== itemId));
  };
  
  const handleStartEnhancementProcessing = (itemId) => {
    setProcessingEnhancementIds(prev => [...prev, itemId]);
  };

  const handleUpdateItemDefaults = async (itemId, defaults) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const updatedItem = {
      ...item,
      location: defaults.location,
      expiresAt: defaults.expiresAt || daysToExpiryDate(defaults.daysUntilExpiry || 7)
    };

    await handleEditItem(updatedItem, setItems);
  };

  const handleApplyEnhancement = async (itemId, enhancement) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const enhancedItem = {
      ...item,
      name: enhancement.name,
      quantity: enhancement.quantity,
      location: enhancement.location,
      expiresAt: enhancement.expiresAt || daysToExpiryDate(enhancement.daysUntilExpiry || 7),
      pendingEnhancement: null
    };

    await handleEditItem(enhancedItem, setItems);
  };

  const handleDismissEnhancement = (itemId) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, pendingEnhancement: null }
        : item
    ));
  };

  const handleEdit = (item) => {
    setEditingItem(item);
  };

  const handleSaveEdit = async (updatedItem) => {
    // Clear pending enhancement when manually editing
    const itemWithoutEnhancement = { ...updatedItem, pendingEnhancement: null };
    await handleEditItem(itemWithoutEnhancement, setItems);
  };

  const handleDelete = async (itemId) => {
    await handleDeleteItem(itemId, setItems);
  };

  const handleCreateRecipe = () => {
    navigate('/recipe-generator', {
      state: { ingredients: items.map(item => item.name) }
    });
  };

  const handleExportJSON = () => {
    setShowJSONExportModal(true);
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
          onItemEnhancementRequested={handleItemEnhancementRequested}
          onStartEnhancementProcessing={handleStartEnhancementProcessing}
          onUpdateItemDefaults={handleUpdateItemDefaults}
          activeHomeId={activeHomeId}
          userToken={userToken}
          getAuthHeaders={getAuthHeaders}
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
            onCreateRecipe={handleCreateRecipe}
            onExportJSON={handleExportJSON}
            totalItems={totalItems}
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
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse h-20 bg-gray-200 rounded-lg" 
                     style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                </div>
              ))}
            </div>
          ) : (
            <div className="animate-slide-up pantry-items">
              <UnifiedListView
                items={filteredItems}
                viewMode={viewMode}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onApplyEnhancement={handleApplyEnhancement}
                onDismissEnhancement={handleDismissEnhancement}
                processingEnhancementIds={processingEnhancementIds}
                isEmpty={filteredItems.length === 0}
              />
            </div>
          )}
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

        <JSONExportModal
          isOpen={showJSONExportModal}
          onClose={() => setShowJSONExportModal(false)}
          items={items}
        />
      </div>
    </div>
  );
}