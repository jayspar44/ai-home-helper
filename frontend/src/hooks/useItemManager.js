import { useState, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';

const useItemManager = (getAuthHeaders, activeHomeId, items) => {
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDirectAddItem = useCallback(async (itemToAdd, setItems) => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch(`/api/pantry/${activeHomeId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(itemToAdd)
      });

      if (!response.ok) throw new Error('Failed to add item');

      const newItem = await response.json();
      const displayItem = { 
        ...newItem,
        createdAt: new Date().toISOString() // Add current timestamp for expiry calculations
      };
      setItems(prev => [displayItem, ...prev]);

      // Show success toast with undo option
      showSuccess(`Added "${itemToAdd.name}" to ${itemToAdd.location}`, {
        action: 'Undo',
        onAction: () => handleDeleteItem(displayItem.id, setItems),
        duration: 5000
      });

      return displayItem;
    } catch (err) {
      const errorMessage = err.message || 'Failed to add item';
      setError(errorMessage);
      showError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, activeHomeId, showSuccess, showError]);

  const handleEditItem = useCallback(async (updatedItem, setItems) => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch(`/api/pantry/${activeHomeId}/${updatedItem.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...updatedItem,
          // Remove frontend-only fields
          pendingEnhancement: undefined
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update item';
        try {
          const errorData = await response.text();
          errorMessage = `Failed to update item (${response.status}): ${errorData}`;
        } catch (e) {
          errorMessage = `Failed to update item (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      setItems(prev => prev.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      ));

      // Show success toast for edit
      showSuccess(`Updated "${updatedItem.name}"`);

      return updatedItem;
    } catch (err) {
      const errorMessage = err.message || 'Failed to update item';
      setError(errorMessage);
      showError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, activeHomeId, showSuccess, showError]);

  const handleDeleteItem = useCallback(async (itemId, setItems) => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch(`/api/pantry/${activeHomeId}/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to delete item');

      // Find the item BEFORE updating state (to avoid React strict mode issues)
      const deletedItem = items.find(i => i.id === itemId);

      // Remove from state
      setItems(prev => prev.filter(i => i.id !== itemId));

      // Show success toast
      if (deletedItem) {
        showSuccess(`Deleted "${deletedItem.name}"`, {
          action: 'Undo',
          onAction: () => handleDirectAddItem(deletedItem, setItems),
          duration: 5000
        });
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete item';
      setError(errorMessage);
      showError(errorMessage);
      // Don't throw - we've already shown the error toast
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, activeHomeId, showSuccess, showError, handleDirectAddItem, items]);

  const handleAIItemsDetected = useCallback(async (detectedItems, setItems) => {
    try {
      setIsLoading(true);
      setError('');

      const promises = detectedItems.map(item => 
        fetch(`/api/pantry/${activeHomeId}`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({...item, detectedBy: 'ai'})
        })
      );

      const responses = await Promise.all(promises);
      const newItemsData = await Promise.all(
        responses.map(res => {
          if (!res.ok) throw new Error('One or more items failed to add.');
          return res.json();
        })
      );

      const displayItems = detectedItems.map((item, index) => ({
        ...item,
        id: newItemsData[index].id,
      }));
      
      setItems(prev => [...displayItems, ...prev]);
      
      // Show success toast for bulk AI detection
      showSuccess(`Added ${detectedItems.length} items to pantry`, {
        action: 'View',
        onAction: () => {
          // Could scroll to added items or show them highlighted
          document.querySelector('.pantry-items')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
      
      return displayItems;
    } catch (err) {
      const errorMessage = err.message || 'Failed to add detected items';
      setError(errorMessage);
      showError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, activeHomeId, showSuccess, showError]);

  return {
    isLoading,
    error,
    setError,
    handleDirectAddItem,
    handleEditItem,
    handleDeleteItem,
    handleAIItemsDetected
  };
};

export default useItemManager;