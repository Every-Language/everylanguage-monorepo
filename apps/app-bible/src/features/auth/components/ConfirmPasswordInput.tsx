import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
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
  inputSuccess: theme => ({
    borderColor: theme.colors.success || '#10B981',
    borderWidth: 2,
  }),
  inputIcon: theme => ({
    position: 'absolute',
    right: 16,
    top: 16,
    fontSize: 20,
    color: theme.colors.textSecondary,
  }),
  passwordToggle: _theme => ({
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  }),
  errorText: theme => ({
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  }),
  successText: theme => ({
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.success || '#10B981',
    marginTop: theme.spacing.xs,
  }),
});

export interface ConfirmPasswordInputProps {
  value: string;
  onChangeText: (password: string, isValid: boolean) => void;
  originalPassword: string;
  error?: string;
  placeholder?: string;
  label?: string;
}

export function ConfirmPasswordInput({
  value,
  onChangeText,
  originalPassword,
  error,
  placeholder = 'Confirm your password',
  label = 'Confirm Password*',
}: ConfirmPasswordInputProps) {
  const { theme } = useTheme();
  const styles = themedStyles(theme);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [internalError, setInternalError] = useState('');

  const validateConfirmPassword = (confirmPassword: string): boolean => {
    if (!confirmPassword.trim()) {
      return false;
    }

    if (!originalPassword) {
      return false;
    }

    return confirmPassword === originalPassword;
  };

  const handleTextChange = (text: string) => {
    const isValid = validateConfirmPassword(text);
    setInternalError('');
    onChangeText(text, isValid);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (value && !validateConfirmPassword(value)) {
      if (!originalPassword) {
        setInternalError('Please enter your password first');
      } else {
        setInternalError('Passwords do not match');
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setInternalError('');
  };

  const displayError = error || internalError;
  const hasError = Boolean(displayError);
  const hasSuccess = value && validateConfirmPassword(value) && !hasError;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            isFocused && styles.inputFocused,
            hasError && styles.inputError,
            hasSuccess && styles.inputSuccess,
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          value={value}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={!showPassword}
          autoCapitalize='none'
          autoCorrect={false}
          autoComplete='password'
        />
        <TouchableOpacity
          style={styles.passwordToggle}
          onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            style={styles.inputIcon}
          />
        </TouchableOpacity>
      </View>

      {displayError && <Text style={styles.errorText}>{displayError}</Text>}
      {hasSuccess && (
        <Text style={styles.successText}>
          <Ionicons name='checkmark-circle' size={14} /> Passwords match
        </Text>
      )}
    </View>
  );
}
