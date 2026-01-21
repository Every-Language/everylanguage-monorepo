import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { regionsApi } from '@/features/regions/api/regionsApi';

export function useLanguageAvailabilityFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [externalIdSearch, setExternalIdSearch] = useState('');
  const [debouncedExternalIdSearch, setDebouncedExternalIdSearch] =
    useState('');
  const [regionFilters, setRegionFilters] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [regionSearchQuery, setRegionSearchQuery] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce external ID search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedExternalIdSearch(externalIdSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [externalIdSearch]);

  // Fetch regions for filter
  const { data: searchedRegions } = useQuery({
    queryKey: ['region-search-filter', regionSearchQuery],
    queryFn: async () => {
      if (!regionSearchQuery || regionSearchQuery.length < 2) return [];
      const results = await regionsApi.fetchRegions({
        searchQuery: regionSearchQuery,
        page: 1,
        pageSize: 20,
      });
      return results.data;
    },
    enabled: regionSearchQuery.length >= 2,
  });

  const addRegionFilter = (region: { id: string; name: string }): void => {
    if (!regionFilters.find(r => r.id === region.id)) {
      setRegionFilters(prev => [...prev, region]);
      setRegionSearchQuery('');
    }
  };

  const removeRegionFilter = (regionId: string): void => {
    setRegionFilters(prev => prev.filter(r => r.id !== regionId));
  };

  const addNoRegionFilter = (): void => {
    if (!regionFilters.find(r => r.id === 'none')) {
      setRegionFilters(prev => [...prev, { id: 'none', name: 'No Region' }]);
      setRegionSearchQuery('');
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    statusFilter,
    setStatusFilter,
    externalIdSearch,
    setExternalIdSearch,
    debouncedExternalIdSearch,
    regionFilters,
    setRegionFilters,
    regionSearchQuery,
    setRegionSearchQuery,
    searchedRegions,
    addRegionFilter,
    removeRegionFilter,
    addNoRegionFilter,
    regionFilterIds: regionFilters.map(r => r.id),
  };
}
