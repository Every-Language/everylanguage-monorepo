import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';

interface BaseMenuItemProps {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  iconColor?: string;
}

export const BaseMenuItem: React.FC<BaseMenuItemProps> = ({
  onPress,
  icon,
  title,
  subtitle,
  iconColor,
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.menuItemContent}>
        <Ionicons
          name={icon}
          size={24}
          color={iconColor || theme.colors.text}
        />
        <View style={styles.menuItemInfo}>
          <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.menuItemSubtext,
                { color: theme.colors.textSecondary },
              ]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <Ionicons
        name='chevron-forward'
        size={16}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuItemSubtext: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
});
