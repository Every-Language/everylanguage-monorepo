import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { partnerOrgsApi } from '../api/partnerOrgsApi';
import { PartnerOrgModal } from '../components/PartnerOrgModal';
import type { PartnerOrgWithUsers } from '../types';
import { ChevronLeft, ChevronRight, Search, Plus } from 'lucide-react';
import { Select, SelectItem } from '@everylanguage/shared-ui';

export function PartnerOrgsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [includeIndividual, setIncludeIndividual] = useState<'yes' | 'no'>(
    'no'
  ); // Default: no individual orgs
  const [isPublic, setIsPublic] = useState<boolean | null>(null); // null = all, true = public only, false = private only
  const [selectedOrg, setSelectedOrg] = useState<PartnerOrgWithUsers | null>(
    null
  );
  const [isCreating, setIsCreating] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: response, isLoading } = useQuery({
    queryKey: [
      'partner-orgs',
      page,
      pageSize,
      debouncedSearch,
      includeIndividual,
      isPublic,
    ],
    queryFn: () => {
      const includeIndividualBool = includeIndividual === 'yes';
      console.log('[PartnerOrgsPage] Calling fetchPartnerOrgs with:', {
        includeIndividual,
        includeIndividualBool,
        isPublic,
      });
      return partnerOrgsApi.fetchPartnerOrgs({
        page,
        pageSize,
        searchQuery: debouncedSearch || undefined,
        includeIndividual: includeIndividualBool,
        isPublic,
      });
    },
  });

  const orgs = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;

  const handleOrgClick = async (org: PartnerOrgWithUsers) => {
    setIsCreating(false);
    try {
      const fullOrg = await partnerOrgsApi.fetchPartnerOrgById(org.id);
      if (fullOrg) {
        setSelectedOrg(fullOrg);
      }
    } catch (error) {
      console.error('Error fetching partner org:', error);
      setSelectedOrg(org);
    }
  };

  const handleCreateClick = () => {
    setIsCreating(true);
    setSelectedOrg(null);
  };

  const handleCloseModal = () => {
    setSelectedOrg(null);
    setIsCreating(false);
  };

  const handleOrgUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['partner-orgs'] });
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
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
            Partner Organizations
          </h1>
          <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
            Manage partner organizations and user assignments
          </p>
        </div>
        <button
          onClick={handleCreateClick}
          className='px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors flex items-center gap-2'>
          <Plus className='h-5 w-5' />
          Create Partner Org
        </button>
      </div>

      {/* Search */}
      <div className='mb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
          <input
            type='text'
            placeholder='Search partner orgs by name or description (min 2 characters)...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
          />
        </div>
        {debouncedSearch && (
          <p className='mt-2 text-sm text-neutral-500 dark:text-neutral-400'>
            Showing {orgs.length} results for "{debouncedSearch}"
          </p>
        )}
      </div>

      {/* Filters */}
      <div className='mb-6 grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
            Include Individual Organizations
          </label>
          <Select
            value={includeIndividual}
            onValueChange={(value: string) => {
              setIncludeIndividual(value as 'yes' | 'no');
              setPage(1);
            }}>
            <SelectItem value='no'>No</SelectItem>
            <SelectItem value='yes'>Yes</SelectItem>
          </Select>
        </div>
        <div>
          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
            Visibility
          </label>
          <Select
            value={isPublic === null ? 'all' : isPublic ? 'public' : 'private'}
            onValueChange={value => {
              setIsPublic(value === 'all' ? null : value === 'public');
              setPage(1);
            }}>
            <SelectItem value='all'>All</SelectItem>
            <SelectItem value='public'>Public Only</SelectItem>
            <SelectItem value='private'>Private Only</SelectItem>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 overflow-hidden'>
        {isLoading ? (
          <div className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
            <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
              Loading partner orgs...
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
                    Description
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Is Public
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                {orgs && orgs.length > 0 ? (
                  orgs.map(org => (
                    <tr
                      key={org.id}
                      className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
                      onClick={() => handleOrgClick(org)}>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                        {org.name}
                      </td>
                      <td className='px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400 max-w-md truncate'>
                        {org.description || '—'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm'>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            org.is_public
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300'
                          }`}>
                          {org.is_public ? 'Public' : 'Private'}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {formatDate(org.created_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'>
                      {debouncedSearch
                        ? 'No partner orgs found matching your search'
                        : 'No partner orgs found'}
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
                className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                <ChevronLeft className='h-4 w-4' />
              </button>
              <span className='text-sm text-neutral-600 dark:text-neutral-400 min-w-[100px] text-center'>
                {((page - 1) * pageSize + 1).toLocaleString()} -{' '}
                {Math.min(page * pageSize, totalCount).toLocaleString()}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                <ChevronRight className='h-4 w-4' />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Partner Org Modal */}
      {(selectedOrg || isCreating) && (
        <PartnerOrgModal
          org={selectedOrg}
          isCreating={isCreating}
          onClose={handleCloseModal}
          onUpdate={handleOrgUpdated}
        />
      )}
    </div>
  );
}
