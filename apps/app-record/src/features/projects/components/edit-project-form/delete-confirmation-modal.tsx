import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme, useTranslation } from '@/shared/hooks';

export interface DeleteConfirmationModalProps {
  visible: boolean;
  projectName: string;
  confirmationText: string;
  onConfirmationTextChange: (text: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  error: Error | string | null;
  isDeleteEnabled: boolean;
}

/**
 * Convert hex color to rgba string with opacity
 */
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Delete Confirmation Modal Component
 *
 * Modal for confirming project deletion with name verification.
 */
export const DeleteConfirmationModal: React.FC<
  DeleteConfirmationModalProps
> = ({
  visible,
  projectName,
  confirmationText,
  onConfirmationTextChange,
  onCancel,
  onConfirm,
  isDeleting,
  error,
  isDeleteEnabled,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const errorBackgroundColor = hexToRgba(theme.colors.error, 0.1);
  const modalOverlayStyle = [
    styles.modalOverlay,
    { backgroundColor: hexToRgba(theme.colors.text, 0.5) },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onCancel}>
      <View style={modalOverlayStyle}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.colors.background },
          ]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('projects.edit.deleteConfirmation.title')}
          </Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            {t('projects.edit.deleteConfirmation.message')}
          </Text>

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {t('projects.edit.deleteConfirmation.enterProjectName')}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              placeholder={projectName}
              placeholderTextColor={theme.colors.textSecondary}
              value={confirmationText}
              onChangeText={onConfirmationTextChange}
              autoCapitalize='words'
              autoComplete='off'
              editable={!isDeleting}
            />
          </View>

          {error && (
            <View
              style={[
                styles.errorContainer,
                {
                  backgroundColor: errorBackgroundColor,
                },
              ]}>
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {error instanceof Error ? error.message : String(error)}
              </Text>
            </View>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              onPress={onCancel}
              disabled={isDeleting}>
              <Text style={[styles.cancelText, { color: theme.colors.text }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deleteButton,
                {
                  backgroundColor: isDeleteEnabled
                    ? theme.colors.error
                    : theme.colors.interactiveDisabled,
                },
              ]}
              onPress={onConfirm}
              disabled={!isDeleteEnabled || isDeleting}>
              {isDeleting ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text
                  style={[
                    styles.deleteText,
                    {
                      color: isDeleteEnabled
                        ? theme.colors.textInverse
                        : theme.colors.textSecondary,
                    },
                  ]}>
                  {t('projects.edit.deleteConfirmation.deleteButton')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    fontSize: 17,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  errorContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  deleteText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
