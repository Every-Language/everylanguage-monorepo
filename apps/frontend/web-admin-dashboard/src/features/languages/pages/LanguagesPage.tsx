import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/query/query-client';
import { languagesApi } from '../api/languagesApi';
import { useAuth } from '@/features/auth';
import { LanguageEntityModal } from '../components/LanguageEntityModal';
import type { LanguageEntityWithRegions } from '@/types';
import { Search, Edit } from 'lucide-react';

export function LanguagesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] =
    useState<LanguageEntityWithRegions | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch language entities
  const { data: entities, isLoading } = useQuery({
    queryKey: queryKeys.languageEntities(),
    queryFn: languagesApi.fetchLanguageEntities,
  });

  // Filter entities based on search
  const filteredEntities = entities?.filter(entity =>
    entity.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEntityClick = (entity: LanguageEntityWithRegions) => {
    setSelectedEntity(entity);
  };

  const handleCloseModal = () => {
    setSelectedEntity(null);
  };

  const handleEntityUpdated = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.languageEntities() });
    setSelectedEntity(null);
  };

  return (
    <div className='p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-neutral-900'>
          Language Entities
        </h1>
        <p className='mt-2 text-neutral-600'>
          Manage language entities and their properties
        </p>
      </div>

      {/* Search */}
      <div className='mb-6'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400' />
          <input
            type='text'
            placeholder='Search languages...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
          />
        </div>
      </div>

      {/* Table */}
      <div className='bg-white rounded-lg shadow overflow-hidden'>
        {isLoading ? (
          <div className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto'></div>
            <p className='mt-4 text-neutral-600'>
              Loading language entities...
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-neutral-200'>
              <thead className='bg-neutral-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider'>
                    Name
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider'>
                    Level
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider'>
                    Regions
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider'>
                    Created
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-neutral-200'>
                {filteredEntities && filteredEntities.length > 0 ? (
                  filteredEntities.map(entity => (
                    <tr
                      key={entity.id}
                      className='hover:bg-neutral-50 cursor-pointer'
                      onClick={() => handleEntityClick(entity)}
                    >
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900'>
                        {entity.name}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500'>
                        <span className='px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800'>
                          {entity.level}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500'>
                        {entity.region_count || 0} regions
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500'>
                        {new Date(entity.created_at || '').toLocaleDateString()}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleEntityClick(entity);
                          }}
                          className='text-primary-600 hover:text-primary-900 inline-flex items-center'
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
                      className='px-6 py-8 text-center text-neutral-500'
                    >
                      {searchTerm
                        ? 'No language entities found matching your search'
                        : 'No language entities found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedEntity && (
        <LanguageEntityModal
          entity={selectedEntity}
          onClose={handleCloseModal}
          onSave={handleEntityUpdated}
        />
      )}
    </div>
  );
}
