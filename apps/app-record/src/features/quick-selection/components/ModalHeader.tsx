import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { useQuickSelectionStore } from '../store/quickSelectionStore';

interface ModalHeaderProps {
  title: string;
  showClose?: boolean;
  onClose: () => void;
  showBack?: boolean;
  onBack?: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  showClose = true,
  onClose,
  showBack = false,
  onBack,
}) => {
  const { theme } = useTheme();
  const { goBack, canGoBack } = useQuickSelectionStore();

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      goBack();
    }
  }, [onBack, goBack]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const shouldShowBack = showBack && canGoBack();

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    leftSection: {
      width: 40,
      alignItems: 'flex-start',
    },
    centerSection: {
      flex: 1,
      alignItems: 'center',
    },
    rightSection: {
      width: 40,
      alignItems: 'flex-end',
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.text,
    },
    backButton: {
      padding: 8,
    },
    closeButton: {
      padding: 8,
    },
  });

  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        {shouldShowBack && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <MaterialIcons
              name='arrow-back'
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.centerSection}>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.rightSection}>
        {showClose && (
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialIcons name='close' size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
