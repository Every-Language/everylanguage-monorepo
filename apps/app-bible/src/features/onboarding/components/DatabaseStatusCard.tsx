import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/shared/hooks';
import { COLOR_VARIATIONS } from '@everylanguage/shared-native-ui';

interface DatabaseInitProgress {
  stage: string;
  message: string;
  progress: number;
}

interface DatabaseStatusCardProps {
  status: 'checking' | 'ready' | 'error' | 'initializing';
  progress?: DatabaseInitProgress | null;
  error?: string | null;
  onRetry?: () => void;
}

export const DatabaseStatusCard: React.FC<DatabaseStatusCardProps> = ({
  status,
  progress,
  error,
  onRetry,
}) => {
  const { theme } = useTheme();

  const renderStatus = () => {
    switch (status) {
      case 'checking':
        return (
          <View
            style={[
              styles.databaseCard,
              {
                backgroundColor: theme.colors.surface,
                shadowColor: theme.colors.shadow,
              },
            ]}>
            <View style={styles.cardIcon}>
              <Text style={styles.iconText}>🔍</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Checking Database
              </Text>
              <Text
                style={[
                  styles.cardDescription,
                  { color: theme.colors.textSecondary },
                ]}>
                Verifying your Bible app database...
              </Text>
            </View>
            <ActivityIndicator size='small' color={theme.colors.primary} />
          </View>
        );

      case 'initializing':
        return (
          <View
            style={[
              styles.databaseCard,
              {
                backgroundColor: theme.colors.surface,
                shadowColor: theme.colors.shadow,
              },
            ]}>
            <View style={styles.cardIcon}>
              <Text style={styles.iconText}>⚙️</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Initializing Database
              </Text>
              <Text
                style={[
                  styles.cardDescription,
                  { color: theme.colors.textSecondary },
                ]}>
                {progress?.message || 'Setting up your Bible app...'}
              </Text>
              {progress && (
                <View style={styles.progressContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      { backgroundColor: theme.colors.surfaceOverlay },
                    ]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: theme.colors.primary,
                          width: `${progress.progress}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.progressText,
                      { color: theme.colors.textSecondary },
                    ]}>
                    {progress.progress}%
                  </Text>
                </View>
              )}
            </View>
            <ActivityIndicator size='small' color={theme.colors.primary} />
          </View>
        );

      case 'ready':
        return (
          <View
            style={[
              styles.databaseCard,
              {
                backgroundColor: theme.colors.surface,
                shadowColor: theme.colors.shadow,
              },
            ]}>
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: theme.colors.success + '20' },
              ]}>
              <Text style={styles.iconText}>✅</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Database Ready
              </Text>
              <Text
                style={[
                  styles.cardDescription,
                  { color: theme.colors.textSecondary },
                ]}>
                Your Bible app database is ready to use
              </Text>
            </View>
            <View
              style={[
                styles.statusIcon,
                { backgroundColor: theme.colors.success },
              ]}>
              <Text
                style={[
                  styles.statusText,
                  { color: theme.colors.textInverse },
                ]}>
                ✓
              </Text>
            </View>
          </View>
        );

      case 'error':
        return (
          <View
            style={[
              styles.databaseCard,
              { backgroundColor: theme.colors.surface },
            ]}>
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: theme.colors.error + '20' },
              ]}>
              <Text style={styles.iconText}>❌</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Database Error
              </Text>
              <Text
                style={[styles.cardDescription, { color: theme.colors.error }]}>
                {error || 'Failed to initialize database'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.retryButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={onRetry}>
              <Text
                style={[styles.retryText, { color: theme.colors.textInverse }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return renderStatus();
};

const styles = StyleSheet.create({
  databaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    width: '100%',
    shadowColor: COLOR_VARIATIONS.SHADOW_BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    flexShrink: 0,
  },
  iconText: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 30,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
