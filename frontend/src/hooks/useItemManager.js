import { useState, useCallback } from 'react';

const useItemManager = (getAuthHeaders, activeHomeId) => {
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
      const displayItem = { ...itemToAdd, id: newItem.id };
      setItems(prev => [displayItem, ...prev]);

      return displayItem;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, activeHomeId]);

  const handleEditItem = useCallback(async (updatedItem, setItems) => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch(`/api/pantry/${activeHomeId}/${updatedItem.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: updatedItem.name,
          location: updatedItem.location,
          ...(updatedItem.quantity && { quantity: updatedItem.quantity }),
          ...(updatedItem.daysUntilExpiry && { daysUntilExpiry: updatedItem.daysUntilExpiry }),
        })
      });

      if (!response.ok) throw new Error('Failed to update item');

      setItems(prev => prev.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      ));

      return updatedItem;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, activeHomeId]);

  const handleDeleteItem = useCallback(async (itemId, setItems) => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch(`/api/pantry/${activeHomeId}/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to delete item');

      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, activeHomeId]);

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
      return displayItems;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, activeHomeId]);

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