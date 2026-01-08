import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';

interface ModalHeaderProps {
  title?: string;
  showBack?: boolean;
  showClose?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  borderBottom?: boolean;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  showBack = false,
  showClose = true,
  onBack,
  onClose,
  borderBottom = true,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        styles.topPadding,
        borderBottom && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
      ]}>
      <View style={[styles.leftArea, !showBack && styles.leftAlign]}>
        {showBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.iconButton}
            accessibilityLabel='Back'>
            <Ionicons
              name='chevron-back'
              size={24}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
        <Text
          style={[styles.title, { color: theme.colors.text }]}
          numberOfLines={1}>
          {title || ''}
        </Text>
      </View>
      {showClose ? (
        <TouchableOpacity
          onPress={onClose}
          style={styles.iconButton}
          accessibilityLabel='Close'>
          <Ionicons name='close' size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconPlaceholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topPadding: { paddingTop: 24 },
  leftArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leftAlign: {
    justifyContent: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  iconButton: {
    padding: 8,
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
  },
});

export default ModalHeader;
