import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { externalProjectsOverridesApi } from '../api/externalProjectsOverridesApi';
import { languagesApi } from '@/features/languages/api/languagesApi';
import type { ExternalProjectOverrideWithLanguage } from '../api/externalProjectsOverridesApi';
import { X, Save, Trash2, Search } from 'lucide-react';

interface ExternalProjectOverrideModalProps {
  entity?: ExternalProjectOverrideWithLanguage | null;
  onClose: () => void;
  onSave: () => void;
}

type FormData = {
  language_entity_id: string;
  project_name: string;
  partner_organization: string | null;
  is_active: boolean;
  is_audio: boolean;
  is_text: boolean;
  total_chapters: number;
  completed_chapters: number;
  start_date: string | null;
  completion_date: string | null;
  notes: string | null;
};

export function ExternalProjectOverrideModal({
  entity,
  onClose,
  onSave,
}: ExternalProjectOverrideModalProps) {
  const queryClient = useQueryClient();
  const [isClosing, setIsClosing] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const isEditMode = !!entity;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      language_entity_id: entity?.language_entity_id || '',
      project_name: entity?.project_name || '',
      partner_organization: entity?.partner_organization || null,
      is_active: entity?.is_active ?? true,
      is_audio: entity?.is_audio || false,
      is_text: entity?.is_text || false,
      total_chapters: entity?.total_chapters || 1,
      completed_chapters: entity?.completed_chapters || 0,
      start_date: entity?.start_date
        ? new Date(entity.start_date).toISOString().split('T')[0]
        : null,
      completion_date: entity?.completion_date
        ? new Date(entity.completion_date).toISOString().split('T')[0]
        : null,
      notes: entity?.notes || null,
    },
  });

  const selectedLanguageId = watch('language_entity_id');
  const totalChapters = watch('total_chapters');
  const startDate = watch('start_date');

  useEffect(() => {
    setIsEntering(false);
  }, []);

  // Fetch languages for searchable dropdown
  const { data: searchedLanguages } = useQuery({
    queryKey: ['language-search-modal', languageSearchQuery],
    queryFn: async () => {
      if (!languageSearchQuery || languageSearchQuery.length < 2) return [];
      const results = await languagesApi.fetchLanguageEntities({
        searchQuery: languageSearchQuery,
        page: 1,
        pageSize: 20,
      });
      return results.data;
    },
    enabled: languageSearchQuery.length >= 2,
  });

  // Fetch selected language details
  const { data: selectedLanguage } = useQuery({
    queryKey: ['language-entity', selectedLanguageId],
    queryFn: () => languagesApi.fetchLanguageEntityById(selectedLanguageId),
    enabled: !!selectedLanguageId,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return externalProjectsOverridesApi.createExternalProjectOverride({
        language_entity_id: data.language_entity_id,
        project_name: data.project_name,
        partner_organization: data.partner_organization || null,
        is_active: data.is_active,
        is_audio: data.is_audio,
        is_text: data.is_text,
        total_chapters: data.total_chapters,
        completed_chapters: data.completed_chapters,
        start_date: data.start_date || null,
        completion_date: data.completion_date || null,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['external-projects-overrides'],
      });
      handleClose();
      onSave();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!entity) return;
      await externalProjectsOverridesApi.updateExternalProjectOverride(
        entity.id,
        {
          language_entity_id: data.language_entity_id,
          project_name: data.project_name,
          partner_organization: data.partner_organization || null,
          is_active: data.is_active,
          is_audio: data.is_audio,
          is_text: data.is_text,
          total_chapters: data.total_chapters,
          completed_chapters: data.completed_chapters,
          start_date: data.start_date || null,
          completion_date: data.completion_date || null,
          notes: data.notes || null,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['external-projects-overrides'],
      });
      queryClient.invalidateQueries({
        queryKey: ['external-project-override', entity?.id],
      });
      handleClose();
      onSave();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!entity) return;
      await externalProjectsOverridesApi.deleteExternalProjectOverride(
        entity.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['external-projects-overrides'],
      });
      handleClose();
      onSave();
    },
  });

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const onSubmit = (data: FormData) => {
    // Validate completion date is after start date if both provided
    if (data.start_date && data.completion_date) {
      const start = new Date(data.start_date);
      const completion = new Date(data.completion_date);
      if (completion < start) {
        alert('Completion date must be after start date');
        return;
      }
    }

    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (
      window.confirm(
        'Are you sure you want to delete this external project override? This action cannot be undone.'
      )
    ) {
      deleteMutation.mutate();
    }
  };

  const handleLanguageSelect = (languageId: string) => {
    setValue('language_entity_id', languageId);
    setShowLanguageDropdown(false);
    setLanguageSearchQuery('');
  };

  return (
    <div className='fixed inset-0 z-50 overflow-hidden'>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ease-out ${
          isClosing ? 'opacity-0' : isEntering ? 'opacity-0' : 'opacity-50'
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`absolute inset-y-0 right-0 max-w-2xl w-full bg-white dark:bg-neutral-900 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          isClosing
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
              {isEditMode
                ? 'Edit External Project Override'
                : 'Create External Project Override'}
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              {isEditMode
                ? `Project: ${entity.project_name}`
                : 'Add a new external project override'}
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
        <form
          onSubmit={handleSubmit(onSubmit)}
          className='flex-1 overflow-y-auto p-6'
        >
          <div className='space-y-6'>
            {/* Language */}
            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                Language <span className='text-red-500'>*</span>
              </label>
              <div className='relative'>
                {selectedLanguage ? (
                  <div className='flex items-center justify-between px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800'>
                    <span className='text-neutral-900 dark:text-neutral-100'>
                      {selectedLanguage.name}
                    </span>
                    <button
                      type='button'
                      onClick={() => {
                        setValue('language_entity_id', '');
                        setShowLanguageDropdown(true);
                      }}
                      className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700'
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <div className='relative'>
                      <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400' />
                      <input
                        type='text'
                        placeholder='Search for a language...'
                        value={languageSearchQuery}
                        onChange={e => {
                          setLanguageSearchQuery(e.target.value);
                          setShowLanguageDropdown(true);
                        }}
                        onFocus={() => setShowLanguageDropdown(true)}
                        className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      />
                    </div>
                    {showLanguageDropdown &&
                      languageSearchQuery.length >= 2 && (
                        <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                          {searchedLanguages && searchedLanguages.length > 0 ? (
                            searchedLanguages.map(language => (
                              <button
                                key={language.id}
                                type='button'
                                onClick={() =>
                                  handleLanguageSelect(language.id)
                                }
                                className='w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100'
                              >
                                {language.name}{' '}
                                <span className='text-neutral-500 dark:text-neutral-400'>
                                  ({language.level})
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className='px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                              No languages found
                            </div>
                          )}
                        </div>
                      )}
                  </>
                )}
                <input
                  type='hidden'
                  {...register('language_entity_id', {
                    required: 'Language is required',
                  })}
                />
                {errors.language_entity_id && (
                  <p className='mt-1 text-sm text-red-600 dark:text-red-400'>
                    {errors.language_entity_id.message}
                  </p>
                )}
              </div>
            </div>

            {/* Project Name */}
            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                Project Name <span className='text-red-500'>*</span>
              </label>
              <input
                type='text'
                {...register('project_name', {
                  required: 'Project name is required',
                })}
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
              />
              {errors.project_name && (
                <p className='mt-1 text-sm text-red-600 dark:text-red-400'>
                  {errors.project_name.message}
                </p>
              )}
            </div>

            {/* Partner Organization */}
            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                Partner Organization
              </label>
              <input
                type='text'
                {...register('partner_organization')}
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
              />
            </div>

            {/* Checkboxes */}
            <div className='space-y-2'>
              <label className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  {...register('is_active')}
                  className='w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500'
                />
                <span className='text-sm text-neutral-700 dark:text-neutral-300'>
                  Is Active
                </span>
              </label>
              <label className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  {...register('is_audio')}
                  className='w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500'
                />
                <span className='text-sm text-neutral-700 dark:text-neutral-300'>
                  Is Audio
                </span>
              </label>
              <label className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  {...register('is_text')}
                  className='w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500'
                />
                <span className='text-sm text-neutral-700 dark:text-neutral-300'>
                  Is Text
                </span>
              </label>
            </div>

            {/* Total Chapters */}
            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                Total Chapters <span className='text-red-500'>*</span>
              </label>
              <input
                type='number'
                min='1'
                {...register('total_chapters', {
                  required: 'Total chapters is required',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Must be at least 1' },
                })}
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
              />
              {errors.total_chapters && (
                <p className='mt-1 text-sm text-red-600 dark:text-red-400'>
                  {errors.total_chapters.message}
                </p>
              )}
            </div>

            {/* Completed Chapters */}
            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                Completed Chapters <span className='text-red-500'>*</span>
              </label>
              <input
                type='number'
                min='0'
                max={totalChapters}
                {...register('completed_chapters', {
                  required: 'Completed chapters is required',
                  valueAsNumber: true,
                  min: { value: 0, message: 'Must be 0 or greater' },
                  validate: value =>
                    value <= totalChapters || 'Cannot exceed total chapters',
                })}
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
              />
              {errors.completed_chapters && (
                <p className='mt-1 text-sm text-red-600 dark:text-red-400'>
                  {errors.completed_chapters.message}
                </p>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                Start Date
              </label>
              <input
                type='date'
                {...register('start_date')}
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
              />
            </div>

            {/* Completion Date */}
            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                Completion Date
              </label>
              <input
                type='date'
                min={startDate || undefined}
                {...register('completion_date', {
                  validate: value => {
                    if (!value || !startDate) return true;
                    return (
                      new Date(value) >= new Date(startDate) ||
                      'Completion date must be after start date'
                    );
                  },
                })}
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
              />
              {errors.completion_date && (
                <p className='mt-1 text-sm text-red-600 dark:text-red-400'>
                  {errors.completion_date.message}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                Notes
              </label>
              <textarea
                rows={4}
                {...register('notes')}
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
              />
            </div>
          </div>

          {/* Footer */}
          <div className='mt-6 flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800'>
            {isEditMode && (
              <button
                type='button'
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className='px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 flex items-center gap-2'
              >
                <Trash2 className='h-4 w-4' />
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <div className='flex gap-2 ml-auto'>
              <button
                type='button'
                onClick={handleClose}
                className='px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={
                  isSubmitting ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                className='px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2'
              >
                <Save className='h-4 w-4' />
                {isSubmitting ||
                createMutation.isPending ||
                updateMutation.isPending
                  ? 'Saving...'
                  : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
