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
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MenuView, MenuAction } from '@react-native-menu/menu';
import { useTheme, useTranslation } from '@/shared/hooks';
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
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

export interface EditProjectFormProps {
  projectId: string;
  onClose: () => void;
  onDeleteSuccess: () => void;
  onSelectSourceLanguage: () => void;
  onViewSourceLanguage: () => void;
  onSelectTargetLanguage: () => void;
  onViewTargetLanguage: () => void;
  onSelectRegion: () => void;
  onViewRegion: () => void;
}

/**
 * Edit Project Form Component
 *
 * Form component for editing an existing project with all required and optional fields.
 * Follows iOS design patterns with proper safe area handling.
 */
export const EditProjectForm: React.FC<EditProjectFormProps> = ({
  projectId,
  onClose,
  onDeleteSuccess,
  onSelectSourceLanguage,
  onViewSourceLanguage,
  onSelectTargetLanguage,
  onViewTargetLanguage,
  onSelectRegion,
  onViewRegion,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { project } = useProject(projectId);
  const { updateProject, isLoading, error } = useUpdateProject();
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
        source_language_entity_id: null, // IDs not available from query, will be set when user selects
        source_language_name: project.source_language_name || null,
        target_language_entity_id: null, // IDs not available from query, will be set when user selects
        target_language_name: project.target_language_name || null,
        region_id: null, // IDs not available from query, will be set when user selects
        region_name: project.region_name || null,
      });
      setValidationError(null);
      // Pre-populate store with existing values
      // Note: IDs will be set when user selects languages/regions
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

  const handleSubmit = useCallback(async (): Promise<void> => {
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
  }, [
    formData,
    source_language_id,
    source_language_name,
    target_language_id,
    target_language_name,
    region_id,
    region_name,
    projectId,
    updateProject,
    validateForm,
    onClose,
    t,
  ]);

  const handleClose = useCallback((): void => {
    // Reset form and store on close
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
    onClose();
  }, [onClose, resetStore]);

  const handleDeletePress = useCallback((): void => {
    setShowDeleteConfirmation(true);
    setDeleteConfirmationText('');
  }, []);

  const handleDeleteCancel = useCallback((): void => {
    setShowDeleteConfirmation(false);
    setDeleteConfirmationText('');
  }, []);

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!project) return;

    try {
      await deleteProject(project.id);
      onDeleteSuccess();
    } catch {
      // Error is handled by the hook's error state
      // The delete confirmation modal will stay open so user can try again
    }
  }, [project, deleteProject, onDeleteSuccess]);

  const isDeleteEnabled = useMemo(() => {
    if (!project) return false;
    return deleteConfirmationText.trim() === project.name.trim();
  }, [deleteConfirmationText, project]);

  const sourceLanguageActions: MenuAction[] = useMemo(
    () => [
      { id: 'view', title: 'View Language' },
      { id: 'change', title: 'Change Language' },
    ],
    []
  );

  const targetLanguageActions: MenuAction[] = useMemo(
    () => [
      { id: 'view', title: 'View Language' },
      { id: 'change', title: 'Change Language' },
    ],
    []
  );

  const regionActions: MenuAction[] = useMemo(
    () => [
      { id: 'view', title: 'View Region' },
      { id: 'change', title: 'Change Region' },
    ],
    []
  );

  const handleSourceLanguageMenuAction = useCallback(
    ({ nativeEvent }: { nativeEvent: { event: string } }) => {
      if (nativeEvent.event === 'view') {
        onViewSourceLanguage();
      } else if (nativeEvent.event === 'change') {
        onSelectSourceLanguage();
      }
    },
    [onViewSourceLanguage, onSelectSourceLanguage]
  );

  const handleTargetLanguageMenuAction = useCallback(
    ({ nativeEvent }: { nativeEvent: { event: string } }) => {
      if (nativeEvent.event === 'view') {
        onViewTargetLanguage();
      } else if (nativeEvent.event === 'change') {
        onSelectTargetLanguage();
      }
    },
    [onViewTargetLanguage, onSelectTargetLanguage]
  );

  const handleRegionMenuAction = useCallback(
    ({ nativeEvent }: { nativeEvent: { event: string } }) => {
      if (nativeEvent.event === 'view') {
        onViewRegion();
      } else if (nativeEvent.event === 'change') {
        onSelectRegion();
      }
    },
    [onViewRegion, onSelectRegion]
  );

  const displayError = error || validationError || deleteError;
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
        {...(Platform.OS === 'ios'
          ? { edges: ['bottom', 'left', 'right'] as const }
          : {})}
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
        {...(Platform.OS === 'ios'
          ? { edges: ['bottom', 'left', 'right'] as const }
          : {})}
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
      {...(Platform.OS === 'ios'
        ? { edges: ['bottom', 'left', 'right'] as const }
        : {})}
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
          {source_language_name ? (
            <MenuView
              actions={sourceLanguageActions}
              onPressAction={handleSourceLanguageMenuAction}>
              <TouchableOpacity
                style={[
                  styles.selectField,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  },
                ]}>
                <View style={styles.selectFieldContent}>
                  <Text
                    style={[
                      styles.selectFieldText,
                      { color: theme.colors.text },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode='tail'>
                    {source_language_name}
                  </Text>
                </View>
                <Ionicons
                  name='chevron-forward'
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </MenuView>
          ) : (
            <TouchableOpacity
              style={[
                styles.selectField,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              onPress={onSelectSourceLanguage}>
              <View style={styles.selectFieldContent}>
                <Text
                  style={[
                    styles.selectFieldText,
                    { color: theme.colors.text },
                  ]}>
                  {t('projects.create.selectSourceLanguage') ||
                    'Select Source Language'}
                </Text>
              </View>
              <Ionicons
                name='chevron-forward'
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Target Language Selection Field */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            {t('projects.create.targetLanguage') || 'Target Language'}
          </Text>
          {target_language_name ? (
            <MenuView
              actions={targetLanguageActions}
              onPressAction={handleTargetLanguageMenuAction}>
              <TouchableOpacity
                style={[
                  styles.selectField,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  },
                ]}>
                <View style={styles.selectFieldContent}>
                  <Text
                    style={[
                      styles.selectFieldText,
                      { color: theme.colors.text },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode='tail'>
                    {target_language_name}
                  </Text>
                </View>
                <Ionicons
                  name='chevron-forward'
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </MenuView>
          ) : (
            <TouchableOpacity
              style={[
                styles.selectField,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              onPress={onSelectTargetLanguage}>
              <View style={styles.selectFieldContent}>
                <Text
                  style={[
                    styles.selectFieldText,
                    { color: theme.colors.text },
                  ]}>
                  {t('projects.create.selectTargetLanguage') ||
                    'Select Target Language'}
                </Text>
              </View>
              <Ionicons
                name='chevron-forward'
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Region Selection Field */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            {t('projects.create.region') || 'Region'}
          </Text>
          {region_name ? (
            <MenuView
              actions={regionActions}
              onPressAction={handleRegionMenuAction}>
              <TouchableOpacity
                style={[
                  styles.selectField,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  },
                ]}>
                <View style={styles.selectFieldContent}>
                  <Text
                    style={[
                      styles.selectFieldText,
                      { color: theme.colors.text },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode='tail'>
                    {region_name}
                  </Text>
                </View>
                <Ionicons
                  name='chevron-forward'
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </MenuView>
          ) : (
            <TouchableOpacity
              style={[
                styles.selectField,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              onPress={onSelectRegion}>
              <View style={styles.selectFieldContent}>
                <Text
                  style={[
                    styles.selectFieldText,
                    { color: theme.colors.text },
                  ]}>
                  {t('projects.create.selectRegion') || 'Select Region'}
                </Text>
              </View>
              <Ionicons
                name='chevron-forward'
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Delete Project Button */}
        <View style={styles.deleteButtonContainer}>
          <TouchableOpacity
            style={[
              styles.deleteButton,
              {
                backgroundColor: theme.colors.error,
                opacity: isLoading || isDeleting ? 0.5 : 1,
              },
            ]}
            onPress={handleDeletePress}
            disabled={isLoading || isDeleting}
            accessibilityLabel={t('projects.edit.deleteButton')}>
            <Text
              style={[
                styles.deleteButtonText,
                { color: theme.colors.textInverse },
              ]}>
              {t('projects.edit.deleteButton')}
            </Text>
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
          disabled={!isFormValid || isLoading || isDeleting}
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

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirmation}
        transparent
        animationType='fade'
        onRequestClose={handleDeleteCancel}>
        <View style={styles.deleteModalOverlay}>
          <View
            style={[
              styles.deleteModalContent,
              { backgroundColor: theme.colors.background },
            ]}>
            <Text
              style={[styles.deleteModalTitle, { color: theme.colors.text }]}>
              {t('projects.edit.deleteConfirmation.title')}
            </Text>
            <Text
              style={[
                styles.deleteModalMessage,
                { color: theme.colors.textSecondary },
              ]}>
              {t('projects.edit.deleteConfirmation.message')}
            </Text>

            <View style={styles.deleteModalFieldContainer}>
              <Text
                style={[styles.deleteModalLabel, { color: theme.colors.text }]}>
                {t('projects.edit.deleteConfirmation.enterProjectName')}
              </Text>
              <TextInput
                style={[
                  styles.deleteModalInput,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                placeholder={project?.name}
                placeholderTextColor={theme.colors.textSecondary}
                value={deleteConfirmationText}
                onChangeText={setDeleteConfirmationText}
                autoCapitalize='words'
                autoComplete='off'
                editable={!isDeleting}
              />
            </View>

            {deleteError && (
              <View
                style={[
                  styles.deleteErrorContainer,
                  {
                    backgroundColor: errorBackgroundColor,
                  },
                ]}>
                <Text
                  style={[
                    styles.deleteErrorText,
                    { color: theme.colors.error },
                  ]}>
                  {deleteError instanceof Error
                    ? deleteError.message
                    : String(deleteError)}
                </Text>
              </View>
            )}

            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[
                  styles.deleteModalCancelButton,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                onPress={handleDeleteCancel}
                disabled={isDeleting}>
                <Text
                  style={[
                    styles.deleteModalCancelText,
                    { color: theme.colors.text },
                  ]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteModalDeleteButton,
                  {
                    backgroundColor: isDeleteEnabled
                      ? theme.colors.error
                      : theme.colors.interactiveDisabled,
                  },
                ]}
                onPress={handleDeleteConfirm}
                disabled={!isDeleteEnabled || isDeleting}>
                {isDeleting ? (
                  <ActivityIndicator color={theme.colors.textInverse} />
                ) : (
                  <Text
                    style={[
                      styles.deleteModalDeleteText,
                      {
                        color: isDeleteEnabled
                          ? theme.colors.textInverse
                          : theme.colors.textSecondary,
                      },
                    ]}>
                    {t('projects.edit.deleteConfirmation.deleteButton')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

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
  deleteButtonContainer: {
    marginBottom: 24,
  },
  deleteButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  deleteButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  deleteModalMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  deleteModalFieldContainer: {
    marginBottom: 24,
  },
  deleteModalLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  deleteModalInput: {
    fontSize: 17,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  deleteErrorContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  deleteErrorText: {
    fontSize: 14,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  deleteModalCancelText: {
    fontSize: 17,
    fontWeight: '600',
  },
  deleteModalDeleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  deleteModalDeleteText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
