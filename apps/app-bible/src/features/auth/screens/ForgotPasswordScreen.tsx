import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { useTheme, useTranslations } from '@/shared/hooks';
import { Button, createThemedStyles } from '@everylanguage/shared-native-ui';
import {
  ControlledEmailInput,
  ControlledPhoneInput,
} from '@/features/auth/components';
import { authService } from '@/features/auth/services/authService';
import type {
  ForgotPasswordScreenProps,
  AuthStackNavigationProp,
} from '../navigation/AuthStackNavigator';

const themedStyles = createThemedStyles({
  container: theme => ({
    flex: 1,
    backgroundColor: theme.colors.modalBackground,
  }),
  header: () => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
  }),
  backButton: () => ({
    padding: 8,
    marginLeft: -8,
  }),
  closeButton: () => ({
    padding: 8,
  }),
  content: () => ({
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  }),
  title: theme => ({
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: 'bold',
    textAlign: 'center',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  }),
  subtitle: theme => ({
    fontSize: theme.typography.fontSize.md,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  }),
  // Method selector styles
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
  form: theme => ({
    gap: theme.spacing.lg,
  }),
  buttonContainer: theme => ({
    marginTop: theme.spacing.lg,
  }),
});

interface ForgotPasswordFormData {
  email: string;
  phone: string;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  route,
}) => {
  const {
    email: initialEmail,
    phone: initialPhone,
    method: initialMethod,
  } = route.params || {};
  const { theme } = useTheme();
  const t = useTranslations();
  const styles = themedStyles(theme);
  const navigation = useNavigation<AuthStackNavigationProp>();

  const [resetMethod, setResetMethod] = useState<'email' | 'phone'>(
    initialMethod || 'email'
  );
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isValid },
    // watch,
  } = useForm<ForgotPasswordFormData>({
    defaultValues: {
      email: initialEmail || '',
      phone: initialPhone || '',
    },
    mode: 'onChange',
  });

  // const email = watch('email');
  // const phone = watch('phone');

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    navigation.getParent()?.goBack();
  }, [navigation]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);

      if (resetMethod === 'email') {
        if (!data.email) {
          Alert.alert(t('common.error'), t('auth.errors.emailRequired'));
          return;
        }

        const result = await authService.resetPassword(data.email);
        if (result.success) {
          Alert.alert(
            t('auth.passwordResetSent'),
            t('auth.checkEmailForReset'),
            [
              {
                text: t('common.ok'),
                onPress: () => navigation.navigate('SignIn'),
              },
            ]
          );
        } else {
          Alert.alert(
            t('common.error'),
            result.error || t('auth.errors.generic')
          );
        }
      } else {
        // Phone password reset - show contact support message
        Alert.alert(
          t('auth.phonePasswordReset'),
          t('auth.phonePasswordResetMessage'),
          [
            {
              text: t('common.ok'),
              onPress: () => navigation.navigate('SignIn'),
            },
          ]
        );
      }
    } catch {
      Alert.alert(t('common.error'), t('auth.errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons
            name='chevron-back'
            size={24}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name='close' size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.forgotPasswordTitle')}</Text>
        <Text style={styles.subtitle}>
          {resetMethod === 'email'
            ? t('auth.forgotPasswordEmailSubtitle')
            : t('auth.forgotPasswordPhoneSubtitle')}
        </Text>

        {/* Method Selection */}
        <View style={styles.methodSelectorContainer}>
          <Text style={styles.methodSelectorTitle}>
            {t('auth.chooseResetMethod')}
          </Text>
          <View style={styles.methodsContainer}>
            <TouchableOpacity
              style={[
                styles.methodButton,
                resetMethod === 'email' && styles.methodButtonActive,
              ]}
              onPress={() => setResetMethod('email')}>
              <Ionicons
                name='mail-outline'
                size={18}
                style={[
                  styles.methodIcon,
                  resetMethod === 'email' && styles.methodIconActive,
                ]}
              />
              <Text
                style={[
                  styles.methodButtonText,
                  resetMethod === 'email' && styles.methodButtonTextActive,
                ]}>
                {t('auth.email')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.methodButton,
                resetMethod === 'phone' && styles.methodButtonActive,
              ]}
              onPress={() => setResetMethod('phone')}>
              <Ionicons
                name='call-outline'
                size={18}
                style={[
                  styles.methodIcon,
                  resetMethod === 'phone' && styles.methodIconActive,
                ]}
              />
              <Text
                style={[
                  styles.methodButtonText,
                  resetMethod === 'phone' && styles.methodButtonTextActive,
                ]}>
                {t('auth.phone')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.form}>
          {resetMethod === 'email' ? (
            <ControlledEmailInput
              name='email'
              control={control}
              placeholder={t('auth.email')}
            />
          ) : (
            <ControlledPhoneInput name='phone' control={control} />
          )}

          <View style={styles.buttonContainer}>
            <Button
              title={
                resetMethod === 'email'
                  ? t('auth.sendResetLink')
                  : t('auth.sendResetSms')
              }
              onPress={handleSubmit(onSubmit)}
              disabled={!isValid || isLoading}
              loading={isLoading}
              size='lg'
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};
