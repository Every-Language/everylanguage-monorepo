import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useTranslation } from '@/shared/hooks';

export interface CreateProjectFormData {
  name: string;
  description: string;
}

interface CreateProjectModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectFormData) => void;
  isLoading?: boolean;
  error?: Error | null;
}

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
 * Create Project Modal
 *
 * Native modal for creating a new project with all required and optional fields.
 * Follows iOS design patterns with proper safe area handling.
 */
export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isLoading = false,
  error: externalError = null,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreateProjectFormData>({
    name: '',
    description: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setFormData({ name: '', description: '' });
      setValidationError(null);
    }
  }, [visible]);

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

  const handleSubmit = useCallback((): void => {
    if (!validateForm(formData)) {
      return;
    }

    // Trim and sanitize data before submission
    const sanitizedData: CreateProjectFormData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
    };

    onSubmit(sanitizedData);
  }, [formData, onSubmit, validateForm]);

  const handleClose = useCallback((): void => {
    // Reset form on close
    setFormData({
      name: '',
      description: '',
    });
    setValidationError(null);
    onClose();
  }, [onClose]);

  const displayError = externalError || validationError;
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
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={handleClose}>
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}>
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
            style={[
              styles.closeButton,
              { backgroundColor: theme.colors.error },
            ]}
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
    </Modal>
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
  errorContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    // backgroundColor applied inline using theme color
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
