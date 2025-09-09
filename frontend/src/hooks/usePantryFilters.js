import { useState, useMemo } from 'react';

const usePantryFilters = (items) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    locations: ['pantry', 'fridge', 'freezer'],
    expirationStatus: 'all' // 'all' | 'fresh' | 'expiring-soon' | 'expired'
  });

  const getExpiryStatus = (item) => {
    if (!item.createdAt || item.daysUntilExpiry === null || item.daysUntilExpiry === undefined) {
      return 'unknown';
    }
    
    const expiryDate = Date.parse(item.createdAt) + (item.daysUntilExpiry * 24 * 60 * 60 * 1000);
    const remainingDays = Math.round((expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (remainingDays <= 0) return 'expired';
    if (remainingDays <= 7) return 'expiring-soon';
    return 'fresh';
  };

  const filteredItems = useMemo(() => {
    let filtered = items;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        (item.quantity && item.quantity.toLowerCase().includes(query))
      );
    }

    // Location filter
    filtered = filtered.filter(item => 
      filters.locations.includes(item.location)
    );

    // Expiration status filter
    if (filters.expirationStatus !== 'all') {
      filtered = filtered.filter(item => {
        const status = getExpiryStatus(item);
        return status === filters.expirationStatus;
      });
    }

    return filtered;
  }, [items, searchQuery, filters]);

  const groupedItems = useMemo(() => {
    return {
      pantry: filteredItems.filter(item => item.location === 'pantry'),
      fridge: filteredItems.filter(item => item.location === 'fridge'),
      freezer: filteredItems.filter(item => item.location === 'freezer')
    };
  }, [filteredItems]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    
    // Count location filters (only if not all are selected)
    if (filters.locations.length < 3) {
      count += 1;
    }
    
    // Count expiration status filter (only if not 'all')
    if (filters.expirationStatus !== 'all') {
      count += 1;
    }

    return count;
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      locations: ['pantry', 'fridge', 'freezer'],
      expirationStatus: 'all'
    });
    setSearchQuery('');
  };

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    filteredItems,
    groupedItems,
    activeFiltersCount,
    clearFilters
  };
};

export default usePantryFilters;