import React from 'react';
import { View, Text, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useTranslations } from '@/shared/hooks';
import { Button, createThemedStyles } from '@everylanguage/shared-native-ui';

interface SignOutConfirmationModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const themedStyles = createThemedStyles({
  overlay: () => ({
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    padding: 20,
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
  buttonContainer: theme => ({
    flexDirection: 'row',
    gap: theme.spacing.sm,
  }),
  button: () => ({
    flex: 1,
  }),
  cancelButton: () => ({
    flex: 1,
  }),
  confirmButton: theme => ({
    flex: 1,
    backgroundColor: theme.colors.error || '#EF4444',
    borderColor: theme.colors.error || '#EF4444',
  }),
});

export const SignOutConfirmationModal: React.FC<
  SignOutConfirmationModalProps
> = ({ visible, onConfirm, onCancel }) => {
  const { theme } = useTheme();
  const t = useTranslations();
  const styles = themedStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.content}>
              <Text style={styles.title}>{t('auth.signOutConfirmTitle')}</Text>

              <Text style={styles.message}>
                {t('auth.signOutConfirmMessage')}
              </Text>

              <View style={styles.buttonContainer}>
                <Button
                  title={t('auth.cancel')}
                  onPress={onCancel}
                  variant='outline'
                  size='sm'
                  style={styles.cancelButton}
                />
                <Button
                  title={t('auth.signOutConfirm')}
                  onPress={onConfirm}
                  variant='primary'
                  size='sm'
                  style={styles.confirmButton}
                />
              </View>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};
