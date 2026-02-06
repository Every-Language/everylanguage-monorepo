import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/shared/ui';
import { useTheme, useTranslation } from '@/shared/hooks';
import { environmentInfo } from '@/shared/config/env';
import { DebugSection } from '../components';

/**
 * Debug Screen
 *
 * Shows current HomeScreen debug content.
 * Only available in development environment.
 */
export const DebugScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const handleBack = useCallback((): void => {
    router.back();
  }, [router]);

  useEffect(() => {
    // Redirect if not in development environment
    if (!environmentInfo.isDevelopment) {
      handleBack();
    }
  }, [handleBack]);

  // Don't render if not in development
  if (!environmentInfo.isDevelopment) {
    return null;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={t('debug.title')}
        leftButton={{
          label: t('common.back'),
          onPress: handleBack,
        }}
      />
      <DebugSection />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
