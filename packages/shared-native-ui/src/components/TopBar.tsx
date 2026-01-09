import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks';

interface TopBarProps {
  title?: string;
  showProfile?: boolean;
  onMenuPress?: () => void;
  onSearchPress?: () => void;
  onQuickSelectionPress?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  showProfile = true,
  onMenuPress,
  onSearchPress,
  onQuickSelectionPress,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.leftSection}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          EL Bible
        </Text>
      </View>

      <View style={styles.rightSection}>
        {onQuickSelectionPress && (
          <TouchableOpacity
            style={styles.quickSelectionButton}
            onPress={onQuickSelectionPress}
            activeOpacity={0.7}>
            <Ionicons
              name='flash-outline'
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        )}
        {onSearchPress && (
          <TouchableOpacity
            style={styles.searchButton}
            onPress={onSearchPress}
            activeOpacity={0.7}>
            <Ionicons
              name='search-outline'
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        )}
        {showProfile && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={onMenuPress}
            activeOpacity={0.7}>
            <Ionicons name='menu' size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  leftSection: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickSelectionButton: {
    padding: 8,
  },
  searchButton: {
    padding: 8,
  },
  menuButton: {
    padding: 8,
  },
});
