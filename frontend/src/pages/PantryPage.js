import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { daysToExpiryDate } from '../utils/dateUtils';
import { useToast } from '../contexts/ToastContext';

// New Components
import AddItemSection from '../components/AddItemSection';
import PantryToolbar from '../components/PantryToolbar';
import UnifiedListView from '../components/UnifiedListView';
import PantryCategory from '../components/PantryCategory';
import FilterModal from '../components/FilterModal';
import EditItemModal from '../components/EditItemModal';
import JSONExportModal from '../components/JSONExportModal';

// Custom Hooks
import usePantryFilters from '../hooks/usePantryFilters';
import useItemManager from '../hooks/useItemManager';

// Styles
import '../styles/Pantry.css';

export default function PantryPage() {
  const navigate = useNavigate();
  const context = useOutletContext();
  const { userToken, activeHomeId } = context || {};
  const { showSuccess } = useToast();

  // Core state
  const [items, setItems] = useState([]);
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
    itemsByGroup,
    sortedGroups,
    groupBy,
    setGroupBy,
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
  } = useItemManager(getAuthHeaders, activeHomeId, items);

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
    const item = items.find(i => i.id === itemId);
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, pendingEnhancement: null }
        : item
    ));
    if (item) {
      showSuccess(`Dismissed suggestion for "${item.name}"`);
    }
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
          <h1 className="text-2xl lg:text-3xl font-bold mb-2 text-color-primary">
            🥫 Pantry Manager
          </h1>
          <p className="text-color-muted">
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
          {/* Toolbar */}
          <PantryToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenFilter={() => setShowFilterModal(true)}
            activeFiltersCount={activeFiltersCount}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            onCreateRecipe={handleCreateRecipe}
            onExportJSON={handleExportJSON}
            totalItems={totalItems}
          />

          {/* Error Display */}
          {displayError && (
            <div className="alert alert-error mb-6">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div className="alert-content">
                <span>{displayError}</span>
              </div>
              <button
                onClick={() => {
                  setError('');
                  setItemManagerError('');
                }}
                className="alert-dismiss text-sm underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Items Display */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton-card"></div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-lg font-semibold mb-2 text-color-primary">
                No items yet
              </h3>
              <p className="text-sm text-color-muted">
                Add some items to your pantry to get started
              </p>
            </div>
          ) : (
            <div className="shopping-list-categories">
              {sortedGroups.map(group => (
                <PantryCategory
                  key={group}
                  category={group}
                  items={itemsByGroup[group]}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onApplyEnhancement={handleApplyEnhancement}
                  onDismissEnhancement={handleDismissEnhancement}
                  processingEnhancementIds={processingEnhancementIds}
                />
              ))}
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