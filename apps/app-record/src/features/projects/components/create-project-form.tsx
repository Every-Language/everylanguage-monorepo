import React, { useMemo } from 'react';
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
import { useCreateProjectForm } from '../hooks/useCreateProjectForm';
import { ProjectFormFields } from './edit-project-form/project-form-fields';
import { LanguageSelectionField } from './edit-project-form/language-selection-field';
import { RegionSelectionField } from './edit-project-form/region-selection-field';

export interface CreateProjectFormProps {
  onClose: () => void;
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
 * Create Project Form Component
 *
 * Form component for creating a new project with all required and optional fields.
 * Follows iOS design patterns with proper safe area handling.
 */
export const CreateProjectForm: React.FC<CreateProjectFormProps> = ({
  onClose,
  onSelectSourceLanguage,
  onViewSourceLanguage,
  onSelectTargetLanguage,
  onViewTargetLanguage,
  onSelectRegion,
  onViewRegion,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const {
    formData,
    validationError,
    isFormValid,
    sourceLanguageName,
    targetLanguageName,
    regionName,
    isCreating,
    createError,
    handleFieldChange,
    handleSubmit,
  } = useCreateProjectForm();

  const displayError = createError || validationError;
  const errorMessage = useMemo(() => {
    if (!displayError) return null;
    if (typeof displayError === 'string') return displayError;
    if (displayError instanceof Error) return displayError.message;
    return String(displayError);
  }, [displayError]);

  const errorBackgroundColor = useMemo(
    () => hexToRgba(theme.colors.error, 0.1),
    [theme.colors.error]
  );

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
          onPress={onClose}
          accessibilityLabel={t('common.close')}>
          <Ionicons name='close' size={20} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('projects.create.title')}
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
          disabled={isCreating}
        />

        {/* Source Language Selection */}
        <LanguageSelectionField
          label={t('projects.create.sourceLanguage') || 'Source Language'}
          selectedLanguageName={sourceLanguageName}
          onSelect={onSelectSourceLanguage}
          onView={onViewSourceLanguage}
          disabled={isCreating}
        />

        {/* Target Language Selection */}
        <LanguageSelectionField
          label={t('projects.create.targetLanguage') || 'Target Language'}
          selectedLanguageName={targetLanguageName}
          onSelect={onSelectTargetLanguage}
          onView={onViewTargetLanguage}
          disabled={isCreating}
        />

        {/* Region Selection */}
        <RegionSelectionField
          selectedRegionName={regionName}
          onSelect={onSelectRegion}
          onView={onViewRegion}
          disabled={isCreating}
        />

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

      {/* Footer with Create Button */}
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
            styles.createButton,
            {
              backgroundColor:
                isFormValid && !isCreating
                  ? theme.colors.accent
                  : theme.colors.interactiveDisabled,
            },
          ]}
          onPress={() => handleSubmit(onClose)}
          disabled={!isFormValid || isCreating}
          accessibilityLabel={t('projects.create.createButton')}>
          {isCreating ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text
              style={[
                styles.createButtonText,
                {
                  color: isFormValid
                    ? theme.colors.textInverse
                    : theme.colors.textSecondary,
                },
              ]}>
              {t('projects.create.createButton')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  createButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
