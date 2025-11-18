import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';
import { UserModal } from '../components/UserModal';
import type { UserWithRoles } from '../types';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: response, isLoading } = useQuery({
    queryKey: ['users', page, pageSize, debouncedSearch],
    queryFn: () =>
      usersApi.fetchUsers({
        page,
        pageSize,
        searchQuery: debouncedSearch || undefined,
      }),
  });

  const users = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;

  const handleUserClick = async (user: UserWithRoles) => {
    // Fetch full user data with roles
    try {
      const fullUser = await usersApi.fetchUserById(user.id);
      if (fullUser) {
        setSelectedUser(fullUser);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      // Fallback to basic user data
      setSelectedUser(user);
    }
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
  };

  const handleUserUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className='p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
          Users
        </h1>
        <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
          Manage users and their role assignments
        </p>
      </div>

      {/* Search */}
      <div className='mb-6'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400' />
          <input
            type='text'
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder='Search users by name or email...'
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
          />
        </div>
      </div>

      {/* Table */}
      <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 overflow-hidden'>
        {isLoading ? (
          <div className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
            <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
              Loading users...
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
              <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Name
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Email
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Phone
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Roles
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                {users && users.length > 0 ? (
                  users.map(user => (
                    <tr
                      key={user.id}
                      className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
                      onClick={() => handleUserClick(user)}
                    >
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                        {user.first_name || user.last_name
                          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                          : '—'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {user.email || '—'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {user.phone_number || '—'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        <span className='px-2 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'>
                          {user.role_count || 0} role
                          {user.role_count !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {formatDate(user.created_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'
                    >
                      {debouncedSearch
                        ? 'No users found matching your search'
                        : 'No users found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className='mt-4 flex items-center justify-between px-6 py-3 border-t border-neutral-200 dark:border-neutral-800'>
            <div className='text-sm text-neutral-600 dark:text-neutral-400'>
              Page {page} of {totalPages} ({totalCount.toLocaleString()} total)
            </div>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                <ChevronLeft className='h-4 w-4' />
              </button>
              <span className='text-sm text-neutral-600 dark:text-neutral-400 min-w-[100px] text-center'>
                {((page - 1) * pageSize + 1).toLocaleString()} -{' '}
                {Math.min(page * pageSize, totalCount).toLocaleString()}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                <ChevronRight className='h-4 w-4' />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Modal */}
      {selectedUser && (
        <UserModal
          user={selectedUser}
          onClose={handleCloseModal}
          onUpdate={handleUserUpdated}
        />
      )}
    </div>
  );
}
