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
import { useCreateProject } from './useCreateProject';
import { useCreateProjectStore } from '../store/createProjectStore';
import type { CreateProjectFormData } from '../types/project';
import {
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from '../components/edit-project-form/project-form-fields';

export interface UseCreateProjectFormReturn {
  // Form data
  formData: CreateProjectFormData;
  setFormData: Dispatch<SetStateAction<CreateProjectFormData>>;

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
  isCreating: boolean;

  // Errors
  createError: Error | null;

  // Handlers
  handleFieldChange: <K extends keyof CreateProjectFormData>(
    field: K,
    value: CreateProjectFormData[K]
  ) => void;
  handleSubmit: (onClose: () => void) => Promise<void>;
}

/**
 * Hook for managing create project form logic
 *
 * Handles form state, validation, and submission.
 */
export const useCreateProjectForm = (): UseCreateProjectFormReturn => {
  const { t } = useTranslation();
  const {
    createProject,
    isLoading: isCreating,
    error: createError,
  } = useCreateProject();

  const {
    source_language_id,
    source_language_name,
    target_language_id,
    target_language_name,
    region_id,
    region_name,
    reset: resetStore,
  } = useCreateProjectStore();

  const [formData, setFormData] = useState<CreateProjectFormData>({
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
      resetStore();
    };
  }, [resetStore]);

  const handleFieldChange = useCallback(
    <K extends keyof CreateProjectFormData>(
      field: K,
      value: CreateProjectFormData[K]
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
    (data: CreateProjectFormData): boolean => {
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
    async (onClose: () => void): Promise<void> => {
      if (!validateForm(formData)) {
        return;
      }

      try {
        // Trim and sanitize data before submission
        const sanitizedData: CreateProjectFormData = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          source_language_entity_id: source_language_id,
          source_language_name: source_language_name,
          target_language_entity_id: target_language_id,
          target_language_name: target_language_name,
          region_id: region_id,
          region_name: region_name,
        };

        await createProject(sanitizedData);
        onClose();
      } catch (err) {
        // Error is already logged in useCreateProject hook
        Alert.alert(
          t('common.error'),
          err instanceof Error
            ? err.message
            : t('projects.create.error') ||
                'Failed to create project. Please try again.'
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
      createProject,
      validateForm,
      t,
    ]
  );

  const isFormValid = useMemo(
    () =>
      formData.name.trim().length >= MIN_NAME_LENGTH &&
      formData.name.trim().length <= MAX_NAME_LENGTH &&
      formData.description.trim().length <= MAX_DESCRIPTION_LENGTH,
    [formData]
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
    isCreating,
    createError,
    handleFieldChange,
    handleSubmit,
  };
};
