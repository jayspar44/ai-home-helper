import { useState, useMemo, useEffect } from 'react';
import { getExpiryStatus } from '../utils/dateUtils';

const usePantryFilters = (items) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    locations: ['pantry', 'fridge', 'freezer'],
    expirationStatus: 'all' // 'all' | 'fresh' | 'expiring-soon' | 'expired'
  });
  const [groupBy, setGroupBy] = useState(() => {
    const saved = localStorage.getItem('pantryGroupBy');
    return saved || 'none'; // Default to no grouping
  });

  // Persist groupBy preference to localStorage
  useEffect(() => {
    localStorage.setItem('pantryGroupBy', groupBy);
  }, [groupBy]);

  // getExpiryStatus moved to dateUtils

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

  // Group items based on groupBy strategy
  const { itemsByGroup, sortedGroups } = useMemo(() => {
    const grouped = {};

    if (groupBy === 'location') {
      // Group by location (pantry, fridge, freezer)
      const locations = ['pantry', 'fridge', 'freezer'];
      locations.forEach(loc => { grouped[loc] = []; });

      filteredItems.forEach(item => {
        const location = item.location || 'pantry';
        if (grouped[location]) {
          grouped[location].push(item);
        } else {
          grouped.pantry.push(item);
        }
      });

    } else if (groupBy === 'expiration') {
      // Group by expiration status
      grouped.expired = [];
      grouped['expiring-soon'] = [];
      grouped.fresh = [];

      filteredItems.forEach(item => {
        const status = getExpiryStatus(item);
        if (grouped[status]) {
          grouped[status].push(item);
        }
      });

    } else {
      // No grouping - single flat list
      grouped.all = [...filteredItems];
    }

    // Filter out empty groups
    const nonEmptyGroups = Object.fromEntries(
      Object.entries(grouped).filter(([_, items]) => items.length > 0)
    );

    // Determine sort order for groups
    let groupOrder = [];
    if (groupBy === 'location') {
      groupOrder = ['pantry', 'fridge', 'freezer'];
    } else if (groupBy === 'expiration') {
      groupOrder = ['expired', 'expiring-soon', 'fresh']; // Critical items first
    } else {
      groupOrder = ['all'];
    }

    const sortedGroupKeys = groupOrder.filter(key => nonEmptyGroups[key]);

    return {
      itemsByGroup: nonEmptyGroups,
      sortedGroups: sortedGroupKeys
    };
  }, [filteredItems, groupBy]);

  // Legacy support for existing code
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
    groupedItems, // Legacy support
    itemsByGroup,
    sortedGroups,
    groupBy,
    setGroupBy,
    activeFiltersCount,
    clearFilters
  };
};

export default usePantryFilters;