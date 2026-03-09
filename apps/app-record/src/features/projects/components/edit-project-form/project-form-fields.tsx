import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme, useTranslation } from '@/shared/hooks';

// Form validation constants
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 1000;

export interface ProjectFormFieldsProps {
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Project Form Fields Component
 *
 * Renders name and description input fields for project forms.
 */
export const ProjectFormFields: React.FC<ProjectFormFieldsProps> = ({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <>
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
          value={name}
          onChangeText={onNameChange}
          autoCapitalize='words'
          autoComplete='off'
          maxLength={MAX_NAME_LENGTH}
          editable={!disabled}
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
          value={description}
          onChangeText={onDescriptionChange}
          multiline
          numberOfLines={4}
          textAlignVertical='top'
          autoCapitalize='sentences'
          maxLength={MAX_DESCRIPTION_LENGTH}
          editable={!disabled}
        />
        <Text
          style={[
            styles.characterCount,
            { color: theme.colors.textSecondary },
          ]}>
          {description.length}/{MAX_DESCRIPTION_LENGTH}
        </Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
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
});

export { MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH };
