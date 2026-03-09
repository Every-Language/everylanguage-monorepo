import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/shared/ui';
import { useTheme, useTranslation } from '@/shared/hooks';
import { environmentInfo } from '@/shared/config/env';
import { useLocalizationStore } from '@/shared/store/localizationStore';
import { ProfileModal } from '@/features/auth/components';

/**
 * Settings Screen
 *
 * Main settings screen with navigation to:
 * - Appearance (theme selection)
 * - App Language (language selection)
 * - Debug (shows current HomeScreen debug content)
 *
 * Profile access is available via the profile icon button in the header,
 * which opens a modal with login form (when logged out) or user info (when logged in).
 */
export const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { currentLocaleInfo } = useLocalizationStore();
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);

  const handleBack = (): void => {
    router.back();
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
        title={t('settings.title')}
        leftButton={{
          label: t('common.back'),
          onPress: handleBack,
        }}
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
      <ScrollView style={styles.content}>
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
            onPress={() => router.push('/(tabs)/menu/settings/appearance')}>
            <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
              {t('settings.appearance')}
            </Text>
            <Text
              style={[
                styles.menuItemChevron,
                { color: theme.colors.textSecondary },
              ]}>
              ›
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItemLast}
            onPress={() => router.push('/(tabs)/menu/settings/app-language')}>
            <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
              {t('settings.appLanguage')}
            </Text>
            <View style={styles.menuItemRight}>
              {currentLocaleInfo && (
                <Text
                  style={[
                    styles.menuItemValue,
                    { color: theme.colors.textSecondary },
                  ]}>
                  {currentLocaleInfo.nativeName}
                </Text>
              )}
              <Text
                style={[
                  styles.menuItemChevron,
                  { color: theme.colors.textSecondary },
                ]}>
                ›
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {environmentInfo.isDevelopment && (
          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.surface,
              },
            ]}>
            <TouchableOpacity
              style={styles.menuItemLast}
              onPress={() => router.push('/(tabs)/menu/settings/debug')}>
              <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
                {t('settings.debug')}
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
        )}
      </ScrollView>
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
  menuItemLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 17,
  },
  menuItemChevron: {
    fontSize: 24,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemValue: {
    fontSize: 17,
  },
});
