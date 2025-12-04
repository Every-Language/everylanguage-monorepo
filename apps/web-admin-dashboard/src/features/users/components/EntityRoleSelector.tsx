import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';
import { Input, Select, SelectItem } from '@everylanguage/shared-ui';
import type { EntitySearchResult, ResourceType } from '../types';

interface EntityRoleSelectorProps {
  contextType: 'base' | 'project' | 'partner';
  onAssign: (entityId: string, roleId: string) => void;
  onCancel?: () => void;
}

export const EntityRoleSelector: React.FC<EntityRoleSelectorProps> = ({
  contextType,
  onAssign,
  onCancel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedEntity, setSelectedEntity] =
    useState<EntitySearchResult | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch search results
  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: [`search-${contextType}`, debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        return [];
      }

      switch (contextType) {
        case 'base':
          return usersApi.searchBases(debouncedQuery, 10);
        case 'project':
          return usersApi.searchProjects(debouncedQuery, 10);
        case 'partner':
          return usersApi.searchPartnerOrgs(debouncedQuery, 10);
        default:
          return [];
      }
    },
    enabled: debouncedQuery.trim().length >= 2,
  });

  // Fetch roles for the selected entity's resource type
  const resourceTypeMap: Record<string, ResourceType> = {
    base: 'base',
    project: 'project',
    partner: 'partner',
  };

  const { data: roles = [] } = useQuery({
    queryKey: ['roles', resourceTypeMap[contextType]],
    queryFn: () =>
      usersApi.fetchRolesByResourceType(resourceTypeMap[contextType]),
    enabled: !!selectedEntity,
  });

  const handleSelectEntity = (entity: EntitySearchResult) => {
    setSelectedEntity(entity);
    setSearchQuery(entity.name);
    setShowResults(false);
    setSelectedRoleId('');
  };

  const handleAssign = () => {
    if (selectedEntity && selectedRoleId) {
      onAssign(selectedEntity.id, selectedRoleId);
      setSelectedEntity(null);
      setSearchQuery('');
      setSelectedRoleId('');
    }
  };

  const handleCancel = () => {
    setSelectedEntity(null);
    setSearchQuery('');
    setSelectedRoleId('');
    onCancel?.();
  };

  const getPlaceholder = () => {
    switch (contextType) {
      case 'base':
        return 'Search bases...';
      case 'project':
        return 'Search projects...';
      case 'partner':
        return 'Search partner orgs...';
    }
  };

  return (
    <div className='space-y-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800/50'>
      <div>
        <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
          Select {contextType.charAt(0).toUpperCase() + contextType.slice(1)}
        </label>
        <div className='relative'>
          <Input
            placeholder={getPlaceholder()}
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setShowResults(true);
              if (!e.target.value) {
                setSelectedEntity(null);
              }
            }}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
          />
          {searching && (
            <div className='absolute right-3 top-3 text-xs text-neutral-500'>
              Searching...
            </div>
          )}

          {/* Search results dropdown */}
          {showResults &&
            searchResults.length > 0 &&
            debouncedQuery.length >= 2 && (
              <div className='absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                {searchResults.map(entity => (
                  <button
                    key={entity.id}
                    type='button'
                    onClick={() => handleSelectEntity(entity)}
                    className='w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 border-b border-neutral-100 dark:border-neutral-700 last:border-0'>
                    <div className='font-medium text-sm'>{entity.name}</div>
                    {entity.description && (
                      <div className='text-xs text-neutral-600 dark:text-neutral-400 mt-1'>
                        {entity.description}
                      </div>
                    )}
                    {entity.type && (
                      <div className='text-xs text-neutral-500 dark:text-neutral-500 mt-1'>
                        Type: {entity.type}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

          {!searching &&
            debouncedQuery.length >= 2 &&
            searchResults.length === 0 &&
            showResults && (
              <div className='absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg'>
                <div className='px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400'>
                  No {contextType}s found
                </div>
              </div>
            )}
        </div>
      </div>

      {selectedEntity && (
        <>
          <div>
            <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
              Select Role
            </label>
            <Select
              value={selectedRoleId}
              onValueChange={setSelectedRoleId}
              placeholder='Select a role...'>
              {roles.map(role => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className='flex gap-2'>
            <button
              type='button'
              onClick={handleAssign}
              disabled={!selectedRoleId}
              className='px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
              Assign
            </button>
            {onCancel && (
              <button
                type='button'
                onClick={handleCancel}
                className='px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors'>
                Cancel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
