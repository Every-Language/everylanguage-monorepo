import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { useTheme } from '@/shared/hooks';
import { Button, createThemedStyles } from '@everylanguage/shared-native-ui';
import { useTranslations } from '@/shared/hooks';
import { authService } from '../services/authService';
import { CodeValidationInput } from './CodeValidationInput';
import { logger } from '../../../shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

const themedStyles = createThemedStyles({
  container: theme => ({
    flex: 1,
    backgroundColor: theme.colors.modalBackground,
  }),
  scrollContainer: theme => ({
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  }),
  logoContainer: theme => ({
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  }),
  logo: theme => ({
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  }),
  logoIcon: theme => ({
    fontSize: 32,
    color: theme.colors.background,
  }),
  title: theme => ({
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  }),
  subtitle: theme => ({
    fontSize: theme.typography.fontSize.md,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  }),
  emailContainer: theme => ({
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  }),
  emailLabel: theme => ({
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  }),
  emailText: theme => ({
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  }),
  buttonContainer: theme => ({
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  }),
  linkButton: theme => ({
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  }),
  linkText: theme => ({
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  }),
  linkTextHighlight: theme => ({
    color: theme.colors.interactive,
    fontWeight: '600',
  }),
  backButton: theme => ({
    position: 'absolute',
    top: theme.spacing.lg,
    left: theme.spacing.lg,
    zIndex: 1,
    padding: theme.spacing.sm,
  }),
});

interface EmailCodeValidationProps {
  email: string;
  onVerificationComplete: () => void;
  onBack: () => void;
  onResendEmail?: () => void;
}

interface EmailCodeFormData {
  code: string;
}

const emailCodeValidationRules = {
  code: {
    required: 'Verification code is required',
    minLength: {
      value: 6,
      message: 'Please enter the complete 6-digit code',
    },
    pattern: {
      value: /^\d{6}$/,
      message: 'Please enter a valid 6-digit code',
    },
  },
};

export function EmailCodeValidation({
  email,
  onVerificationComplete,
  onBack,
  onResendEmail,
}: EmailCodeValidationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [, setIsResending] = useState(false);
  const { theme } = useTheme();
  const t = useTranslations();
  const styles = themedStyles(theme);

  const {
    control,
    handleSubmit,
    formState: { isValid },
    watch,
  } = useForm<EmailCodeFormData>({
    defaultValues: {
      code: '',
    },
    mode: 'onChange',
  });

  watch('code');

  const onSubmit = async (data: EmailCodeFormData) => {
    try {
      setIsLoading(true);
      logger.info(ENABLE_LOGGING, 'EmailCodeValidation: Verifying email code');

      // Verify the email code with Supabase
      const { error } = await authService.verifyEmailCode(data.code, email);

      if (error) {
        Alert.alert(t('common.error'), error || t('auth.errors.invalidCode'));
        return;
      }

      logger.info(
        ENABLE_LOGGING,
        'EmailCodeValidation: Email verified successfully'
      );
      onVerificationComplete();
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'EmailCodeValidation: Verification error:',
        error
      );
      const message =
        error instanceof Error ? error.message : t('auth.errors.generic');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setIsResending(true);
      logger.info(ENABLE_LOGGING, 'EmailCodeValidation: Resending email code');

      if (onResendEmail) {
        await onResendEmail();
        logger.info(
          ENABLE_LOGGING,
          'EmailCodeValidation: Custom resend handler completed'
        );
      } else {
        // Default resend logic
        const result = await authService.resendEmailVerification(email);
        if (result.error) {
          logger.error(
            ENABLE_LOGGING,
            'EmailCodeValidation: Resend failed:',
            result.error
          );
          Alert.alert(
            t('common.error'),
            result.error || t('auth.errors.generic')
          );
          return;
        }
        logger.info(
          ENABLE_LOGGING,
          'EmailCodeValidation: Email verification code resent successfully to:',
          email
        );
      }

      Alert.alert(t('auth.codeSent'), t('auth.checkEmailForCode', { email }));
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'EmailCodeValidation: Resend error:', error);
      const message =
        error instanceof Error ? error.message : t('auth.errors.generic');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name='arrow-back' size={24} color={theme.colors.text} />
        </TouchableOpacity>

        {/* App Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name='mail-outline' style={styles.logoIcon} />
          </View>
          <Text style={styles.title}>
            {t('auth.verifyEmail', { defaultValue: 'Verify Your Email' })}
          </Text>
          <Text style={styles.subtitle}>
            {t('auth.emailVerificationMessage', {
              defaultValue:
                "We've sent a 6-digit verification code to your email address.",
            })}
          </Text>
        </View>

        {/* Email Display */}
        <View style={styles.emailContainer}>
          <Text style={styles.emailLabel}>
            {t('auth.codeSentTo', { defaultValue: 'Code sent to:' })}
          </Text>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        {/* Code Input */}
        <Controller
          name='code'
          control={control}
          rules={emailCodeValidationRules.code}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <CodeValidationInput
              value={value || ''}
              onChangeText={onChange}
              onResend={handleResendCode}
              {...(error?.message ? { error: error.message } : {})}
              placeholder={t('auth.enterCode', {
                defaultValue: 'Enter 6-digit code',
              })}
              label={t('auth.verificationCode', {
                defaultValue: 'Verification Code*',
              })}
              maxLength={6}
              autoFocus={true}
              disabled={isLoading}
              resendCooldown={60}
              showResendButton={true}
            />
          )}
        />

        {/* Verify Button */}
        <View style={styles.buttonContainer}>
          <Button
            title={t('auth.verifyEmail', { defaultValue: 'Verify Email' })}
            onPress={handleSubmit(onSubmit)}
            disabled={!isValid || isLoading}
            loading={isLoading}
            variant='primary'
            fullWidth
            icon='checkmark-circle-outline'
            iconPosition='left'
          />
        </View>

        {/* Back to Sign Up */}
        <TouchableOpacity style={styles.linkButton} onPress={onBack}>
          <Text style={styles.linkText}>
            {t('auth.wrongEmail', { defaultValue: 'Wrong email address?' })}{' '}
            <Text style={styles.linkTextHighlight}>
              {t('auth.goBack', { defaultValue: 'Go back' })}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
