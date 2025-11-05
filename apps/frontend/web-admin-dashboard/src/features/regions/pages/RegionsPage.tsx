import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/query/query-client';
import { regionsApi } from '../api/regionsApi';
import { RegionModal } from '../components/RegionModal';
import type { RegionWithLanguages } from '@/types';
import { Search, Edit } from 'lucide-react';

export function RegionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] =
    useState<RegionWithLanguages | null>(null);
  const queryClient = useQueryClient();

  // Fetch regions
  const { data: regions, isLoading } = useQuery({
    queryKey: queryKeys.regions(),
    queryFn: regionsApi.fetchRegions,
  });

  // Filter regions based on search
  const filteredRegions = regions?.filter(region =>
    region.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRegionClick = (region: RegionWithLanguages) => {
    setSelectedRegion(region);
  };

  const handleCloseModal = () => {
    setSelectedRegion(null);
  };

  const handleRegionUpdated = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.regions() });
    setSelectedRegion(null);
  };

  return (
    <div className='p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
          Regions
        </h1>
        <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
          Manage regional data and relationships
        </p>
      </div>

      {/* Search */}
      <div className='mb-6'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
          <input
            type='text'
            placeholder='Search regions...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
          />
        </div>
      </div>

      {/* Table */}
      <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 overflow-hidden'>
        {isLoading ? (
          <div className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
            <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
              Loading regions...
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
              <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Name
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Level
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Languages
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Created
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                {filteredRegions && filteredRegions.length > 0 ? (
                  filteredRegions.map(region => (
                    <tr
                      key={region.id}
                      className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
                      onClick={() => handleRegionClick(region)}
                    >
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                        {region.name}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        <span className='px-2 py-1 text-xs font-medium rounded-full bg-secondary-100 dark:bg-secondary-900/30 text-secondary-800 dark:text-secondary-300'>
                          {region.level}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {region.language_count || 0} languages
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {new Date(region.created_at || '').toLocaleDateString()}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleRegionClick(region);
                          }}
                          className='text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-300 inline-flex items-center transition-colors'
                        >
                          <Edit className='h-4 w-4 mr-1' />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'
                    >
                      {searchTerm
                        ? 'No regions found matching your search'
                        : 'No regions found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedRegion && (
        <RegionModal
          region={selectedRegion}
          onClose={handleCloseModal}
          onSave={handleRegionUpdated}
        />
      )}
    </div>
  );
}
