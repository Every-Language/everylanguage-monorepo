import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/projectsApi';
import { languagesApi } from '../../languages/api/languagesApi';
import { regionsApi } from '../../regions/api/regionsApi';
import { X, Search } from 'lucide-react';
import type { Database } from '@everylanguage/shared-types';
import { Select, SelectItem } from '@everylanguage/shared-ui';
import { LocationPicker } from '@/shared/components/LocationPicker/LocationPicker';
import type { LanguageEntity, Region } from '@/types';

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

type ProjectStatus = Database['public']['Enums']['project_status'];

export function CreateProjectModal({
  onClose,
  onSuccess,
}: CreateProjectModalProps) {
  const queryClient = useQueryClient();

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetLanguageId, setTargetLanguageId] = useState<string>('');
  const [sourceLanguageId, setSourceLanguageId] = useState<string>('');
  const [regionId, setRegionId] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [projectStatus, setProjectStatus] =
    useState<ProjectStatus>('precreated');

  // Selected language/region objects (to persist after clearing search)
  const [selectedSourceLanguage, setSelectedSourceLanguage] =
    useState<LanguageEntity | null>(null);
  const [selectedTargetLanguage, setSelectedTargetLanguage] =
    useState<LanguageEntity | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

  // Search states for language/region selection
  const [targetLanguageSearch, setTargetLanguageSearch] = useState('');
  const [sourceLanguageSearch, setSourceLanguageSearch] = useState('');
  const [regionSearch, setRegionSearch] = useState('');

  // Search languages
  const { data: searchedTargetLanguages } = useQuery({
    queryKey: ['search-languages', targetLanguageSearch],
    queryFn: () => languagesApi.searchLanguageEntities(targetLanguageSearch),
    enabled: targetLanguageSearch.length >= 2,
  });

  const { data: searchedSourceLanguages } = useQuery({
    queryKey: ['search-languages', sourceLanguageSearch],
    queryFn: () => languagesApi.searchLanguageEntities(sourceLanguageSearch),
    enabled: sourceLanguageSearch.length >= 2,
  });

  // Search regions
  const { data: searchedRegions } = useQuery({
    queryKey: ['search-regions', regionSearch],
    queryFn: () => regionsApi.searchRegions(regionSearch),
    enabled: regionSearch.length >= 2,
  });

  const handleClose = () => {
    onClose();
  };

  // Create mutation
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        throw new Error('Project name is required');
      }
      if (!sourceLanguageId) {
        throw new Error('Source language is required');
      }
      if (!targetLanguageId) {
        throw new Error('Target language is required');
      }

      return await projectsApi.createProject({
        name: name.trim(),
        description: description.trim() || null,
        source_language_entity_id: sourceLanguageId,
        target_language_entity_id: targetLanguageId,
        region_id: regionId,
        location,
        project_status: projectStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      handleClose();
      if (onSuccess) {
        onSuccess();
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProjectMutation.mutate();
  };

  const isFormValid =
    name.trim() &&
    sourceLanguageId &&
    targetLanguageId &&
    !createProjectMutation.isPending;

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      <div className='flex min-h-screen items-center justify-center p-4'>
        {/* Backdrop */}
        <div
          className='fixed inset-0 bg-black/50 transition-opacity'
          onClick={handleClose}
        />

        {/* Modal */}
        <div className='relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col'>
          {/* Header */}
          <div className='flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800'>
            <div>
              <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
                Create New Project
              </h2>
              <p className='text-sm text-neutral-500 dark:text-neutral-400 mt-1'>
                Add a new project to the system
              </p>
            </div>
            <button
              onClick={handleClose}
              className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'>
              <X className='h-5 w-5 text-neutral-500 dark:text-neutral-400' />
            </button>
          </div>

          {/* Content */}
          <form
            onSubmit={handleSubmit}
            className='flex-1 overflow-y-auto p-6 space-y-8'>
            {/* Basic Information */}
            <section>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                Basic Information
              </h3>
              <div className='space-y-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                <div>
                  <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                    Name <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                    placeholder='Enter project name'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                    placeholder='Enter project description (optional)'
                  />
                </div>
              </div>
            </section>

            {/* Languages */}
            <section>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                Languages
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                <div>
                  <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                    Source Language <span className='text-red-500'>*</span>
                  </label>
                  <div className='space-y-2'>
                    <div className='relative'>
                      <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400' />
                      <input
                        type='text'
                        placeholder='Search source language...'
                        value={sourceLanguageSearch}
                        onChange={e => setSourceLanguageSearch(e.target.value)}
                        className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      />
                    </div>
                    {sourceLanguageSearch && searchedSourceLanguages && (
                      <div className='max-h-40 overflow-y-auto border border-neutral-300 dark:border-neutral-700 rounded-lg'>
                        {searchedSourceLanguages.map(lang => (
                          <button
                            key={lang.id}
                            type='button'
                            onClick={() => {
                              setSourceLanguageId(lang.id);
                              setSelectedSourceLanguage(lang);
                              setSourceLanguageSearch('');
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                              sourceLanguageId === lang.id
                                ? 'bg-primary-50 dark:bg-primary-900/20'
                                : ''
                            }`}>
                            <span className='text-sm text-neutral-900 dark:text-neutral-100'>
                              {lang.name}
                              <span className='text-xs text-neutral-500 dark:text-neutral-400 ml-2'>
                                ({lang.level})
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {sourceLanguageId && selectedSourceLanguage && (
                      <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                        Selected: {selectedSourceLanguage.name}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                    Target Language <span className='text-red-500'>*</span>
                  </label>
                  <div className='space-y-2'>
                    <div className='relative'>
                      <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400' />
                      <input
                        type='text'
                        placeholder='Search target language...'
                        value={targetLanguageSearch}
                        onChange={e => setTargetLanguageSearch(e.target.value)}
                        className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      />
                    </div>
                    {targetLanguageSearch && searchedTargetLanguages && (
                      <div className='max-h-40 overflow-y-auto border border-neutral-300 dark:border-neutral-700 rounded-lg'>
                        {searchedTargetLanguages.map(lang => (
                          <button
                            key={lang.id}
                            type='button'
                            onClick={() => {
                              setTargetLanguageId(lang.id);
                              setSelectedTargetLanguage(lang);
                              setTargetLanguageSearch('');
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                              targetLanguageId === lang.id
                                ? 'bg-primary-50 dark:bg-primary-900/20'
                                : ''
                            }`}>
                            <span className='text-sm text-neutral-900 dark:text-neutral-100'>
                              {lang.name}
                              <span className='text-xs text-neutral-500 dark:text-neutral-400 ml-2'>
                                ({lang.level})
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {targetLanguageId && selectedTargetLanguage && (
                      <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                        Selected: {selectedTargetLanguage.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Region */}
            <section>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                Region
              </h3>
              <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                <div className='space-y-2'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400' />
                    <input
                      type='text'
                      placeholder='Search region...'
                      value={regionSearch}
                      onChange={e => setRegionSearch(e.target.value)}
                      className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                    />
                  </div>
                  {regionSearch && searchedRegions && (
                    <div className='max-h-40 overflow-y-auto border border-neutral-300 dark:border-neutral-700 rounded-lg'>
                      <button
                        type='button'
                        onClick={() => {
                          setRegionId(null);
                          setSelectedRegion(null);
                          setRegionSearch('');
                        }}
                        className='w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm text-neutral-500 dark:text-neutral-400 italic border-b border-neutral-200 dark:border-neutral-800'>
                        No Region
                      </button>
                      {searchedRegions.map(region => (
                        <button
                          key={region.id}
                          type='button'
                          onClick={() => {
                            setRegionId(region.id);
                            setSelectedRegion(region);
                            setRegionSearch('');
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                            regionId === region.id
                              ? 'bg-primary-50 dark:bg-primary-900/20'
                              : ''
                          }`}>
                          <span className='text-sm text-neutral-900 dark:text-neutral-100'>
                            {region.name}
                            <span className='text-xs text-neutral-500 dark:text-neutral-400 ml-2'>
                              ({region.level})
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {regionId && selectedRegion && (
                    <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                      Selected: {selectedRegion.name}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Location */}
            <section>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                Location
              </h3>
              <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                <LocationPicker
                  location={location}
                  onLocationChange={setLocation}
                  height='400px'
                />
              </div>
            </section>

            {/* Status */}
            <section>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                Status
              </h3>
              <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                <Select
                  label='Project Status'
                  value={projectStatus}
                  onValueChange={value =>
                    setProjectStatus(value as ProjectStatus)
                  }>
                  <SelectItem value='precreated'>Precreated</SelectItem>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='completed'>Completed</SelectItem>
                  <SelectItem value='cancelled'>Cancelled</SelectItem>
                </Select>
              </div>
            </section>

            {/* Error message */}
            {createProjectMutation.isError && (
              <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
                <p className='text-sm text-red-800 dark:text-red-200'>
                  {createProjectMutation.error instanceof Error
                    ? createProjectMutation.error.message
                    : 'Failed to create project. Please try again.'}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className='flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800'>
              <button
                type='button'
                onClick={handleClose}
                className='px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors'>
                Cancel
              </button>
              <button
                type='submit'
                disabled={!isFormValid || createProjectMutation.isPending}
                className='px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                {createProjectMutation.isPending
                  ? 'Creating...'
                  : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
