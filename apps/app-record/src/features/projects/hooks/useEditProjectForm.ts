import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { Alert } from 'react-native';
import { useTranslation } from '@/shared/hooks';
import {
  useUpdateProject,
  type UpdateProjectFormData,
} from './useUpdateProject';
import { useDeleteProject } from './useDeleteProject';
import { useEditProjectStore } from '../store/editProjectStore';
import {
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from '../components/edit-project-form/project-form-fields';
import type { Project } from '../types/project';

export interface UseEditProjectFormReturn {
  // Form data
  formData: UpdateProjectFormData;
  setFormData: Dispatch<SetStateAction<UpdateProjectFormData>>;

  // Validation
  validationError: string | null;
  isFormValid: boolean;

  // Store values
  sourceLanguageId: string | null;
  sourceLanguageName: string | null;
  targetLanguageId: string | null;
  targetLanguageName: string | null;
  regionId: string | null;
  regionName: string | null;

  // Loading states
  isUpdating: boolean;
  isDeleting: boolean;

  // Errors
  updateError: Error | null;
  deleteError: Error | null;

  // Handlers
  handleFieldChange: <K extends keyof UpdateProjectFormData>(
    field: K,
    value: UpdateProjectFormData[K]
  ) => void;
  handleSubmit: (projectId: string, onClose: () => void) => Promise<void>;
  handleDelete: (
    projectId: string,
    onDeleteSuccess: () => void
  ) => Promise<void>;

  // Delete confirmation
  showDeleteConfirmation: boolean;
  deleteConfirmationText: string;
  setShowDeleteConfirmation: (show: boolean) => void;
  setDeleteConfirmationText: (text: string) => void;
  isDeleteEnabled: (projectName: string) => boolean;
}

/**
 * Hook for managing edit project form logic
 *
 * Handles form state, validation, and submission.
 */
export const useEditProjectForm = (
  project: Project | null
): UseEditProjectFormReturn => {
  const { t } = useTranslation();
  const {
    updateProject,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdateProject();
  const {
    deleteProject,
    isLoading: isDeleting,
    error: deleteError,
  } = useDeleteProject();

  const {
    source_language_id,
    source_language_name,
    target_language_id,
    target_language_name,
    region_id,
    region_name,
    setSourceLanguage,
    setTargetLanguage,
    setRegion,
    reset: resetStore,
  } = useEditProjectStore();

  const [formData, setFormData] = useState<UpdateProjectFormData>({
    name: '',
    description: '',
    source_language_entity_id: null,
    source_language_name: null,
    target_language_entity_id: null,
    target_language_name: null,
    region_id: null,
    region_name: null,
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Pre-fill form and store when project data is available
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        source_language_entity_id: null,
        source_language_name: project.source_language_name || null,
        target_language_entity_id: null,
        target_language_name: project.target_language_name || null,
        region_id: null,
        region_name: project.region_name || null,
      });
      setValidationError(null);

      // Pre-populate store with existing values
      if (project.source_language_name) {
        setSourceLanguage(null, project.source_language_name);
      }
      if (project.target_language_name) {
        setTargetLanguage(null, project.target_language_name);
      }
      if (project.region_name) {
        setRegion(null, project.region_name);
      }
    }
  }, [project, setSourceLanguage, setTargetLanguage, setRegion]);

  // Reset form and store when component unmounts
  useEffect(() => {
    return () => {
      setFormData({
        name: '',
        description: '',
        source_language_entity_id: null,
        source_language_name: null,
        target_language_entity_id: null,
        target_language_name: null,
        region_id: null,
        region_name: null,
      });
      setValidationError(null);
      setShowDeleteConfirmation(false);
      setDeleteConfirmationText('');
      resetStore();
    };
  }, [resetStore]);

  const handleFieldChange = useCallback(
    <K extends keyof UpdateProjectFormData>(
      field: K,
      value: UpdateProjectFormData[K]
    ): void => {
      setFormData(prev => {
        const updated = { ...prev, [field]: value };

        // Clear validation error when user starts typing
        if (validationError) {
          setValidationError(null);
        }

        return updated;
      });
    },
    [validationError]
  );

  const validateForm = useCallback(
    (data: UpdateProjectFormData): boolean => {
      const trimmedName = data.name.trim();

      if (trimmedName.length < MIN_NAME_LENGTH) {
        setValidationError(t('projects.create.nameRequired'));
        return false;
      }

      if (trimmedName.length > MAX_NAME_LENGTH) {
        setValidationError(
          t('projects.create.nameMaxLength', { max: MAX_NAME_LENGTH })
        );
        return false;
      }

      if (data.description.trim().length > MAX_DESCRIPTION_LENGTH) {
        setValidationError(
          t('projects.create.descriptionMaxLength', {
            max: MAX_DESCRIPTION_LENGTH,
          })
        );
        return false;
      }

      setValidationError(null);
      return true;
    },
    [t]
  );

  const handleSubmit = useCallback(
    async (projectId: string, onClose: () => void): Promise<void> => {
      if (!validateForm(formData)) {
        return;
      }

      try {
        // Trim and sanitize data before submission
        const sanitizedData: UpdateProjectFormData = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          source_language_entity_id: source_language_id,
          source_language_name: source_language_name,
          target_language_entity_id: target_language_id,
          target_language_name: target_language_name,
          region_id: region_id,
          region_name: region_name,
        };

        await updateProject(projectId, sanitizedData);
        onClose();
      } catch (err) {
        // Error is already logged in useUpdateProject hook
        Alert.alert(
          t('common.error'),
          err instanceof Error
            ? err.message
            : t('projects.edit.error') ||
                'Failed to update project. Please try again.'
        );
      }
    },
    [
      formData,
      source_language_id,
      source_language_name,
      target_language_id,
      target_language_name,
      region_id,
      region_name,
      updateProject,
      validateForm,
      t,
    ]
  );

  const handleDelete = useCallback(
    async (projectId: string, onDeleteSuccess: () => void): Promise<void> => {
      try {
        await deleteProject(projectId);
        onDeleteSuccess();
      } catch {
        // Error is handled by the hook's error state
        // The delete confirmation modal will stay open so user can try again
      }
    },
    [deleteProject]
  );

  const isFormValid = useMemo(
    () =>
      formData.name.trim().length >= MIN_NAME_LENGTH &&
      formData.name.trim().length <= MAX_NAME_LENGTH &&
      formData.description.trim().length <= MAX_DESCRIPTION_LENGTH,
    [formData]
  );

  const isDeleteEnabled = useCallback(
    (projectName: string): boolean => {
      return deleteConfirmationText.trim() === projectName.trim();
    },
    [deleteConfirmationText]
  );

  return {
    formData,
    setFormData,
    validationError,
    isFormValid,
    sourceLanguageId: source_language_id,
    sourceLanguageName: source_language_name,
    targetLanguageId: target_language_id,
    targetLanguageName: target_language_name,
    regionId: region_id,
    regionName: region_name,
    isUpdating,
    isDeleting,
    updateError,
    deleteError,
    handleFieldChange,
    handleSubmit,
    handleDelete,
    showDeleteConfirmation,
    deleteConfirmationText,
    setShowDeleteConfirmation,
    setDeleteConfirmationText,
    isDeleteEnabled,
  };
};
