import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { createThemedStyles } from '@/shared';
import { useTranslations } from '@/shared/hooks';

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
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
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
    marginLeft: theme.spacing.xs,
  }),
  resendContainer: theme => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  }),
  resendText: theme => ({
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs,
  }),
  resendButton: theme => ({
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  }),
  resendButtonText: theme => ({
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  }),
  resendButtonDisabled: theme => ({
    color: theme.colors.textSecondary,
  }),
  countdownText: theme => ({
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  }),
});

interface CodeValidationInputProps {
  value: string;
  onChangeText: (code: string) => void;
  onResend?: () => void;
  error?: string;
  placeholder?: string;
  label?: string;
  maxLength?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  resendCooldown?: number; // in seconds
  showResendButton?: boolean;
}

export function CodeValidationInput({
  value,
  onChangeText,
  onResend,
  error,
  placeholder = 'Enter verification code',
  label = 'Verification Code*',
  maxLength = 6,
  autoFocus = true,
  disabled = false,
  resendCooldown = 60,
  showResendButton = true,
}: CodeValidationInputProps) {
  const { theme } = useTheme();
  const t = useTranslations();
  const styles = themedStyles(theme);
  const inputRef = useRef<RNTextInput>(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const [resendTimer, setResendTimer] = React.useState(0);

  // Handle resend cooldown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [resendTimer]);

  const handleResend = () => {
    if (resendTimer === 0 && onResend) {
      onResend();
      setResendTimer(resendCooldown);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const formatCode = (text: string) => {
    // Remove any non-numeric characters and limit length
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, maxLength);
    return cleaned;
  };

  const handleTextChange = (text: string) => {
    const formattedCode = formatCode(text);
    onChangeText(formattedCode);
  };

  const displayError = error;
  const hasError = Boolean(displayError);
  const canResend = resendTimer === 0 && !disabled;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <RNTextInput
          ref={inputRef}
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
          keyboardType='number-pad'
          maxLength={maxLength}
          autoFocus={autoFocus}
          editable={!disabled}
          selectTextOnFocus
        />
        <Ionicons name='keypad-outline' style={styles.inputIcon} />
      </View>

      {displayError && <Text style={styles.errorText}>{displayError}</Text>}

      {showResendButton && onResend && (
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>
            {t('auth.didntReceiveCode', {
              defaultValue: "Didn't receive the code?",
            })}
          </Text>
          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={!canResend}>
            <Text
              style={[
                styles.resendButtonText,
                !canResend && styles.resendButtonDisabled,
              ]}>
              {t('auth.resendCode', { defaultValue: 'Resend' })}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {resendTimer > 0 && (
        <Text style={styles.countdownText}>
          {t('auth.resendIn', {
            defaultValue: 'Resend in {{seconds}}s',
            seconds: resendTimer,
          })}
        </Text>
      )}
    </View>
  );
}
