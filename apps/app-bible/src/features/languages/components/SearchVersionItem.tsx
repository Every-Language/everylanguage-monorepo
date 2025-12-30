import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/shared/hooks';
import type { AudioVersion, TextVersion } from '../types/entities';
import { StyleSheet } from 'react-native';
import { useVersionCompleteness } from '../hooks/useVersionCompleteness';
import { useLocalization } from '@/shared/hooks';

interface SearchVersionItemProps {
  version: AudioVersion | TextVersion;
  isAlreadySaved?: boolean;
  onSelect: (version: AudioVersion | TextVersion) => void;
}

export const SearchVersionItem: React.FC<SearchVersionItemProps> = ({
  version,
  isAlreadySaved = false,
  onSelect,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { loading, overallPercent } = useVersionCompleteness(
    version as AudioVersion | TextVersion
  );

  const handlePress = useCallback(() => {
    if (isAlreadySaved) {
      Alert.alert(
        t('versions.alreadySavedTitle', { defaultValue: 'Already saved' }),
        t('versions.alreadySavedMessage', {
          defaultValue: 'You have already saved this version.',
        })
      );
      return;
    }
    onSelect(version);
  }, [isAlreadySaved, onSelect, t, version]);

  return (
    <TouchableOpacity
      style={[
        styles.versionItem,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          ...(isAlreadySaved ? { opacity: 0.6 } : {}),
        },
      ]}
      onPress={handlePress}
      disabled={isAlreadySaved}>
      <View style={styles.versionContent}>
        <View style={styles.versionInfo}>
          <Text style={[styles.versionName, { color: theme.colors.text }]}>
            {version.name}
          </Text>
          <Text
            style={[
              styles.versionLanguage,
              { color: theme.colors.textSecondary },
            ]}>
            {version.languageName || t('versions.unknownLanguage')}
          </Text>
        </View>
        <View style={styles.progressContainer}>
          {loading ? (
            <ActivityIndicator size='small' color={theme.colors.primary} />
          ) : (
            <View
              style={[
                styles.miniCircle,
                { borderColor: theme.colors.primary },
              ]}>
              <Text style={[styles.miniPercent, { color: theme.colors.text }]}>
                {overallPercent}%
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  versionItem: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  versionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  versionInfo: {
    flex: 1,
  },
  versionName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  versionLanguage: {
    fontSize: 14,
  },
  progressContainer: {
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPercent: {
    fontSize: 10,
    fontWeight: '700',
  },
});
