import React from 'react';
import { View, Text, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useTranslations } from '@/shared/hooks';
import { createThemedStyles } from '@/shared';
import { Button } from '@/shared/components/Button';

interface SignOutProgressModalProps {
  visible: boolean;
  progress: number; // 0-100
  currentStep: string;
  isComplete: boolean;
  onDismiss: () => void;
}

const themedStyles = createThemedStyles({
  overlay: () => ({
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  }),
  modal: theme => ({
    backgroundColor: theme.colors.modalBackground || '#FFFFFF',
    borderRadius: 16,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  }),
  content: () => ({
    padding: 24,
    alignItems: 'center',
  }),
  title: theme => ({
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  }),
  message: theme => ({
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  }),
  progressContainer: theme => ({
    width: '100%',
    marginBottom: theme.spacing.lg,
  }),
  progressBar: theme => ({
    height: 8,
    backgroundColor: theme.colors.border || '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  }),
  progressFill: theme => ({
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  }),
  progressText: theme => ({
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  }),
  currentStep: theme => ({
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    textAlign: 'center',
    fontWeight: '500',
  }),
  loadingContainer: theme => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  }),
  loadingText: theme => ({
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  }),
  completionContainer: theme => ({
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  }),
  completionIconContainer: theme => ({
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  }),
  completionMessage: theme => ({
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  }),
  buttonContainer: theme => ({
    marginTop: theme.spacing.md,
    width: '100%',
  }),
});

export const SignOutProgressModal: React.FC<SignOutProgressModalProps> = ({
  visible,
  progress,
  currentStep,
  isComplete,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const t = useTranslations();
  const styles = themedStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.content}>
              <Text style={styles.title}>
                {isComplete
                  ? t('auth.signOutComplete', {
                      defaultValue: 'Sign Out Complete',
                    })
                  : t('auth.signingOut', { defaultValue: 'Signing Out' })}
              </Text>

              {!isComplete && (
                <Text style={styles.message}>
                  {t('auth.signOutProgressMessage', {
                    defaultValue:
                      'Clearing your data and preparing for a fresh start...',
                  })}
                </Text>
              )}

              {!isComplete && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, Math.max(0, progress))}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {Math.round(progress)}%{' '}
                    {t('common.complete', { defaultValue: 'Complete' })}
                  </Text>
                </View>
              )}

              {!isComplete && (
                <Text style={styles.currentStep}>{currentStep}</Text>
              )}

              {isComplete ? (
                <View style={styles.completionContainer}>
                  <View style={styles.completionIconContainer}>
                    <Ionicons
                      name='checkmark-circle'
                      size={32}
                      color={theme.colors.success}
                    />
                  </View>
                  <Text style={styles.completionMessage}>
                    {t('auth.signOutCompleteMessage', {
                      defaultValue:
                        'You are now signed out. You can sign in again or set up a new account.',
                    })}
                  </Text>
                  <View style={styles.buttonContainer}>
                    <Button
                      title={t('auth.getStarted', {
                        defaultValue: 'Get Started',
                      })}
                      onPress={onDismiss}
                      size='md'
                      variant='primary'
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator
                    size='small'
                    color={theme.colors.primary}
                  />
                  <Text style={styles.loadingText}>
                    {t('common.pleaseWait', { defaultValue: 'Please wait...' })}
                  </Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};
