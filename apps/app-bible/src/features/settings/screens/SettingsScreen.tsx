import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import { Header, GradientBackground } from '@/shared/components';
import { useSettingsState, useSettingsActions } from '../store/settingsStore';
import { MediaSettingsSection } from '../components';

/**
 * Main settings screen
 */
export const SettingsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { isLoading, error } = useSettingsState();
  const { clearError } = useSettingsActions();

  const handleRefresh = () => {
    // Settings are automatically loaded from storage
    // This could be used to refresh from a remote source if needed
    clearError();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      paddingBottom: 20,
    },
    errorContainer: {
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.error,
      borderWidth: 1,
      margin: 16,
      borderRadius: 8,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 14,
    },
  });

  return (
    <GradientBackground>
      <View style={styles.container}>
        <Header
          title={t('settings.title', 'Settings')}
          onBackPress={() => {}}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <MediaSettingsSection />
        </ScrollView>
      </View>
    </GradientBackground>
  );
};
