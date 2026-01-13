import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useTranslation } from '@/shared/hooks';
import {
  useProject,
  useUpdateProject,
  type UpdateProjectFormData,
} from '@/features/projects/hooks';
import { useEditProjectStore } from '@/features/projects/store/editProjectStore';

// Form validation constants
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 1000;

/**
 * Convert hex color to rgba string with opacity
 */
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Edit Project Form Screen
 *
 * Route screen for editing an existing project.
 * Follows iOS design patterns with proper safe area handling.
 * Uses Expo Router modal presentation for native navigation.
 */
export default function EditProjectFormScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = params.projectId || '';

  const { theme } = useTheme();
  const { t } = useTranslation();
  const { project } = useProject(projectId);
  const { updateProject, isLoading, error } = useUpdateProject();
  const {
    source_language_id,
    target_language_id,
    region_id,
    setSourceLanguageId,
    setTargetLanguageId,
    setRegionId,
    reset: resetStore,
  } = useEditProjectStore();
  const [formData, setFormData] = useState<UpdateProjectFormData>({
    name: '',
    description: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Pre-fill form and store when project data is available
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
      });
      setValidationError(null);
      // Pre-populate store with existing values (using names as placeholders until we have IDs)
      // TODO: Query Supabase to get actual IDs from language/region names
      if (project.source_language_name) {
        setSourceLanguageId(project.source_language_name);
      }
      if (project.target_language_name) {
        setTargetLanguageId(project.target_language_name);
      }
      if (project.region_name) {
        setRegionId(project.region_name);
      }
    }
  }, [project, setSourceLanguageId, setTargetLanguageId, setRegionId]);

  // Reset form and store when component unmounts
  useEffect(() => {
    return () => {
      setFormData({ name: '', description: '' });
      setValidationError(null);
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

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!validateForm(formData)) {
      return;
    }

    try {
      // Trim and sanitize data before submission
      const sanitizedData: UpdateProjectFormData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
      };

      await updateProject(projectId, sanitizedData);
      router.back();
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
  }, [formData, projectId, updateProject, validateForm, router, t]);

  const handleClose = useCallback((): void => {
    // Reset form and store on close
    setFormData({
      name: '',
      description: '',
    });
    setValidationError(null);
    resetStore();
    router.back();
  }, [router, resetStore]);

  const handleSelectSourceLanguage = useCallback((): void => {
    router.push(`/(tabs)/projects/${projectId}/edit/source-language`);
  }, [router, projectId]);

  const handleSelectTargetLanguage = useCallback((): void => {
    router.push(`/(tabs)/projects/${projectId}/edit/target-language`);
  }, [router, projectId]);

  const handleSelectRegion = useCallback((): void => {
    router.push(`/(tabs)/projects/${projectId}/edit/region`);
  }, [router, projectId]);

  const displayError = error || validationError;
  const isFormValid =
    formData.name.trim().length >= MIN_NAME_LENGTH &&
    formData.name.trim().length <= MAX_NAME_LENGTH &&
    formData.description.trim().length <= MAX_DESCRIPTION_LENGTH;

  // Convert error to displayable string
  const errorMessage = useMemo(() => {
    if (!displayError) return null;
    if (typeof displayError === 'string') return displayError;
    if (displayError instanceof Error) return displayError.message;
    return String(displayError);
  }, [displayError]);

  // Memoize error background color to avoid recalculation
  const errorBackgroundColor = useMemo(
    () => hexToRgba(theme.colors.error, 0.1),
    [theme.colors.error]
  );

  // Show loading state while project is being fetched
  if (!projectId) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {t('projects.edit.noProjectId') || 'Project ID is missing'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {t('projects.edit.projectNotFound') || 'Project not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: theme.colors.error }]}
          onPress={handleClose}
          accessibilityLabel={t('common.close')}>
          <Ionicons name='close' size={20} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('projects.edit.title')}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps='handled'>
        {/* Name Field */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            {t('projects.create.name')}{' '}
            <Text style={[styles.required, { color: theme.colors.error }]}>
              *
            </Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.text,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
            placeholder={t('projects.create.namePlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={formData.name}
            onChangeText={value => handleFieldChange('name', value)}
            autoCapitalize='words'
            autoComplete='off'
            maxLength={MAX_NAME_LENGTH}
            editable={!isLoading}
          />
        </View>

        {/* Description Field */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            {t('projects.create.description')}
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                color: theme.colors.text,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
            placeholder={t('projects.create.descriptionPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={formData.description}
            onChangeText={value => handleFieldChange('description', value)}
            multiline
            numberOfLines={4}
            textAlignVertical='top'
            autoCapitalize='sentences'
            maxLength={MAX_DESCRIPTION_LENGTH}
            editable={!isLoading}
          />
          <Text
            style={[
              styles.characterCount,
              { color: theme.colors.textSecondary },
            ]}>
            {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
          </Text>
        </View>

        {/* Source Language Selection Field */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            {t('projects.create.sourceLanguage') || 'Source Language'}
          </Text>
          <TouchableOpacity
            style={[
              styles.selectField,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
            onPress={handleSelectSourceLanguage}>
            <View style={styles.selectFieldContent}>
              <Text
                style={[styles.selectFieldText, { color: theme.colors.text }]}>
                {t('projects.create.selectSourceLanguage') ||
                  'Select Source Language'}
              </Text>
              {source_language_id && (
                <Text
                  style={[
                    styles.selectedValueText,
                    { color: theme.colors.textSecondary },
                  ]}>
                  {/* TODO: Display language name when data is available */}
                  {source_language_id}
                </Text>
              )}
            </View>
            <Ionicons
              name='chevron-forward'
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Target Language Selection Field */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            {t('projects.create.targetLanguage') || 'Target Language'}
          </Text>
          <TouchableOpacity
            style={[
              styles.selectField,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
            onPress={handleSelectTargetLanguage}>
            <View style={styles.selectFieldContent}>
              <Text
                style={[styles.selectFieldText, { color: theme.colors.text }]}>
                {t('projects.create.selectTargetLanguage') ||
                  'Select Target Language'}
              </Text>
              {target_language_id && (
                <Text
                  style={[
                    styles.selectedValueText,
                    { color: theme.colors.textSecondary },
                  ]}>
                  {/* TODO: Display language name when data is available */}
                  {target_language_id}
                </Text>
              )}
            </View>
            <Ionicons
              name='chevron-forward'
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Region Selection Field */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            {t('projects.create.region') || 'Region'}
          </Text>
          <TouchableOpacity
            style={[
              styles.selectField,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
            onPress={handleSelectRegion}>
            <View style={styles.selectFieldContent}>
              <Text
                style={[styles.selectFieldText, { color: theme.colors.text }]}>
                {t('projects.create.selectRegion') || 'Select Region'}
              </Text>
              {region_id && (
                <Text
                  style={[
                    styles.selectedValueText,
                    { color: theme.colors.textSecondary },
                  ]}>
                  {/* TODO: Display region name when data is available */}
                  {region_id}
                </Text>
              )}
            </View>
            <Ionicons
              name='chevron-forward'
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Error Display */}
        {errorMessage && (
          <View
            style={[
              styles.errorContainer,
              {
                backgroundColor: errorBackgroundColor,
              },
            ]}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {errorMessage}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer with Save Button */}
      <View
        style={[
          styles.footer,
          {
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor:
                isFormValid && !isLoading
                  ? theme.colors.accent
                  : theme.colors.interactiveDisabled,
            },
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid || isLoading}
          accessibilityLabel={t('projects.edit.saveButton')}>
          {isLoading ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text
              style={[
                styles.saveButtonText,
                {
                  color: isFormValid
                    ? theme.colors.textInverse
                    : theme.colors.textSecondary,
                },
              ]}>
              {t('projects.edit.saveButton')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    // Color will be set dynamically via theme
  },
  input: {
    fontSize: 17,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  textArea: {
    fontSize: 17,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  selectFieldContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectFieldText: {
    fontSize: 17,
  },
  selectedValueText: {
    fontSize: 15,
    marginRight: 8,
  },
  errorContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
