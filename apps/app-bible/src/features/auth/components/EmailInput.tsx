import React, { useState, useEffect } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { createThemedStyles } from '@everylanguage/shared-native-ui';

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

export interface EmailInputProps {
  value: string;
  onChangeText: (email: string, isValid: boolean) => void;
  error?: string;
  placeholder?: string;
  label?: string;
  initialEmail?: string;
  required?: boolean;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailInput({
  value,
  onChangeText,
  error,
  placeholder = 'Enter your email address',
  label = 'Email Address*',
  initialEmail,
  required = true,
}: EmailInputProps) {
  const { theme } = useTheme();
  const styles = themedStyles(theme);
  const [isFocused, setIsFocused] = useState(false);
  const [internalError, setInternalError] = useState('');

  // Set initial email if provided
  useEffect(() => {
    if (initialEmail && !value) {
      const isValid = EMAIL_REGEX.test(initialEmail);
      onChangeText(initialEmail, isValid);
    }
  }, [initialEmail, value, onChangeText]);

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) {
      return !required; // Empty is valid if not required
    }
    return EMAIL_REGEX.test(email);
  };

  const handleTextChange = (text: string) => {
    const isValid = validateEmail(text);
    setInternalError('');
    onChangeText(text, isValid);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (value && !validateEmail(value)) {
      setInternalError('Please enter a valid email address');
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
        <TextInput
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
          keyboardType='email-address'
          autoCapitalize='none'
          autoCorrect={false}
          autoComplete='email'
        />
        <Ionicons name='mail-outline' style={styles.inputIcon} />
      </View>
      {displayError && <Text style={styles.errorText}>{displayError}</Text>}
    </View>
  );
}
