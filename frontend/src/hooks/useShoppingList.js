import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../contexts/ToastContext';
import logger from '../utils/logger';

/**
 * Custom hook for managing shopping list state and operations
 * @param {Function} getAuthHeaders - Function that returns auth headers
 * @param {string} activeHomeId - The active home ID
 * @returns {Object} Shopping list state and operations
 */
const useShoppingList = (getAuthHeaders, activeHomeId) => {
  const { showSuccess, showError } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('category'); // category, date, user, status, none
  const [filters, setFilters] = useState({
    categories: ['produce', 'dairy', 'meat', 'pantry', 'frozen', 'other'],
    status: 'all', // all, checked, unchecked
    users: [], // empty = all users
    dateAdded: 'all' // all, today, this-week, older
  });

  // Fetch shopping list on mount
  const fetchShoppingList = useCallback(async () => {
    if (!activeHomeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/shopping-list/${activeHomeId}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch shopping list');
      }

      const data = await response.json();
      setItems(data.items || []);
      logger.debug('Shopping list fetched', { itemCount: data.items?.length || 0 });
    } catch (err) {
      logger.error('Error fetching shopping list:', err);
      setError(err.message);
      showError('Failed to load shopping list');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, activeHomeId, showError]);

  // Fetch on mount
  useEffect(() => {
    fetchShoppingList();
  }, [fetchShoppingList]);

  // Add item with AI parsing
  const addItem = useCallback(async (text) => {
    if (!text || text.trim().length === 0) {
      showError('Please enter an item');
      return null;
    }

    if (!activeHomeId) {
      showError('No home selected');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/shopping-list/${activeHomeId}/items`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text: text.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add item');
      }

      const data = await response.json();
      const newItem = data.item;

      // Add to local state
      setItems(prev => [...prev, newItem]);

      showSuccess(`Added "${newItem.name}"`);
      logger.debug('Item added to shopping list', { itemName: newItem.name });

      return newItem;
    } catch (err) {
      logger.error('Error adding item:', err);
      setError(err.message);
      showError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, activeHomeId, showSuccess, showError]);

  // Toggle item checked state
  const toggleCheck = useCallback(async (itemId, checked) => {
    if (!activeHomeId) return;

    try {
      const response = await fetch(`/api/shopping-list/${activeHomeId}/items/${itemId}/check`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ checked })
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      const data = await response.json();
      const updatedItem = data.item;

      // Update local state
      setItems(prev => prev.map(item =>
        item.id === itemId ? updatedItem : item
      ));

      // Show undo toast
      if (checked) {
        showSuccess(`Checked "${updatedItem.name}"`, {
          action: 'Undo',
          onAction: () => toggleCheck(itemId, false),
          duration: 5000
        });
      }

      logger.debug('Item checked state updated', { itemId, checked });
    } catch (err) {
      logger.error('Error toggling check:', err);
      showError('Failed to update item');
    }
  }, [getAuthHeaders, activeHomeId, showSuccess, showError]);

  // Edit item fields
  const editItem = useCallback(async (itemId, updates) => {
    if (!activeHomeId) return;

    try {
      const response = await fetch(`/api/shopping-list/${activeHomeId}/items/${itemId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      const data = await response.json();
      const updatedItem = data.item;

      // Update local state
      setItems(prev => prev.map(item =>
        item.id === itemId ? updatedItem : item
      ));

      logger.debug('Item updated', { itemId, updates });
    } catch (err) {
      logger.error('Error editing item:', err);
      showError('Failed to update item');
    }
  }, [getAuthHeaders, activeHomeId, showError]);

  // Delete item
  const deleteItem = useCallback(async (itemId) => {
    if (!activeHomeId) return;

    const itemToDelete = items.find(item => item.id === itemId);
    if (!itemToDelete) return;

    try {
      const response = await fetch(`/api/shopping-list/${activeHomeId}/items/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      // Remove from local state
      setItems(prev => prev.filter(item => item.id !== itemId));

      showSuccess(`Deleted "${itemToDelete.name}"`);
      logger.debug('Item deleted', { itemId, itemName: itemToDelete.name });
    } catch (err) {
      logger.error('Error deleting item:', err);
      showError('Failed to delete item');
    }
  }, [items, getAuthHeaders, activeHomeId, showSuccess, showError]);

  // Clear all checked items
  const clearCheckedItems = useCallback(async () => {
    if (!activeHomeId) return;

    const checkedCount = items.filter(item => item.checked).length;

    if (checkedCount === 0) {
      showError('No checked items to clear');
      return;
    }

    try {
      const response = await fetch(`/api/shopping-list/${activeHomeId}/checked`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to clear checked items');
      }

      // Remove checked items from local state
      setItems(prev => prev.filter(item => !item.checked));

      showSuccess(`Cleared ${checkedCount} checked item${checkedCount > 1 ? 's' : ''}`);
      logger.debug('Checked items cleared', { clearedCount: checkedCount });
    } catch (err) {
      logger.error('Error clearing checked items:', err);
      showError('Failed to clear checked items');
    }
  }, [items, getAuthHeaders, activeHomeId, showSuccess, showError]);

  // Apply search and filters, then group items
  const { itemsByGroup, sortedGroups, filteredItemsCount } = useMemo(() => {
    // 1. Apply search filter
    let filtered = items;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query)
      );
    }

    // 2. Apply category filter
    if (filters.categories.length < 6) {
      filtered = filtered.filter(item =>
        filters.categories.includes(item.category || 'other')
      );
    }

    // 3. Apply status filter
    if (filters.status !== 'all') {
      const shouldBeChecked = filters.status === 'checked';
      filtered = filtered.filter(item => item.checked === shouldBeChecked);
    }

    // 4. Apply user filter
    if (filters.users.length > 0) {
      filtered = filtered.filter(item =>
        filters.users.includes(item.addedBy)
      );
    }

    // 5. Apply date filter
    if (filters.dateAdded !== 'all') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(todayStart);
      weekAgo.setDate(weekAgo.getDate() - 7);

      filtered = filtered.filter(item => {
        const itemDate = new Date(item.addedAt);
        if (filters.dateAdded === 'today') {
          return itemDate >= todayStart;
        } else if (filters.dateAdded === 'this-week') {
          return itemDate >= weekAgo && itemDate < todayStart;
        } else if (filters.dateAdded === 'older') {
          return itemDate < weekAgo;
        }
        return true;
      });
    }

    // 6. Group items based on groupBy strategy
    const grouped = {};
    const sortByDate = (a, b) => {
      const dateA = new Date(a.addedAt);
      const dateB = new Date(b.addedAt);
      return dateB - dateA; // Most recent first
    };

    if (groupBy === 'category') {
      // Group by category
      const categories = ['produce', 'dairy', 'meat', 'pantry', 'frozen', 'other'];
      categories.forEach(cat => { grouped[cat] = []; });

      filtered.forEach(item => {
        const category = item.category || 'other';
        if (grouped[category]) {
          grouped[category].push(item);
        } else {
          grouped.other.push(item);
        }
      });

      // Sort within each category
      categories.forEach(cat => {
        grouped[cat].sort((a, b) => {
          if (a.checked !== b.checked) return a.checked ? 1 : -1;
          return sortByDate(a, b);
        });
      });

    } else if (groupBy === 'date') {
      // Group by date added
      grouped.today = [];
      grouped.yesterday = [];
      grouped['this-week'] = [];
      grouped.older = [];

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const weekAgo = new Date(todayStart);
      weekAgo.setDate(weekAgo.getDate() - 7);

      filtered.forEach(item => {
        const itemDate = new Date(item.addedAt);
        if (itemDate >= todayStart) {
          grouped.today.push(item);
        } else if (itemDate >= yesterdayStart) {
          grouped.yesterday.push(item);
        } else if (itemDate >= weekAgo) {
          grouped['this-week'].push(item);
        } else {
          grouped.older.push(item);
        }
      });

      // Sort each group
      Object.keys(grouped).forEach(key => {
        grouped[key].sort(sortByDate);
      });

    } else if (groupBy === 'user') {
      // Group by user (addedBy)
      const userIds = [...new Set(filtered.map(item => item.addedBy))];
      userIds.forEach(userId => {
        grouped[userId] = filtered.filter(item => item.addedBy === userId);
        grouped[userId].sort(sortByDate);
      });

    } else if (groupBy === 'status') {
      // Group by checked status
      grouped.unchecked = filtered.filter(item => !item.checked);
      grouped.checked = filtered.filter(item => item.checked);
      grouped.unchecked.sort(sortByDate);
      grouped.checked.sort(sortByDate);

    } else {
      // No grouping - single flat list
      grouped.all = [...filtered];
      grouped.all.sort((a, b) => {
        if (a.checked !== b.checked) return a.checked ? 1 : -1;
        return sortByDate(a, b);
      });
    }

    // Filter out empty groups
    const nonEmptyGroups = Object.fromEntries(
      Object.entries(grouped).filter(([_, items]) => items.length > 0)
    );

    // Determine sort order for groups
    let groupOrder = [];
    if (groupBy === 'category') {
      groupOrder = ['produce', 'dairy', 'meat', 'pantry', 'frozen', 'other'];
    } else if (groupBy === 'date') {
      groupOrder = ['today', 'yesterday', 'this-week', 'older'];
    } else if (groupBy === 'status') {
      groupOrder = ['unchecked', 'checked'];
    } else {
      groupOrder = Object.keys(nonEmptyGroups);
    }

    const sortedGroupKeys = groupOrder.filter(key => nonEmptyGroups[key]);

    return {
      itemsByGroup: nonEmptyGroups,
      sortedGroups: sortedGroupKeys,
      filteredItemsCount: filtered.length
    };
  }, [items, searchQuery, filters, groupBy]);

  // Legacy support - map to old names for backward compatibility
  const itemsByCategory = itemsByGroup;
  const sortedCategories = sortedGroups;

  // Count totals
  const totalItems = items.length;
  const checkedItems = items.filter(item => item.checked).length;

  return {
    items,
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
    clearCheckedItems,
    refetch: fetchShoppingList
  };
};

export default useShoppingList;
