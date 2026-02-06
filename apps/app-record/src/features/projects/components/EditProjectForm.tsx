import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useTranslation } from '@/shared/hooks';
import { useProject } from '../hooks';
import { useEditProjectForm } from '../hooks/useEditProjectForm';
import { ProjectFormFields } from './edit-project-form/project-form-fields';
import { LanguageSelectionField } from './edit-project-form/language-selection-field';
import { RegionSelectionField } from './edit-project-form/region-selection-field';
import { DeleteConfirmationModal } from './edit-project-form/delete-confirmation-modal';

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
 * Convert hex color to rgba string with opacity
 */
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

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

  const {
    formData,
    validationError,
    isFormValid,
    sourceLanguageName,
    targetLanguageName,
    regionName,
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
  } = useEditProjectForm(project);

  const handleClose = (): void => {
    onClose();
  };

  const handleDeletePress = (): void => {
    setShowDeleteConfirmation(true);
    setDeleteConfirmationText('');
  };

  const handleDeleteCancel = (): void => {
    setShowDeleteConfirmation(false);
    setDeleteConfirmationText('');
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!project) return;
    await handleDelete(project.id, onDeleteSuccess);
  };

  const displayError = updateError || validationError || deleteError;
  const errorMessage =
    displayError instanceof Error
      ? displayError.message
      : typeof displayError === 'string'
        ? displayError
        : displayError
          ? String(displayError)
          : null;

  const errorBackgroundColor = hexToRgba(theme.colors.error, 0.1);
  const deleteButtonStyle = [
    styles.deleteButton,
    {
      backgroundColor: theme.colors.error,
      opacity: isUpdating || isDeleting ? 0.5 : 1,
    },
  ];

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
        {/* Form Fields */}
        <ProjectFormFields
          name={formData.name}
          description={formData.description}
          onNameChange={value => handleFieldChange('name', value)}
          onDescriptionChange={value => handleFieldChange('description', value)}
          disabled={isUpdating}
        />

        {/* Source Language Selection */}
        <LanguageSelectionField
          label={t('projects.create.sourceLanguage') || 'Source Language'}
          selectedLanguageName={sourceLanguageName}
          onSelect={onSelectSourceLanguage}
          onView={onViewSourceLanguage}
          disabled={isUpdating}
        />

        {/* Target Language Selection */}
        <LanguageSelectionField
          label={t('projects.create.targetLanguage') || 'Target Language'}
          selectedLanguageName={targetLanguageName}
          onSelect={onSelectTargetLanguage}
          onView={onViewTargetLanguage}
          disabled={isUpdating}
        />

        {/* Region Selection */}
        <RegionSelectionField
          selectedRegionName={regionName}
          onSelect={onSelectRegion}
          onView={onViewRegion}
          disabled={isUpdating}
        />

        {/* Delete Project Button */}
        <View style={styles.deleteButtonContainer}>
          <TouchableOpacity
            style={deleteButtonStyle}
            onPress={handleDeletePress}
            disabled={isUpdating || isDeleting}
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
                isFormValid && !isUpdating
                  ? theme.colors.accent
                  : theme.colors.interactiveDisabled,
            },
          ]}
          onPress={() => handleSubmit(projectId, onClose)}
          disabled={!isFormValid || isUpdating || isDeleting}
          accessibilityLabel={t('projects.edit.saveButton')}>
          {isUpdating ? (
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
      <DeleteConfirmationModal
        visible={showDeleteConfirmation}
        projectName={project.name}
        confirmationText={deleteConfirmationText}
        onConfirmationTextChange={setDeleteConfirmationText}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        error={deleteError}
        isDeleteEnabled={deleteConfirmationText.trim() === project.name.trim()}
      />
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
  },
});
