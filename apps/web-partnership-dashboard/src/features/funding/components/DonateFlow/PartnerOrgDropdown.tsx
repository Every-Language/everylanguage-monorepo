import React from 'react';
import { Input } from '@/shared/components/ui/Input';
import {
  searchPartnerOrgs,
  fetchPartnerOrgsPaginated,
} from '../../api/fundingApi';

interface PartnerOrg {
  id: string;
  name: string;
  description: string | null;
}

interface PartnerOrgDropdownProps {
  value: string; // selected partnerOrgId
  onChange: (orgId: string) => void;
  error?: string;
  disabled?: boolean;
}

const PAGE_SIZE = 20;

export const PartnerOrgDropdown: React.FC<PartnerOrgDropdownProps> = ({
  value,
  onChange,
  error,
  disabled,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [orgs, setOrgs] = React.useState<PartnerOrg[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  // Pagination state for non-search mode
  const [paginationOffset, setPaginationOffset] = React.useState(0);
  // Search limit state for search mode
  const [searchLimit, setSearchLimit] = React.useState(PAGE_SIZE);

  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Get selected org name for display
  const selectedOrg = React.useMemo(() => {
    return orgs.find(org => org.id === value);
  }, [orgs, value]);

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination/search state when query changes
  React.useEffect(() => {
    setOrgs([]);
    setPaginationOffset(0);
    setSearchLimit(PAGE_SIZE);
    setHasMore(true);
  }, [debouncedQuery]);

  // Fetch orgs based on search mode
  React.useEffect(() => {
    if (!isOpen) return;

    const fetchOrgs = async () => {
      setLoading(true);
      try {
        if (debouncedQuery.trim().length >= 2) {
          // Search mode: use RPC - replace results (search doesn't support pagination)
          const result = await searchPartnerOrgs(debouncedQuery, searchLimit);
          setOrgs(
            result.results.map(org => ({
              id: org.id,
              name: org.name,
              description: org.description,
            }))
          );
          // If we got fewer results than requested, there's no more
          setHasMore(result.results.length >= searchLimit);
        } else {
          // Pagination mode: fetch paginated results - append if loading more
          const result = await fetchPartnerOrgsPaginated(
            PAGE_SIZE,
            paginationOffset
          );
          if (paginationOffset === 0) {
            // First load: replace
            setOrgs(result.results);
          } else {
            // Loading more: append
            setOrgs(prev => [...prev, ...result.results]);
          }
          // If we got fewer results than requested, there's no more
          setHasMore(result.results.length >= PAGE_SIZE);
        }
      } catch (err) {
        console.error('Error fetching partner orgs:', err);
        setHasMore(false);
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    };

    fetchOrgs();
  }, [isOpen, debouncedQuery, paginationOffset, searchLimit]);

  // Load more when sentinel is visible
  React.useEffect(() => {
    if (!isOpen || !hasMore || loading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setIsLoadingMore(true);
          if (debouncedQuery.trim().length >= 2) {
            // Search mode: increase limit (will replace results)
            setSearchLimit(prev => prev + PAGE_SIZE);
          } else {
            // Pagination mode: increase offset (will append results)
            setPaginationOffset(prev => prev + PAGE_SIZE);
          }
        }
      },
      {
        root: dropdownRef.current,
        rootMargin: '100px',
      }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [isOpen, hasMore, loading, isLoadingMore, debouncedQuery]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);

    // If user starts typing or clears the input, clear selection
    // This allows them to search for a different org
    if (value && newValue !== selectedOrg?.name) {
      onChange('');
    }

    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleSelectOrg = (orgId: string) => {
    onChange(orgId);
    setIsOpen(false);
    // Clear search query so input shows selected org name
    setSearchQuery('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className='relative'>
      <Input
        ref={inputRef}
        placeholder='Search or select organization...'
        value={selectedOrg && !searchQuery ? selectedOrg.name : searchQuery}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleInputKeyDown}
        disabled={disabled}
        error={error}
        rightIcon={
          loading ? (
            <div className='text-xs text-neutral-500'>Loading...</div>
          ) : undefined
        }
      />

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className='absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto'
        >
          {loading && orgs.length === 0 ? (
            <div className='px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400'>
              Loading organizations...
            </div>
          ) : orgs.length === 0 ? (
            <div className='px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400'>
              {debouncedQuery.trim().length >= 2
                ? 'No organizations found'
                : 'No organizations available'}
            </div>
          ) : (
            <>
              {orgs.map(org => (
                <button
                  key={org.id}
                  type='button'
                  onClick={() => handleSelectOrg(org.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 border-b border-neutral-100 dark:border-neutral-700 last:border-0 ${
                    value === org.id
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : ''
                  }`}
                >
                  <div className='font-medium text-sm text-neutral-900 dark:text-neutral-100'>
                    {org.name}
                  </div>
                  {org.description && (
                    <div className='text-xs text-neutral-600 dark:text-neutral-400 mt-1'>
                      {org.description}
                    </div>
                  )}
                </button>
              ))}

              {/* Sentinel for infinite scroll */}
              {hasMore && (
                <div
                  ref={sentinelRef}
                  className='h-4 flex items-center justify-center'
                >
                  {isLoadingMore && (
                    <div className='text-xs text-neutral-500'>
                      Loading more...
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PartnerOrgDropdown;
