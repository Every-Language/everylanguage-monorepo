import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/shared/ui';
import { useTheme, useTranslation } from '@/shared/hooks';
import { MyProfileSection } from '../components';

/**
 * My Profile Screen
 *
 * Shows login form if not logged in, user info if logged in.
 */
export const MyProfileScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const handleBack = useCallback((): void => {
    router.back();
  }, [router]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={t('auth.myProfile')}
        leftButton={{
          label: t('common.back'),
          onPress: handleBack,
        }}
      />
      <MyProfileSection />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
