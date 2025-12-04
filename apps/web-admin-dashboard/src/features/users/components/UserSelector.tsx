import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';
import { X, Search } from 'lucide-react';

interface UserSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (userId: string, userName?: string) => void;
  excludeUserIds?: string[];
  searchPlaceholder?: string;
}

export const UserSelector: React.FC<UserSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  excludeUserIds = [],
  searchPlaceholder = 'Search by name or email...',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: response, isLoading } = useQuery({
    queryKey: ['users-selector', page, pageSize, debouncedSearch],
    queryFn: () =>
      usersApi.fetchUsers({
        page,
        pageSize,
        searchQuery: debouncedSearch || undefined,
        includeAnonymous: false, // Don't show anonymous users in selector
      }),
    enabled: isOpen,
  });

  const users = (response?.data || []).filter(
    user => !excludeUserIds.includes(user.id)
  );

  const handleUserClick = (userId: string, userName: string) => {
    onSelect(userId, userName);
    onClose();
    setSearchQuery('');
    setPage(1);
  };

  const handleClose = () => {
    onClose();
    setSearchQuery('');
    setPage(1);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black opacity-50'
        onClick={handleClose}
      />

      {/* Modal */}
      <div className='relative max-w-md w-full max-h-[80vh] bg-white dark:bg-neutral-900 shadow-xl rounded-lg flex flex-col'>
        {/* Header */}
        <div className='px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              Select User
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              Search and select a user to assign
            </p>
          </div>
          <button
            onClick={handleClose}
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'>
            <X className='h-5 w-5 text-neutral-600 dark:text-neutral-400' />
          </button>
        </div>

        {/* Search */}
        <div className='px-6 py-4 border-b border-neutral-200 dark:border-neutral-800'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400' />
            <input
              type='text'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
              autoFocus
            />
          </div>
        </div>

        {/* User List */}
        <div className='flex-1 overflow-y-auto'>
          {isLoading ? (
            <div className='p-8 text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
              <p className='mt-4 text-sm text-neutral-600 dark:text-neutral-400'>
                Searching users...
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className='p-8 text-center'>
              <p className='text-sm text-neutral-500 dark:text-neutral-400'>
                {debouncedSearch
                  ? 'No users found matching your search'
                  : 'Start typing to search for users'}
              </p>
            </div>
          ) : (
            <div className='divide-y divide-neutral-200 dark:divide-neutral-800'>
              {users.map(user => {
                const userName =
                  user.first_name || user.last_name
                    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                    : user.email || 'Unknown User';

                return (
                  <button
                    key={user.id}
                    onClick={() => handleUserClick(user.id, userName)}
                    className='w-full px-6 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors'>
                    <div className='font-medium text-sm text-neutral-900 dark:text-neutral-100'>
                      {userName}
                    </div>
                    {user.email && (
                      <div className='text-xs text-neutral-500 dark:text-neutral-400 mt-1'>
                        {user.email}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!isLoading &&
            response &&
            response.totalPages > 1 &&
            users.length > 0 && (
              <div className='px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
                <div className='text-sm text-neutral-600 dark:text-neutral-400'>
                  Page {page} of {response.totalPages}
                </div>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setPage(p => Math.min(response.totalPages, p + 1))
                    }
                    disabled={page === response.totalPages}
                    className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                    Next
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
