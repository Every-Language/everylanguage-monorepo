import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthContext } from '@/features/auth/hooks/useAuthFromStore';
import { logger } from '../../../shared/utils/logger';
import { useTheme } from '@/shared/hooks';
import { Button, createThemedStyles } from '@/shared';
import { useTranslations } from '@/shared/hooks';
import type { AuthStackNavigationProp } from '@/features/auth/navigation/AuthStackNavigator';
import { PhoneInputComponent as PhoneInput } from './PhoneInput';
import { EmailInput } from './EmailInput';
import { PasswordInput } from './PasswordInput';

// Logging configuration for this module
const ENABLE_LOGGING = true;

const themedStyles = createThemedStyles({
  container: theme => ({
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.modalBackground,
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
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  }),
  // Enhanced method selection container
  methodSelectorContainer: theme => ({
    marginBottom: theme.spacing.lg,
  }),
  methodSelectorTitle: theme => ({
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  }),
  methodsContainer: theme => ({
    flexDirection: 'row',
    gap: theme.spacing.sm,
  }),
  methodButton: theme => ({
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.xs,
  }),
  methodButtonActive: theme => ({
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  }),
  methodButtonText: theme => ({
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
  }),
  methodButtonTextActive: theme => ({
    color: theme.colors.primary,
  }),
  methodIcon: theme => ({
    fontSize: 18,
    color: theme.colors.textSecondary,
  }),
  methodIconActive: theme => ({
    color: theme.colors.primary,
  }),
  // Enhanced input styling inspired by the image
  inputContainer: theme => ({
    marginBottom: theme.spacing.lg,
  }),
  inputLabel: theme => ({
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
  // Forgot password section
  forgotPasswordContainer: theme => ({
    alignItems: 'flex-end',
    marginBottom: theme.spacing.lg,
  }),
  forgotPasswordButton: theme => ({
    paddingVertical: theme.spacing.xs,
  }),
  forgotPasswordText: theme => ({
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.interactive,
    fontWeight: '500',
  }),
  buttonContainer: theme => ({
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
});

interface SignInFormProps {
  onSwitchToSignUp: () => void;
  onForgotPassword?: (
    email?: string,
    phone?: string,
    method?: 'email' | 'phone'
  ) => void;
}

export function SignInForm({
  onSwitchToSignUp,
  onForgotPassword,
}: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [password, setPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [phone, setPhone] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone'); // default to phone
  const { signInWithFreshStart, signInWithPhone, isLoading } = useAuthContext();
  const { theme } = useTheme();
  const t = useTranslations();
  const styles = themedStyles(theme);
  const navigation = useNavigation<AuthStackNavigationProp>();

  const handlePhoneChange = (phoneNumber: string, isValid: boolean) => {
    setPhone(phoneNumber);
    setIsPhoneValid(isValid);
    setPhoneError(isValid ? '' : t('auth.enterValidPhoneNumber'));
  };

  const handleEmailChange = (emailValue: string, isValid: boolean) => {
    setEmail(emailValue);
    setIsEmailValid(isValid);
  };

  const handlePasswordChange = (passwordValue: string, isValid: boolean) => {
    setPassword(passwordValue);
    setIsPasswordValid(isValid);
  };

  const handleSubmit = async () => {
    try {
      if (authMethod === 'email') {
        if (!email || !isEmailValid || !password || !isPasswordValid) {
          Alert.alert(t('common.error'), t('auth.errors.fillAllFields'));
          return;
        }

        // Navigate to sync screen first, then start the sign-in process
        navigation.navigate('SignInSync');

        // Try to sign in using fresh start method
        try {
          await signInWithFreshStart(email, password);
          logger.info(
            ENABLE_LOGGING,
            'SignInForm: User successfully authenticated with fresh start'
          );
        } catch (error) {
          logger.error(ENABLE_LOGGING, 'Sign in error', error);
          const errorMessage =
            error instanceof Error ? error.message : t('auth.signInFailed');

          if (errorMessage === 'Email not confirmed') {
            logger.info(
              ENABLE_LOGGING,
              'SignInForm: Email not verified, navigating to code validation'
            );
            // Email not verified, navigate to code validation
            navigation.navigate('VerifyCode', {
              type: 'email',
              email: email,
              purpose: 'signup',
            });
            return;
          }

          // Other sign in error
          Alert.alert(t('common.error'), errorMessage);
        }
        return;
      }

      // Phone flows - only password authentication
      if (!isPhoneValid || !password || !isPasswordValid) {
        Alert.alert(t('common.error'), t('auth.enterValidPhoneAndPassword'));
        return;
      }

      // Try to sign in using auth store
      try {
        await signInWithPhone(phone, password);
        logger.info(
          ENABLE_LOGGING,
          'SignInForm: User successfully authenticated with phone'
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : t('auth.phoneSignInFailed');

        if (errorMessage === 'PHONE_NOT_VERIFIED') {
          logger.info(
            ENABLE_LOGGING,
            'SignInForm: Phone not verified, navigating to code validation'
          );
          // Phone not verified, navigate to code validation
          navigation.navigate('VerifyCode', {
            type: 'phone',
            phone: phone,
            purpose: 'phone_verification',
          });
          return;
        }

        // Other sign in error
        Alert.alert(t('common.error'), errorMessage);
      }
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Sign in error:', error);
      const message =
        error instanceof Error ? error.message : t('auth.errors.generic');
      Alert.alert(t('common.error'), message);
    }
  };

  const handleForgotPassword = () => {
    if (onForgotPassword) {
      onForgotPassword(email, phone, authMethod);
    }
  };

  return (
    <View style={styles.container}>
      {/* App Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Ionicons name='book-outline' style={styles.logoIcon} />
        </View>
        <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
        <Text style={styles.subtitle}>{t('auth.welcomeBackSubtitle')}</Text>
      </View>

      {/* Enhanced Method Selection */}
      <View style={styles.methodSelectorContainer}>
        <Text style={styles.methodSelectorTitle}>
          {t('auth.chooseSignInMethod')}
        </Text>
        <View style={styles.methodsContainer}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              authMethod === 'phone' && styles.methodButtonActive,
            ]}
            onPress={() => setAuthMethod('phone')}>
            <Ionicons
              name='call-outline'
              size={18}
              style={[
                styles.methodIcon,
                authMethod === 'phone' && styles.methodIconActive,
              ]}
            />
            <Text
              style={[
                styles.methodButtonText,
                authMethod === 'phone' && styles.methodButtonTextActive,
              ]}>
              {t('auth.phone')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.methodButton,
              authMethod === 'email' && styles.methodButtonActive,
            ]}
            onPress={() => setAuthMethod('email')}>
            <Ionicons
              name='mail-outline'
              size={18}
              style={[
                styles.methodIcon,
                authMethod === 'email' && styles.methodIconActive,
              ]}
            />
            <Text
              style={[
                styles.methodButtonText,
                authMethod === 'email' && styles.methodButtonTextActive,
              ]}>
              {t('auth.email')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {authMethod === 'phone' ? (
        <>
          <PhoneInput onChangeText={handlePhoneChange} error={phoneError} />
        </>
      ) : (
        <>
          <EmailInput
            value={email}
            onChangeText={handleEmailChange}
            placeholder={t('auth.emailPlaceholder')}
            label={t('auth.emailAddress') + '*'}
          />
        </>
      )}

      <PasswordInput
        value={password}
        onChangeText={handlePasswordChange}
        placeholder={t('auth.passwordPlaceholder')}
        label='Password*'
        showRequirements={false}
        minLength={8}
      />

      {/* Forgot password */}
      <View style={styles.forgotPasswordContainer}>
        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={handleForgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title={`${t('auth.signInButton')}`}
          onPress={handleSubmit}
          disabled={isLoading}
          loading={isLoading}
          variant='primary'
          fullWidth
          icon='log-in-outline'
          iconPosition='left'
        />
      </View>

      <TouchableOpacity style={styles.linkButton} onPress={onSwitchToSignUp}>
        <Text style={styles.linkText}>
          Don&apos;t have an account?{' '}
          <Text style={styles.linkTextHighlight}>Sign up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}
