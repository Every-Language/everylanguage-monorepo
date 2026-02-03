import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../../shared/design-system/components/Dialog';
import { Button } from '../../../../shared/design-system/components/Button';
import { Input } from '../../../../shared/design-system/components/Input';
import { LoadingSpinner } from '../../../../shared/design-system/components/LoadingSpinner';
import { FormLabel } from '../../../../shared/design-system/components/Form';
import {
  Select,
  SelectItem,
} from '../../../../shared/design-system/components/Select';
import {
  FuzzySearchSelector,
  type SearchResultItem,
} from '../../../../shared/components/FuzzySearchSelector';
import { LocationPicker } from '../../../../shared/components/LocationPicker/LocationPicker';
import { useUpdateProject } from '../../../../shared/hooks/query/project-mutations';
import { useToast } from '../../../../shared/design-system/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { locationToPostGIS } from '../../../../shared/utils/locationUtils';
import type { Project } from '../../../../shared/stores/types';
import type { ProjectMetadata } from '../../../../shared/hooks/query/dashboard';
import type { Database } from '@everylanguage/shared-types';

type ProjectStatus = Database['public']['Enums']['project_status'];
type PublishStatus = Database['public']['Enums']['publish_status'];

interface ProjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  projectMetadata?: ProjectMetadata;
}

