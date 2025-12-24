import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/projectsApi';
import { versionsApi } from '../api/versionsApi';
import { languagesApi } from '../../languages/api/languagesApi';
import { regionsApi } from '../../regions/api/regionsApi';
import { EntityUserAssignments } from '@/features/users/components/EntityUserAssignments';
import { EntityBaseAssignments } from '@/features/users/components/EntityBaseAssignments';
import { EntityPartnerOrgAssignments } from '@/features/users/components/EntityPartnerOrgAssignments';
import { X, Edit, Save, Search, Plus } from 'lucide-react';
import type { Database } from '@everylanguage/shared-types';
import { Select, SelectItem } from '@everylanguage/shared-ui';
import { LocationPicker } from '@/shared/components/LocationPicker/LocationPicker';

interface ViewProjectModalProps {
  projectId: string;
  onClose: () => void;
  onNavigateToLanguage?: (languageId: string) => void;
  onNavigateToRegion?: (regionId: string) => void;
  onOpenTextVersion?: (textVersionId: string) => void;
  onOpenAudioVersion?: (audioVersionId: string) => void;
}

type ProjectStatus = Database['public']['Enums']['project_status'];
type PublishStatus = Database['public']['Enums']['publish_status'];

export function ViewProjectModal({
  projectId,
  onClose,
  onNavigateToLanguage,
  onNavigateToRegion,
  onOpenTextVersion,
  onOpenAudioVersion,
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
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [projectStatus, setProjectStatus] =
    useState<ProjectStatus>('precreated');
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('pending');

  // Search states for language/region selection
  const [targetLanguageSearch, setTargetLanguageSearch] = useState('');
  const [sourceLanguageSearch, setSourceLanguageSearch] = useState('');
  const [regionSearch, setRegionSearch] = useState('');

  // Create version states
  const [showCreateTextVersion, setShowCreateTextVersion] = useState(false);
  const [showCreateAudioVersion, setShowCreateAudioVersion] = useState(false);
  const [newTextVersionName, setNewTextVersionName] = useState('');
  const [newAudioVersionName, setNewAudioVersionName] = useState('');
  const [selectedTextBibleVersionId, setSelectedTextBibleVersionId] =
    useState<string>('');
  const [selectedAudioBibleVersionId, setSelectedAudioBibleVersionId] =
    useState<string>('');

  // Fetch project
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.fetchProjectById(projectId),
  });

  // Fetch project users
  const { data: projectUsers, refetch: refetchProjectUsers } = useQuery({
    queryKey: ['project-users', projectId],
    queryFn: () => projectsApi.fetchProjectUsers(projectId),
    enabled: !!projectId,
  });

  // Sync form states with project data
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setTargetLanguageId(project.target_language_entity_id);
      setSourceLanguageId(project.source_language_entity_id);
      setRegionId(project.region_id);
      setLocation(project.location || null);
      setProjectStatus(project.project_status);
      setPublishStatus(project.publish_status || 'pending');
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

  // Fetch bible versions for creating versions
  const { data: bibleVersions } = useQuery({
    queryKey: ['bible-versions'],
    queryFn: () => versionsApi.fetchBibleVersions(),
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
        location,
        project_status: projectStatus,
        publish_status: publishStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingInfo(false);
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: string;
    }) => {
      await projectsApi.assignUserToProject(projectId, userId, roleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-users', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      refetchProjectUsers();
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      projectsApi.removeUserFromProject(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-users', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      refetchProjectUsers();
    },
  });

  // Fetch project bases
  const { data: projectBases, refetch: refetchProjectBases } = useQuery({
    queryKey: ['project-bases', projectId],
    queryFn: () => projectsApi.fetchProjectBases(projectId),
    enabled: !!projectId,
  });

  const assignBaseMutation = useMutation({
    mutationFn: async (baseId: string) => {
      await projectsApi.assignBaseToProject(projectId, baseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bases', projectId] });
      refetchProjectBases();
    },
  });

  const removeBaseMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      projectsApi.unassignBaseFromProject(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bases', projectId] });
      refetchProjectBases();
    },
  });

  // Fetch project partner orgs
  const { data: projectPartnerOrgs, refetch: refetchProjectPartnerOrgs } =
    useQuery({
      queryKey: ['project-partner-orgs', projectId],
      queryFn: () => projectsApi.fetchProjectPartnerOrgs(projectId),
      enabled: !!projectId,
    });

  const assignPartnerOrgMutation = useMutation({
    mutationFn: async (partnerOrgId: string) => {
      await projectsApi.assignPartnerOrgToProject(projectId, partnerOrgId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-partner-orgs', projectId],
      });
      refetchProjectPartnerOrgs();
    },
  });

  const removePartnerOrgMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      projectsApi.unassignPartnerOrgFromProject(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-partner-orgs', projectId],
      });
      refetchProjectPartnerOrgs();
    },
  });

  const handleSave = () => {
    updateProjectMutation.mutate();
  };

  // Create text version mutation
  const createTextVersionMutation = useMutation({
    mutationFn: async () => {
      if (!newTextVersionName.trim()) {
        throw new Error('Version name is required');
      }
      if (!selectedTextBibleVersionId) {
        throw new Error('Bible version is required');
      }
      if (!project?.target_language_entity_id) {
        throw new Error('Project target language is required');
      }

      return await versionsApi.createTextVersion({
        name: newTextVersionName.trim(),
        project_id: projectId,
        language_entity_id: project.target_language_entity_id,
        bible_version_id: selectedTextBibleVersionId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setNewTextVersionName('');
      setSelectedTextBibleVersionId('');
      setShowCreateTextVersion(false);
    },
  });

  // Create audio version mutation
  const createAudioVersionMutation = useMutation({
    mutationFn: async () => {
      if (!newAudioVersionName.trim()) {
        throw new Error('Version name is required');
      }
      if (!selectedAudioBibleVersionId) {
        throw new Error('Bible version is required');
      }
      if (!project?.target_language_entity_id) {
        throw new Error('Project target language is required');
      }

      return await versionsApi.createAudioVersion({
        name: newAudioVersionName.trim(),
        project_id: projectId,
        language_entity_id: project.target_language_entity_id,
        bible_version_id: selectedAudioBibleVersionId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setNewAudioVersionName('');
      setSelectedAudioBibleVersionId('');
      setShowCreateAudioVersion(false);
    },
  });

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
        }`}>
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
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'>
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
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
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
                        className='text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline'>
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
                        className='text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline'>
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
                        className='w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm text-neutral-500 dark:text-neutral-400 italic border-b border-neutral-200 dark:border-neutral-800'>
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
                      className='text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline'>
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

          {/* Location */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Location
              </h3>
            </div>
            <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              {editingInfo ? (
                <LocationPicker
                  location={location}
                  onLocationChange={setLocation}
                  height='400px'
                />
              ) : (
                <div>
                  {project.location ? (
                    <div className='space-y-2'>
                      <div className='text-sm text-neutral-900 dark:text-neutral-100'>
                        <span className='font-medium'>Latitude:</span>{' '}
                        {project.location.lat.toFixed(6)}
                      </div>
                      <div className='text-sm text-neutral-900 dark:text-neutral-100'>
                        <span className='font-medium'>Longitude:</span>{' '}
                        {project.location.lng.toFixed(6)}
                      </div>
                    </div>
                  ) : (
                    <p className='text-sm text-neutral-500 dark:text-neutral-400'>
                      No location set
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
                    }>
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
                      )}`}>
                      {project.project_status}
                    </span>
                  </>
                )}
              </div>
              <div>
                {editingInfo ? (
                  <Select
                    label='Publish Status'
                    value={publishStatus}
                    onValueChange={value =>
                      setPublishStatus(value as PublishStatus)
                    }>
                    <SelectItem value='pending'>Pending</SelectItem>
                    <SelectItem value='published'>Published</SelectItem>
                    <SelectItem value='archived'>Archived</SelectItem>
                  </Select>
                ) : (
                  <>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Publish Status
                    </label>
                    <span className='inline-block px-2 py-1 rounded text-xs font-medium bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300 capitalize'>
                      {project.publish_status || 'pending'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Text Versions */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Text Versions
              </h3>
              {!showCreateTextVersion && (
                <button
                  onClick={() => {
                    setShowCreateTextVersion(true);
                    setSelectedTextBibleVersionId(bibleVersions?.[0]?.id || '');
                  }}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
                  <Plus className='h-4 w-4' />
                  Create
                </button>
              )}
            </div>
            <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg space-y-4'>
              {showCreateTextVersion ? (
                <div className='space-y-3 p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700'>
                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Name <span className='text-red-500'>*</span>
                    </label>
                    <input
                      type='text'
                      value={newTextVersionName}
                      onChange={e => setNewTextVersionName(e.target.value)}
                      placeholder='Enter version name (e.g., NIV, NLT, ESV)'
                      className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      autoFocus
                    />
                  </div>
                  <div>
                    <Select
                      label='Bible Version'
                      placeholder={
                        bibleVersions && bibleVersions.length > 0
                          ? 'Select bible version...'
                          : 'Loading bible versions...'
                      }
                      value={selectedTextBibleVersionId}
                      onValueChange={setSelectedTextBibleVersionId}
                      disabled={!bibleVersions || bibleVersions.length === 0}>
                      {(bibleVersions || []).map(bv => (
                        <SelectItem key={bv.id} value={bv.id}>
                          {bv.name}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                  {createTextVersionMutation.isError && (
                    <div className='text-sm text-red-600 dark:text-red-400'>
                      {createTextVersionMutation.error instanceof Error
                        ? createTextVersionMutation.error.message
                        : 'Failed to create text version'}
                    </div>
                  )}
                  <div className='flex gap-2 justify-end'>
                    <button
                      type='button'
                      onClick={() => {
                        setShowCreateTextVersion(false);
                        setNewTextVersionName('');
                        setSelectedTextBibleVersionId('');
                      }}
                      className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
                      Cancel
                    </button>
                    <button
                      type='button'
                      onClick={() => createTextVersionMutation.mutate()}
                      disabled={
                        !newTextVersionName.trim() ||
                        !selectedTextBibleVersionId ||
                        createTextVersionMutation.isPending
                      }
                      className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                      {createTextVersionMutation.isPending
                        ? 'Creating...'
                        : 'Create'}
                    </button>
                  </div>
                </div>
              ) : null}
              {project.textVersions && project.textVersions.length > 0 ? (
                project.textVersions.map(version => (
                  <div
                    key={version.id}
                    className='cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700/50 p-3 rounded-lg transition-colors'
                    onClick={() => {
                      if (onOpenTextVersion) {
                        onOpenTextVersion(version.id);
                      }
                    }}>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                        {version.name}
                      </span>
                      {version.progress && (
                        <span className='text-xs text-neutral-500 dark:text-neutral-400'>
                          {version.progress.complete_chapters}/
                          {version.progress.total_chapters} (
                          {version.progress.progress_percentage}%)
                        </span>
                      )}
                    </div>
                    {version.progress && (
                      <div className='w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden'>
                        <div
                          className='h-full bg-primary-600 dark:bg-primary-500 transition-all'
                          style={{
                            width: `${Math.min(version.progress.progress_percentage, 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : !showCreateTextVersion ? (
                <p className='text-sm text-neutral-500 dark:text-neutral-400'>
                  No text versions found
                </p>
              ) : null}
            </div>
          </section>

          {/* Audio Versions */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Audio Versions
              </h3>
              {!showCreateAudioVersion && (
                <button
                  onClick={() => {
                    setShowCreateAudioVersion(true);
                    setSelectedAudioBibleVersionId(
                      bibleVersions?.[0]?.id || ''
                    );
                  }}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
                  <Plus className='h-4 w-4' />
                  Create
                </button>
              )}
            </div>
            <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg space-y-4'>
              {showCreateAudioVersion ? (
                <div className='space-y-3 p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700'>
                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Name <span className='text-red-500'>*</span>
                    </label>
                    <input
                      type='text'
                      value={newAudioVersionName}
                      onChange={e => setNewAudioVersionName(e.target.value)}
                      placeholder='Enter version name (e.g., OMT, NIV, NLT)'
                      className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      autoFocus
                    />
                  </div>
                  <div>
                    <Select
                      label='Bible Version'
                      placeholder={
                        bibleVersions && bibleVersions.length > 0
                          ? 'Select bible version...'
                          : 'Loading bible versions...'
                      }
                      value={selectedAudioBibleVersionId}
                      onValueChange={setSelectedAudioBibleVersionId}
                      disabled={!bibleVersions || bibleVersions.length === 0}>
                      {(bibleVersions || []).map(bv => (
                        <SelectItem key={bv.id} value={bv.id}>
                          {bv.name}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                  {createAudioVersionMutation.isError && (
                    <div className='text-sm text-red-600 dark:text-red-400'>
                      {createAudioVersionMutation.error instanceof Error
                        ? createAudioVersionMutation.error.message
                        : 'Failed to create audio version'}
                    </div>
                  )}
                  <div className='flex gap-2 justify-end'>
                    <button
                      type='button'
                      onClick={() => {
                        setShowCreateAudioVersion(false);
                        setNewAudioVersionName('');
                        setSelectedAudioBibleVersionId('');
                      }}
                      className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
                      Cancel
                    </button>
                    <button
                      type='button'
                      onClick={() => createAudioVersionMutation.mutate()}
                      disabled={
                        !newAudioVersionName.trim() ||
                        !selectedAudioBibleVersionId ||
                        createAudioVersionMutation.isPending
                      }
                      className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                      {createAudioVersionMutation.isPending
                        ? 'Creating...'
                        : 'Create'}
                    </button>
                  </div>
                </div>
              ) : null}
              {project.audioVersions && project.audioVersions.length > 0 ? (
                project.audioVersions.map(version => (
                  <div
                    key={version.id}
                    className='cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700/50 p-3 rounded-lg transition-colors'
                    onClick={() => {
                      if (onOpenAudioVersion) {
                        onOpenAudioVersion(version.id);
                      }
                    }}>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                        {version.name}
                      </span>
                      {version.progress && (
                        <span className='text-xs text-neutral-500 dark:text-neutral-400'>
                          {version.progress.chapters_with_audio}/
                          {version.progress.total_chapters} (
                          {version.progress.progress_percentage}%)
                        </span>
                      )}
                    </div>
                    {version.progress && (
                      <div className='w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden'>
                        <div
                          className='h-full bg-primary-600 dark:bg-primary-500 transition-all'
                          style={{
                            width: `${Math.min(version.progress.progress_percentage, 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : !showCreateAudioVersion ? (
                <p className='text-sm text-neutral-500 dark:text-neutral-400'>
                  No audio versions found
                </p>
              ) : null}
            </div>
          </section>

          {/* User Assignments */}
          <section>
            <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
              User Assignments
            </h3>
            <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              <EntityUserAssignments
                entityId={projectId}
                resourceType='project'
                assignments={projectUsers || []}
                onUpdate={() => {
                  refetchProjectUsers();
                }}
                onAssign={async (userId, roleId) => {
                  await assignUserMutation.mutateAsync({ userId, roleId });
                }}
                onRemove={async assignmentId => {
                  await removeUserMutation.mutateAsync(assignmentId);
                }}
              />
            </div>
          </section>

          {/* Bases */}
          <section>
            <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
              Bases
            </h3>
            <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              <EntityBaseAssignments
                assignments={projectBases || []}
                onUpdate={() => {
                  refetchProjectBases();
                }}
                onAssign={async baseId => {
                  await assignBaseMutation.mutateAsync(baseId);
                }}
                onRemove={async assignmentId => {
                  await removeBaseMutation.mutateAsync(assignmentId);
                }}
                onBaseClick={() => {
                  // Could open base modal here if needed
                }}
              />
            </div>
          </section>

          {/* Partner Organizations */}
          <section>
            <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
              Partner Organizations
            </h3>
            <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              <EntityPartnerOrgAssignments
                assignments={projectPartnerOrgs || []}
                onUpdate={() => {
                  refetchProjectPartnerOrgs();
                }}
                onAssign={async partnerOrgId => {
                  await assignPartnerOrgMutation.mutateAsync(partnerOrgId);
                }}
                onRemove={async assignmentId => {
                  await removePartnerOrgMutation.mutateAsync(assignmentId);
                }}
                onPartnerOrgClick={() => {
                  // Could open partner org modal here if needed
                }}
              />
            </div>
          </section>

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

        {/* Footer with Save/Cancel buttons */}
        {editingInfo && (
          <div className='border-t border-neutral-200 dark:border-neutral-800 px-6 py-4 bg-white dark:bg-neutral-900'>
            <div className='flex gap-2 justify-end'>
              <button
                onClick={() => {
                  setEditingInfo(false);
                  setName(project.name);
                  setDescription(project.description || '');
                  setTargetLanguageId(project.target_language_entity_id);
                  setSourceLanguageId(project.source_language_entity_id);
                  setRegionId(project.region_id);
                  setLocation(project.location || null);
                  setProjectStatus(project.project_status);
                  setPublishStatus(project.publish_status || 'pending');
                }}
                className='px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateProjectMutation.isPending}
                className='px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'>
                <Save className='h-4 w-4' />
                {updateProjectMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
