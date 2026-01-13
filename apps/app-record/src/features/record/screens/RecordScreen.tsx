import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppHeader } from '@/shared/ui';
import { useTheme, useTranslation } from '@/shared/hooks';

/**
 * Record Screen
 *
 * Placeholder screen for recording interface.
 * Users can record audio segments offline.
 */
export const RecordScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title={t('record.title')} />
      <View style={styles.content}>
        <Text style={[styles.placeholder, { color: theme.colors.text }]}>
          {t('record.placeholder')}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {t('record.subtitle')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholder: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
});
