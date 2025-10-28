import React, { useCallback, useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import useShoppingList from '../hooks/useShoppingList';
import ShoppingListInput from '../components/ShoppingListInput';
import ShoppingListCategory from '../components/ShoppingListCategory';
import ShoppingListEmpty from '../components/ShoppingListEmpty';
import ShoppingListToolbar from '../components/ShoppingListToolbar';
import ShoppingListFilterModal from '../components/ShoppingListFilterModal';
import EditShoppingItemModal from '../components/EditShoppingItemModal';
import logger from '../utils/logger';
import '../styles/ShoppingList.css';

/**
 * Main shopping list page
 * Features AI-powered item parsing, categorization, and management
 */
const ShoppingList = () => {
  const context = useOutletContext();
  const { userToken, activeHomeId } = context || {};
  const [homeMembers, setHomeMembers] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Auth headers callback
  const getAuthHeaders = useCallback(() => ({
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }), [userToken]);

  // Fetch home members on mount
  useEffect(() => {
    const fetchHomeMembers = async () => {
      if (!userToken || !activeHomeId) return;

      try {
        const response = await fetch(`/api/homes/${activeHomeId}/members`, {
          headers: getAuthHeaders()
        });

        if (response.ok) {
          const members = await response.json();
          setHomeMembers(members);
          logger.debug('Home members fetched', { memberCount: members.length });
        } else {
          logger.error('Failed to fetch home members:', response.status);
          setHomeMembers([]);
        }
      } catch (err) {
        logger.error('Error fetching home members:', err);
        setHomeMembers([]);
      }
    };

    fetchHomeMembers();
  }, [userToken, activeHomeId, getAuthHeaders]);

  // Shopping list hook
  const {
    itemsByCategory,
    sortedCategories,
    loading,
    error,
    totalItems,
    checkedItems,
    filteredItemsCount,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    groupBy,
    setGroupBy,
    addItem,
    toggleCheck,
    editItem,
    deleteItem,
    clearCheckedItems
  } = useShoppingList(getAuthHeaders, activeHomeId);

  const handleAddItem = async (text) => {
    const newItem = await addItem(text);
    return newItem !== null; // Return true if successful
  };

  const handleClearChecked = () => {
    if (window.confirm(`Clear ${checkedItems} checked item${checkedItems > 1 ? 's' : ''}?`)) {
      clearCheckedItems();
    }
  };

  // Calculate active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.categories.length < 6) count++;
    if (filters.status !== 'all') count++;
    if (filters.users.length > 0) count++;
    if (filters.dateAdded !== 'all') count++;
    return count;
  };

  const handleClearFilters = () => {
    setFilters({
      categories: ['produce', 'dairy', 'meat', 'pantry', 'frozen', 'other'],
      status: 'all',
      users: [],
      dateAdded: 'all'
    });
  };

  if (!userToken) {
    return (
      <div className="section-padding">
        <div className="container-mobile">
          <div className="shopping-list-error">
            <p>Please sign in to access your shopping list</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-padding">
      <div className="container-mobile lg:max-w-none lg:px-8">
        {/* Page Header */}
        <div className="animate-fade-in mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            🛒 Shopping List
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Add items with natural language like "2 lbs chicken" or "milk"
          </p>
        </div>

        {/* Add Item Input */}
        <ShoppingListInput onAdd={handleAddItem} loading={loading} />

        {/* Toolbar - Search, Filters, Group By, Actions */}
        <ShoppingListToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenFilter={() => setShowFilterModal(true)}
          activeFiltersCount={getActiveFiltersCount()}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          totalItems={totalItems}
          checkedItems={checkedItems}
          onClearChecked={handleClearChecked}
          homeMembers={homeMembers}
        />

        {/* Error Message */}
        {error && (
          <div className="shopping-list-error-message">
            {error}
          </div>
        )}

      {/* Loading State */}
      {loading && totalItems === 0 ? (
        <div className="shopping-list-loading">
          <div className="spinner"></div>
          <p>Loading shopping list...</p>
        </div>
      ) : totalItems === 0 ? (
        // Empty State
        <ShoppingListEmpty />
      ) : (
        // Categories List
        <div className="shopping-list-categories">
          {sortedCategories.map(category => (
            <ShoppingListCategory
              key={category}
              category={category}
              items={itemsByCategory[category]}
              onCheck={toggleCheck}
              onEdit={setEditingItem}
              onDelete={deleteItem}
              homeMembers={homeMembers}
            />
          ))}
        </div>
      )}

        {/* Filter Modal */}
        <ShoppingListFilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={handleClearFilters}
          homeMembers={homeMembers}
        />

        {/* Edit Item Modal */}
        <EditShoppingItemModal
          isOpen={!!editingItem}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={editItem}
          onDelete={deleteItem}
        />
      </div>
    </div>
  );
};

export default ShoppingList;
