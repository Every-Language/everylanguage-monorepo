import React from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm } from 'react-hook-form';
import { useAuthContext } from '@/features/auth/hooks/useAuthFromStore';
import { logger } from '../../../shared/utils/logger';
import { useTheme } from '@/shared/hooks';
import { Button, createThemedStyles } from '@everylanguage/shared-native-ui';
import { useTranslations } from '@/shared/hooks';
import {
  ControlledTextInput,
  ControlledEmailInput,
  ControlledPasswordInput,
  ControlledConfirmPasswordInput,
  ControlledPhoneInput,
} from './';
import {
  SignUpFormData,
  signUpValidationRules,
  defaultSignUpFormValues,
} from '../types/signUpForm';

// Logging configuration for this module
const ENABLE_LOGGING = true;

const themedStyles = createThemedStyles({
  scrollView: theme => ({
    flex: 1,
    backgroundColor: theme.colors.modalBackground,
  }),
  container: theme => ({
    justifyContent: 'center',
    padding: theme.spacing.lg,
    minHeight: '100%',
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
  // Enhanced method selection container
  methodSelectorContainer: theme => ({
    marginBottom: theme.spacing.xl,
  }),
  methodSelectorTitle: theme => ({
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
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
  errorText: theme => ({
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  }),
});
// Baby#3qw
interface SignUpFormProps {
  onSwitchToSignIn: () => void;
  onNavigateToVerify?: (
    type: 'email' | 'phone',
    email?: string,
    phone?: string
  ) => void;
}

export function SignUpForm({
  onSwitchToSignIn,
  onNavigateToVerify,
}: SignUpFormProps) {
  const { signUp, signUpWithPhone, isLoading } = useAuthContext();
  const { theme } = useTheme();
  const t = useTranslations();
  const styles = themedStyles(theme);

  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
    setValue,
  } = useForm<SignUpFormData>({
    defaultValues: defaultSignUpFormValues,
    mode: 'onChange', // Validate on change for better UX
  });

  const authMethod = watch('authMethod');

  const onSubmit = async (data: SignUpFormData) => {
    try {
      logger.info(ENABLE_LOGGING, 'SignUpForm: Starting sign up process', {
        authMethod: data.authMethod,
      });

      if (data.authMethod === 'email') {
        if (!data.email) {
          Alert.alert(t('common.error'), t('auth.errors.fillAllFields'));
          return;
        }

        logger.info(ENABLE_LOGGING, 'SignUpForm: Calling signUp with email', {
          email: data.email,
        });

        // Sign up with email and create user account
        await signUp(data.email, data.password, {
          firstName: data.firstName,
          lastName: data.lastName,
        });

        logger.info(
          ENABLE_LOGGING,
          'SignUpForm: Sign up completed, navigating to verification'
        );

        // Navigate to email verification
        if (onNavigateToVerify) {
          onNavigateToVerify('email', data.email);
        } else {
          // Fallback to old behavior
          Alert.alert(
            t('auth.signUpSuccess', { defaultValue: 'Account Created!' }),
            t('auth.signUpSuccessMessage', {
              defaultValue:
                'Your account has been created. Please sign in to continue.',
            }),
            [
              {
                text: t('common.ok', { defaultValue: 'OK' }),
                onPress: () => onSwitchToSignIn(),
              },
            ]
          );
        }
        return;
      }

      // Phone flows - Create account with phone
      if (!data.phone) {
        Alert.alert(t('common.error'), 'Please enter a valid phone number');
        return;
      }

      // Create account with phone and navigate to phone validation
      await signUpWithPhone(data.phone, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
      });

      logger.info(
        ENABLE_LOGGING,
        'SignUpForm: Phone sign up completed, navigating to verification'
      );

      // Navigate to phone verification
      if (onNavigateToVerify) {
        onNavigateToVerify('phone', undefined, data.phone);
      } else {
        // Fallback to old behavior
        Alert.alert(
          t('auth.signUpSuccess', { defaultValue: 'Account Created!' }),
          t('auth.signUpSuccessMessage', {
            defaultValue:
              'Your account has been created. Please sign in to continue.',
          }),
          [
            {
              text: t('common.ok', { defaultValue: 'OK' }),
              onPress: () => onSwitchToSignIn(),
            },
          ]
        );
      }
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Sign up error:', error);
      let message =
        error instanceof Error ? error.message : t('auth.errors.generic');

      // Customize the weak password error message from Supabase
      if (
        message.includes('password is known to be weak') ||
        message.includes('WEAK_PASSWORD') ||
        message.includes('easy to guess')
      ) {
        message = t('auth.errors.weakPasswordSupabase');
      }

      Alert.alert(t('common.error'), message);
    }
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps='handled'
      showsVerticalScrollIndicator={false}>
      {/* App Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Ionicons name='book-outline' style={styles.logoIcon} />
        </View>
        <Text style={styles.title}>Create Your Account</Text>
        <Text style={styles.subtitle}>
          Join us to explore the Bible in your language and discover
          personalized spiritual content.
        </Text>
      </View>

      {/* Enhanced Method Selection */}
      <View style={styles.methodSelectorContainer}>
        <Text style={styles.methodSelectorTitle}>
          {t('auth.chooseSignUpMethod')}
        </Text>
        <View style={styles.methodsContainer}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              authMethod === 'phone' && styles.methodButtonActive,
            ]}
            onPress={() => setValue('authMethod', 'phone')}>
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
            onPress={() => setValue('authMethod', 'email')}>
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

      {/* User Information Fields */}
      <ControlledTextInput
        name='firstName'
        control={control}
        rules={signUpValidationRules.firstName}
        placeholder='Enter your first name'
        label='First Name*'
        icon='person-outline'
        autoCapitalize='words'
        autoCorrect={false}
        autoComplete='given-name'
      />

      <ControlledTextInput
        name='lastName'
        control={control}
        rules={signUpValidationRules.lastName}
        placeholder='Enter your last name'
        label='Last Name*'
        icon='person-outline'
        autoCapitalize='words'
        autoCorrect={false}
        autoComplete='family-name'
      />

      {authMethod === 'phone' ? (
        <>
          <ControlledPhoneInput
            name='phone'
            control={control}
            rules={signUpValidationRules.phone}
          />

          <ControlledPasswordInput
            name='password'
            control={control}
            rules={signUpValidationRules.password}
            placeholder={t('auth.passwordPlaceholder')}
            label='Password*'
            showRequirements={true}
            minLength={8}
          />

          <ControlledConfirmPasswordInput
            name='confirmPassword'
            control={control}
            rules={signUpValidationRules.confirmPassword}
            originalPasswordField='password'
            placeholder='Confirm your password'
            label='Confirm Password*'
          />
        </>
      ) : (
        <>
          <ControlledEmailInput
            name='email'
            control={control}
            rules={signUpValidationRules.email}
            placeholder={t('auth.emailPlaceholder')}
            label='Email Address*'
          />

          <ControlledPasswordInput
            name='password'
            control={control}
            rules={signUpValidationRules.password}
            placeholder={t('auth.passwordPlaceholder')}
            label='Password*'
            showRequirements={true}
            minLength={8}
          />

          <ControlledConfirmPasswordInput
            name='confirmPassword'
            control={control}
            rules={signUpValidationRules.confirmPassword}
            originalPasswordField='password'
            placeholder='Confirm your password'
            label='Confirm Password*'
          />
        </>
      )}

      <View style={styles.buttonContainer}>
        <Button
          title={t('auth.signUpButton')}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || isLoading}
          loading={isLoading}
          variant='primary'
          fullWidth
          icon='person-add-outline'
          iconPosition='left'
        />
      </View>

      <TouchableOpacity style={styles.linkButton} onPress={onSwitchToSignIn}>
        <Text style={styles.linkText}>
          Already have an account?{' '}
          <Text style={styles.linkTextHighlight}>Sign in</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
