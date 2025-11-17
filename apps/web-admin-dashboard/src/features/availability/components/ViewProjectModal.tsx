import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/projectsApi';
import { languagesApi } from '../../languages/api/languagesApi';
import { regionsApi } from '../../regions/api/regionsApi';
import { X, Edit, Save, Search } from 'lucide-react';
import type { Database } from '@everylanguage/shared-types';
import { Select, SelectItem } from '@everylanguage/shared-ui';

interface ViewProjectModalProps {
  projectId: string;
  onClose: () => void;
  onNavigateToLanguage?: (languageId: string) => void;
  onNavigateToRegion?: (regionId: string) => void;
}

type ProjectStatus = Database['public']['Enums']['project_status'];
type FundingStatus = Database['public']['Enums']['funding_status'];

export function ViewProjectModal({
  projectId,
  onClose,
  onNavigateToLanguage,
  onNavigateToRegion,
}: ViewProjectModalProps) {
  const queryClient = useQueryClient();
  const [isEntering, setIsEntering] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  // Section editing states
  const [editingInfo, setEditingInfo] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetLanguageId, setTargetLanguageId] = useState<string>('');
  const [sourceLanguageId, setSourceLanguageId] = useState<string>('');
  const [regionId, setRegionId] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] =
    useState<ProjectStatus>('precreated');
  const [fundingStatus, setFundingStatus] = useState<FundingStatus>('unfunded');

  // Search states for language/region selection
  const [targetLanguageSearch, setTargetLanguageSearch] = useState('');
  const [sourceLanguageSearch, setSourceLanguageSearch] = useState('');
  const [regionSearch, setRegionSearch] = useState('');

  // Fetch project
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.fetchProjectById(projectId),
  });

  // Sync form states with project data
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setTargetLanguageId(project.target_language_entity_id);
      setSourceLanguageId(project.source_language_entity_id);
      setRegionId(project.region_id);
      setProjectStatus(project.project_status);
      setFundingStatus(project.funding_status);
    }
  }, [project]);

  // Search languages
  const { data: searchedTargetLanguages } = useQuery({
    queryKey: ['search-languages', targetLanguageSearch],
    queryFn: () => languagesApi.searchLanguageEntities(targetLanguageSearch),
    enabled: editingInfo && targetLanguageSearch.length >= 2,
  });

  const { data: searchedSourceLanguages } = useQuery({
    queryKey: ['search-languages', sourceLanguageSearch],
    queryFn: () => languagesApi.searchLanguageEntities(sourceLanguageSearch),
    enabled: editingInfo && sourceLanguageSearch.length >= 2,
  });

  // Search regions
  const { data: searchedRegions } = useQuery({
    queryKey: ['search-regions', regionSearch],
    queryFn: () => regionsApi.searchRegions(regionSearch),
    enabled: editingInfo && regionSearch.length >= 2,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsEntering(false);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  // Update mutation
  const updateProjectMutation = useMutation({
    mutationFn: async () => {
      await projectsApi.updateProject(projectId, {
        name,
        description: description || null,
        target_language_entity_id: targetLanguageId,
        source_language_entity_id: sourceLanguageId,
        region_id: regionId,
        project_status: projectStatus,
        funding_status: fundingStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingInfo(false);
    },
  });

  const handleSave = () => {
    updateProjectMutation.mutate();
  };

  const getStatusBadgeColor = (status: ProjectStatus): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'precreated':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
    }
  };

  const getFundingBadgeColor = (status: FundingStatus): string => {
    switch (status) {
      case 'fully_funded':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'partially_funded':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'unfunded':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
    }
  };

  if (isLoading) {
    return (
      <div className='fixed inset-0 z-50 overflow-hidden'>
        <div className='absolute inset-0 bg-black bg-opacity-50' />
        <div className='absolute inset-y-0 right-0 max-w-3xl w-full bg-white dark:bg-neutral-900 shadow-xl flex items-center justify-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500'></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className='fixed inset-0 z-50 overflow-hidden'>
        <div
          className='absolute inset-0 bg-black bg-opacity-50'
          onClick={handleClose}
        />
        <div className='absolute inset-y-0 right-0 max-w-3xl w-full bg-white dark:bg-neutral-900 shadow-xl flex items-center justify-center'>
          <p className='text-neutral-500 dark:text-neutral-400'>
            Project not found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='fixed inset-0 z-50 overflow-hidden'>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ease-out ${
          isExiting ? 'opacity-0' : isEntering ? 'opacity-0' : 'opacity-50'
        }`}
        onClick={handleClose}
      />

      {/* Slide panel */}
      <div
        className={`absolute inset-y-0 right-0 max-w-3xl w-full bg-white dark:bg-neutral-900 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          isExiting
            ? 'translate-x-full'
            : isEntering
              ? 'translate-x-full'
              : 'translate-x-0'
        }`}
      >
        {/* Header */}
        <div className='px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              {project.name}
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              Project Details
            </p>
          </div>
          <button
            onClick={handleClose}
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
          >
            <X className='h-5 w-5 text-neutral-600 dark:text-neutral-400' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-8'>
          {/* Basic Information */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Basic Information
              </h3>
              {!editingInfo && (
                <button
                  onClick={() => setEditingInfo(true)}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'
                >
                  <Edit className='h-4 w-4' />
                  Edit
                </button>
              )}
            </div>
            <div className='space-y-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Name
                </label>
                {editingInfo ? (
                  <input
                    type='text'
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                  />
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {project.name}
                  </p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Description
                </label>
                {editingInfo ? (
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                  />
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap'>
                    {project.description || 'No description'}
                  </p>
                )}
              </div>
              {editingInfo && (
                <div className='flex gap-2 pt-2'>
                  <button
                    onClick={() => {
                      setEditingInfo(false);
                      setName(project.name);
                      setDescription(project.description || '');
                      setTargetLanguageId(project.target_language_entity_id);
                      setSourceLanguageId(project.source_language_entity_id);
                      setRegionId(project.region_id);
                      setProjectStatus(project.project_status);
                      setFundingStatus(project.funding_status);
                    }}
                    className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateProjectMutation.isPending}
                    className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'
                  >
                    <Save className='h-4 w-4' />
                    {updateProjectMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Languages */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Languages
              </h3>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Source Language
                </label>
                {editingInfo ? (
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
                            onClick={() => {
                              setSourceLanguageId(lang.id);
                              setSourceLanguageSearch('');
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                              sourceLanguageId === lang.id
                                ? 'bg-primary-50 dark:bg-primary-900/20'
                                : ''
                            }`}
                          >
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
                    {project.source_language && (
                      <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                        Current: {project.source_language.name}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    {project.source_language ? (
                      <button
                        onClick={() => {
                          if (onNavigateToLanguage) {
                            onNavigateToLanguage(project.source_language!.id);
                          }
                        }}
                        className='text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline'
                      >
                        {project.source_language.name}
                      </button>
                    ) : (
                      <p className='text-sm text-neutral-500 dark:text-neutral-400'>
                        Not specified
                      </p>
                    )}
                    {project.source_language && (
                      <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                        {project.source_language.level}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Target Language
                </label>
                {editingInfo ? (
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
                            onClick={() => {
                              setTargetLanguageId(lang.id);
                              setTargetLanguageSearch('');
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                              targetLanguageId === lang.id
                                ? 'bg-primary-50 dark:bg-primary-900/20'
                                : ''
                            }`}
                          >
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
                    {project.target_language && (
                      <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                        Current: {project.target_language.name}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    {project.target_language ? (
                      <button
                        onClick={() => {
                          if (onNavigateToLanguage) {
                            onNavigateToLanguage(project.target_language!.id);
                          }
                        }}
                        className='text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline'
                      >
                        {project.target_language.name}
                      </button>
                    ) : (
                      <p className='text-sm text-neutral-500 dark:text-neutral-400'>
                        Not specified
                      </p>
                    )}
                    {project.target_language && (
                      <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                        {project.target_language.level}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Region */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Region
              </h3>
            </div>
            <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              {editingInfo ? (
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
                        onClick={() => {
                          setRegionId(null);
                          setRegionSearch('');
                        }}
                        className='w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm text-neutral-500 dark:text-neutral-400 italic border-b border-neutral-200 dark:border-neutral-800'
                      >
                        No Region
                      </button>
                      {searchedRegions.map(region => (
                        <button
                          key={region.id}
                          onClick={() => {
                            setRegionId(region.id);
                            setRegionSearch('');
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                            regionId === region.id
                              ? 'bg-primary-50 dark:bg-primary-900/20'
                              : ''
                          }`}
                        >
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
                  {project.region && (
                    <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                      Current: {project.region.name}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  {project.region ? (
                    <button
                      onClick={() => {
                        if (onNavigateToRegion) {
                          onNavigateToRegion(project.region!.id);
                        }
                      }}
                      className='text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline'
                    >
                      {project.region.name}
                    </button>
                  ) : (
                    <p className='text-sm text-neutral-500 dark:text-neutral-400'>
                      Not specified
                    </p>
                  )}
                  {project.region && (
                    <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                      {project.region.level}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Status */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Status
              </h3>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              <div>
                {editingInfo ? (
                  <Select
                    label='Project Status'
                    value={projectStatus}
                    onValueChange={value =>
                      setProjectStatus(value as ProjectStatus)
                    }
                  >
                    <SelectItem value='precreated'>Precreated</SelectItem>
                    <SelectItem value='active'>Active</SelectItem>
                    <SelectItem value='completed'>Completed</SelectItem>
                    <SelectItem value='cancelled'>Cancelled</SelectItem>
                  </Select>
                ) : (
                  <>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Project Status
                    </label>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
                        project.project_status
                      )}`}
                    >
                      {project.project_status}
                    </span>
                  </>
                )}
              </div>
              <div>
                {editingInfo ? (
                  <Select
                    label='Funding Status'
                    value={fundingStatus}
                    onValueChange={value =>
                      setFundingStatus(value as FundingStatus)
                    }
                  >
                    <SelectItem value='unfunded'>Unfunded</SelectItem>
                    <SelectItem value='partially_funded'>
                      Partially Funded
                    </SelectItem>
                    <SelectItem value='fully_funded'>Fully Funded</SelectItem>
                  </Select>
                ) : (
                  <>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Funding Status
                    </label>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getFundingBadgeColor(
                        project.funding_status
                      )}`}
                    >
                      {project.funding_status.replace('_', ' ')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Progress */}
          {project.progress && (
            <section>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                Progress
              </h3>
              <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span className='text-neutral-600 dark:text-neutral-400'>
                    Chapters Completed:
                  </span>
                  <span className='text-neutral-900 dark:text-neutral-100 font-medium'>
                    {project.progress.completed_chapters} /{' '}
                    {project.progress.total_chapters}
                  </span>
                </div>
                <div className='w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-primary-600 dark:bg-primary-500 transition-all'
                    style={{
                      width: `${Math.min(project.progress.progress_percentage, 100)}%`,
                    }}
                  />
                </div>
                <div className='text-sm text-neutral-600 dark:text-neutral-400'>
                  {project.progress.progress_percentage}% complete
                </div>
              </div>
            </section>
          )}

          {/* Metadata */}
          <section>
            <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
              Metadata
            </h3>
            <div className='space-y-2 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              <div className='flex justify-between text-sm'>
                <span className='text-neutral-600 dark:text-neutral-400'>
                  Created At:
                </span>
                <span className='text-neutral-900 dark:text-neutral-100'>
                  {project.created_at
                    ? new Date(project.created_at).toLocaleString()
                    : '—'}
                </span>
              </div>
              {project.updated_at && (
                <div className='flex justify-between text-sm'>
                  <span className='text-neutral-600 dark:text-neutral-400'>
                    Updated At:
                  </span>
                  <span className='text-neutral-900 dark:text-neutral-100'>
                    {new Date(project.updated_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
