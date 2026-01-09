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
  requirementsContainer: theme => ({
    marginTop: theme.spacing.sm,
  }),
  requirementsTitle: theme => ({
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  }),
  requirementItem: theme => ({
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  }),
  requirementText: theme => ({
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  }),
  requirementTextValid: theme => ({
    color: theme.colors.success || '#10B981',
  }),
  requirementTextInvalid: theme => ({
    color: theme.colors.error,
  }),
  requirementIcon: _theme => ({
    fontSize: 12,
  }),
});

export interface PasswordInputProps {
  value: string;
  onChangeText: (password: string, isValid: boolean) => void;
  error?: string;
  placeholder?: string;
  label?: string;
  showRequirements?: boolean;
  minLength?: number;
}

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export function PasswordInput({
  value,
  onChangeText,
  error,
  placeholder = 'Enter your password',
  label = 'Password*',
  showRequirements = true,
  minLength = 8,
}: PasswordInputProps) {
  const { theme } = useTheme();
  const styles = themedStyles(theme);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const validatePassword = (password: string): PasswordValidation => {
    return {
      minLength: password.length >= minLength,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password),
    };
  };

  const isPasswordValid = (validation: PasswordValidation): boolean => {
    return Object.values(validation).every(Boolean);
  };

  const handleTextChange = (text: string) => {
    const validation = validatePassword(text);
    const isValid = isPasswordValid(validation);
    onChangeText(text, isValid);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const validation = validatePassword(value);
  const displayError = error;
  const hasError = Boolean(displayError);

  const requirements = [
    {
      text: `At least ${minLength} characters`,
      isValid: validation.minLength,
      required: true,
    },
    {
      text: 'Uppercase letter (A-Z)',
      isValid: validation.hasUppercase,
      required: true,
    },
    {
      text: 'Lowercase letter (a-z)',
      isValid: validation.hasLowercase,
      required: true,
    },
    {
      text: 'Number (0-9)',
      isValid: validation.hasNumber,
      required: true,
    },
    {
      text: 'Special character (@$!%*?&)',
      isValid: validation.hasSpecialChar,
      required: true,
    },
  ];

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

      {showRequirements && value && !isPasswordValid(validation) && (
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Password Requirements:</Text>
          {requirements.map((requirement, index) => (
            <View key={index} style={styles.requirementItem}>
              <Ionicons
                name={requirement.isValid ? 'checkmark-circle' : 'close-circle'}
                style={[
                  styles.requirementIcon,
                  requirement.isValid
                    ? styles.requirementTextValid
                    : styles.requirementTextInvalid,
                ]}
              />
              <Text
                style={[
                  styles.requirementText,
                  requirement.isValid
                    ? styles.requirementTextValid
                    : styles.requirementTextInvalid,
                ]}>
                {requirement.text}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
