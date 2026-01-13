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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MenuView, MenuAction } from '@react-native-menu/menu';
import { useTheme, useTranslation } from '@/shared/hooks';
import { useCreateProject } from '@/features/projects/hooks';
import type { CreateProjectFormData } from '@/features/projects/types/project';
import { useCreateProjectStore } from '@/features/projects/store/createProjectStore';

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
  const { createProject, isLoading, error } = useCreateProject();
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

  const handleSubmit = useCallback(async (): Promise<void> => {
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
  }, [
    formData,
    source_language_id,
    source_language_name,
    target_language_id,
    target_language_name,
    region_id,
    region_name,
    createProject,
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
    resetStore();
    onClose();
  }, [onClose, resetStore]);

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
          {t('projects.create.title')}
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
                isFormValid && !isLoading
                  ? theme.colors.accent
                  : theme.colors.interactiveDisabled,
            },
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid || isLoading}
          accessibilityLabel={t('projects.create.createButton')}>
          {isLoading ? (
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
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