export const ProjectEditModal: React.FC<ProjectEditModalProps> = ({
  isOpen,
  onClose,
  project,
  projectMetadata,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateProject = useUpdateProject();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sourceLanguage: null as SearchResultItem | null,
    targetLanguage: null as SearchResultItem | null,
    region: null as SearchResultItem | null,
    location: null as { lat: number; lng: number } | null,
    projectStatus: 'precreated' as ProjectStatus,
    publishStatus: 'pending' as PublishStatus,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when project or metadata changes
  useEffect(() => {
    if (project && projectMetadata && isOpen) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        sourceLanguage: projectMetadata.sourceLanguage
          ? {
              id: projectMetadata.sourceLanguage.id,
              name: projectMetadata.sourceLanguage.name,
            }
          : null,
        targetLanguage: projectMetadata.targetLanguage
          ? {
              id: projectMetadata.targetLanguage.id,
              name: projectMetadata.targetLanguage.name,
            }
          : null,
        region: projectMetadata.region
          ? {
              id: projectMetadata.region.id,
              name: projectMetadata.region.name,
            }
          : null,
        location: projectMetadata.location || null,
        projectStatus:
          (projectMetadata.projectStatus as ProjectStatus) || 'precreated',
        publishStatus:
          (projectMetadata.publishStatus as PublishStatus) || 'pending',
      });
      setErrors({});
    }
  }, [project, projectMetadata, isOpen]);

  // Form field handlers
  const handleFieldChange = useCallback(
    (
      field: string,
      value:
        | string
        | SearchResultItem
        | { lat: number; lng: number }
        | null
        | ProjectStatus
        | PublishStatus
    ) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    },
    [errors]
  );

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required';
    }

    if (!formData.sourceLanguage) {
      newErrors.sourceLanguage = 'Source language is required';
    }

    if (!formData.targetLanguage) {
      newErrors.targetLanguage = 'Target language is required';
    }

    if (formData.sourceLanguage?.id === formData.targetLanguage?.id) {
      newErrors.targetLanguage =
        'Target language must be different from source language';
    }

    if (!formData.region) {
      newErrors.region = 'Region is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Submit handler
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm() || !project) return;

      setIsSubmitting(true);

      try {
        // Convert location to PostGIS format
        const locationValue = formData.location
          ? locationToPostGIS(formData.location)
          : null;

        await updateProject.mutateAsync({
          id: project.id,
          updates: {
            name: formData.name.trim(),
            description: formData.description.trim(),
            source_language_entity_id: formData.sourceLanguage?.id || '',
            target_language_entity_id: formData.targetLanguage?.id || '',
            region_id: formData.region?.id || null,
            location: locationValue,
            project_status: formData.projectStatus,
            publish_status: formData.publishStatus,
          },
        });

        // Invalidate project queries to refresh data
        queryClient.invalidateQueries({
          queryKey: ['project-metadata', project.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['projects', project.id],
        });

        toast({
          title: 'Project Updated Successfully',
          description: `Project "${formData.name}" has been updated.`,
          variant: 'success',
        });

        onClose();
      } catch (error) {
        console.error('Error updating project:', error);

        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to update project. Please try again.';

        setErrors({ general: errorMessage });

        toast({
          title: 'Failed to Update Project',
          description: errorMessage,
          variant: 'error',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      formData,
      validateForm,
      project,
      updateProject,
      queryClient,
      toast,
      onClose,
    ]
  );

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    setErrors({});
    onClose();
  }, [isSubmitting, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='max-w-xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* General Error */}
          {errors.general && (
            <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg'>
              <p className='text-sm text-red-600 dark:text-red-400'>
                {errors.general}
              </p>
            </div>
          )}

          {/* Project Name */}
          <div className='space-y-2'>
            <FormLabel className='text-neutral-900 dark:text-neutral-100'>
              Project Name *
            </FormLabel>
            <Input
              value={formData.name}
              onChange={e => handleFieldChange('name', e.target.value)}
              placeholder='Enter project name'
              disabled={isSubmitting}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className='text-sm text-red-600'>{errors.name}</p>
            )}
          </div>

          {/* Project Description */}
          <div className='space-y-2'>
            <FormLabel className='text-neutral-900 dark:text-neutral-100'>
              Description *
            </FormLabel>
            <textarea
              value={formData.description}
              onChange={e => handleFieldChange('description', e.target.value)}
              placeholder='Enter project description'
              disabled={isSubmitting}
              rows={4}
              className={`flex w-full rounded-lg border transition-colors duration-200 px-3 py-2 ${
                errors.description
                  ? 'border-red-500'
                  : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
              } text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400 disabled:cursor-not-allowed disabled:opacity-50`}
            />
            {errors.description && (
              <p className='text-sm text-red-600'>{errors.description}</p>
            )}
          </div>

          {/* Source Language */}
          <FuzzySearchSelector
            label='Source Language'
            placeholder='Search for source language...'
            selectedItem={formData.sourceLanguage}
            onItemSelect={item => handleFieldChange('sourceLanguage', item)}
            onClear={() => handleFieldChange('sourceLanguage', null)}
            searchType='language'
            error={errors.sourceLanguage}
            disabled={isSubmitting}
          />

          {/* Target Language */}
          <FuzzySearchSelector
            label='Target Language'
            placeholder='Search for target language...'
            selectedItem={formData.targetLanguage}
            onItemSelect={item => handleFieldChange('targetLanguage', item)}
            onClear={() => handleFieldChange('targetLanguage', null)}
            searchType='language'
            error={errors.targetLanguage}
            disabled={isSubmitting}
          />

          {/* Region */}
          <FuzzySearchSelector
            label='Region'
            placeholder='Search for region...'
            selectedItem={formData.region}
            onItemSelect={item => handleFieldChange('region', item)}
            onClear={() => handleFieldChange('region', null)}
            searchType='region'
            error={errors.region}
            disabled={isSubmitting}
          />

          {/* Location */}
          <div className='space-y-2'>
            <FormLabel className='text-neutral-900 dark:text-neutral-100'>
              Location
            </FormLabel>
            <LocationPicker
              location={formData.location}
              onLocationChange={location =>
                handleFieldChange('location', location)
              }
              height='400px'
            />
          </div>

          {/* Project Status */}
          <div className='space-y-2'>
            <FormLabel className='text-neutral-900 dark:text-neutral-100'>
              Project Status
            </FormLabel>
            <Select
              value={formData.projectStatus}
              onValueChange={value =>
                handleFieldChange('projectStatus', value as ProjectStatus)
              }
              disabled={isSubmitting}>
              <SelectItem value='precreated'>Precreated</SelectItem>
              <SelectItem value='active'>Active</SelectItem>
              <SelectItem value='completed'>Completed</SelectItem>
              <SelectItem value='cancelled'>Cancelled</SelectItem>
            </Select>
          </div>

          {/* Publish Status */}
          <div className='space-y-2'>
            <FormLabel className='text-neutral-900 dark:text-neutral-100'>
              Publish Status
            </FormLabel>
            <Select
              value={formData.publishStatus}
              onValueChange={value =>
                handleFieldChange('publishStatus', value as PublishStatus)
              }
              disabled={isSubmitting}>
              <SelectItem value='pending'>Pending</SelectItem>
              <SelectItem value='published'>Published</SelectItem>
              <SelectItem value='archived'>Archived</SelectItem>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='ghost'
              onClick={handleClose}
              disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoadingSpinner className='mr-2 h-4 w-4' />
                  Updating...
                </>
              ) : (
                'Update Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
