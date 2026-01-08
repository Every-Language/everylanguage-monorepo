import React, { useState } from 'react';
import { View, Text, TextInput as RNTextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { createThemedStyles } from '@/shared';

const themedStyles = createThemedStyles({
  container: theme => ({
    marginBottom: theme.spacing.lg,
  }),
  label: theme => ({
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  }),
  inputWrapper: _theme => ({
    position: 'relative',
  }),
  input: theme => ({
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingRight: 48, // Space for icon
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 56,
  }),
  inputFocused: theme => ({
    borderColor: theme.colors.primary,
    borderWidth: 2,
  }),
  inputError: theme => ({
    borderColor: theme.colors.error,
    borderWidth: 2,
  }),
  inputIcon: theme => ({
    position: 'absolute',
    right: 16,
    top: 16,
    fontSize: 20,
    color: theme.colors.textSecondary,
  }),
  errorText: theme => ({
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  }),
});

export interface TextInputProps {
  value: string;
  onChangeText: (text: string, isValid: boolean) => void;
  error?: string;
  placeholder?: string;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'numeric'
    | 'phone-pad'
    | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  autoComplete?:
    | 'username'
    | 'given-name'
    | 'family-name'
    | 'email'
    | 'password'
    | 'new-password'
    | 'current-password';
  maxLength?: number;
  required?: boolean;
  validator?: (text: string) => boolean;
}

export function TextInput({
  value,
  onChangeText,
  error,
  placeholder = 'Enter text',
  label = 'Text*',
  icon = 'text-outline',
  keyboardType = 'default',
  autoCapitalize = 'words',
  autoCorrect = true,
  autoComplete,
  maxLength,
  required = true,
  validator,
}: TextInputProps) {
  const { theme } = useTheme();
  const styles = themedStyles(theme);
  const [isFocused, setIsFocused] = useState(false);
  const [internalError, setInternalError] = useState('');

  const validateText = (text: string): boolean => {
    if (!text.trim()) {
      return !required; // Empty is valid if not required
    }

    if (validator) {
      return validator(text);
    }

    // Default validation - at least 2 characters for names
    if (
      label.toLowerCase().includes('name') ||
      label.toLowerCase().includes('username')
    ) {
      return text.trim().length >= 2;
    }

    return text.trim().length > 0;
  };

  const handleTextChange = (text: string) => {
    const isValid = validateText(text);
    setInternalError('');
    onChangeText(text, isValid);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (value && !validateText(value)) {
      if (
        label.toLowerCase().includes('name') ||
        label.toLowerCase().includes('username')
      ) {
        setInternalError('Must be at least 2 characters');
      } else {
        setInternalError('This field is required');
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setInternalError('');
  };

  const displayError = error || internalError;
  const hasError = Boolean(displayError);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <RNTextInput
          style={[
            styles.input,
            isFocused && styles.inputFocused,
            hasError && styles.inputError,
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          value={value}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          maxLength={maxLength}
        />
        <Ionicons name={icon} style={styles.inputIcon} />
      </View>
      {displayError && <Text style={styles.errorText}>{displayError}</Text>}
    </View>
  );
}
