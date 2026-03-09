import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/shared/ui';
import { useTheme, useTranslation } from '@/shared/hooks';
import { ProfileModal } from '@/features/auth/components';

/**
 * Menu Screen
 *
 * Main menu with navigation to settings and other options.
 */
export const MenuScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);

  const handleSettingsPress = (): void => {
    router.push('/(tabs)/menu/settings');
  };

  const handleProfilePress = (): void => {
    setIsProfileModalVisible(true);
  };

  const handleCloseProfileModal = (): void => {
    setIsProfileModalVisible(false);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={t('nav.menu')}
        rightButtons={[
          {
            icon: (
              <Ionicons
                name='person-circle-outline'
                size={24}
                color={theme.colors.accent}
              />
            ),
            onPress: handleProfilePress,
          },
        ]}
      />
      <View style={styles.content}>
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.colors.surface,
            },
          ]}>
          <TouchableOpacity
            style={[
              styles.menuItem,
              { borderBottomColor: theme.colors.border },
            ]}
            onPress={handleSettingsPress}>
            <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
              {t('common.settings')}
            </Text>
            <Text
              style={[
                styles.menuItemChevron,
                { color: theme.colors.textSecondary },
              ]}>
              ›
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <ProfileModal
        visible={isProfileModalVisible}
        onClose={handleCloseProfileModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  section: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemText: {
    fontSize: 17,
  },
  menuItemChevron: {
    fontSize: 24,
  },
});
