import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/hooks/useThemeFromStore';
import type { AudioVersion, TextVersion } from '../types/entities';
import { VersionMenuButton } from './VersionMenuButton';
import { useLocalization } from '@/shared/hooks';

interface SavedVersionItemProps {
  version: AudioVersion | TextVersion;
  isSelected?: boolean;
  onSelect: (version: AudioVersion | TextVersion) => void;
  onRemove?: (versionId: string) => void;
  versionType: 'audio' | 'text';
  onInfoRequested?: () => void;
}

export const SavedVersionItem: React.FC<SavedVersionItemProps> = ({
  version,
  isSelected = false,
  onSelect,
  onRemove,
  versionType,
  onInfoRequested,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const handlePress = useCallback(() => {
    onSelect(version);
  }, [version, onSelect]);

  const containerStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.surface,
      borderWidth: isSelected ? 2 : 0,
      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
    }),
    [
      isSelected,
      theme.colors.border,
      theme.colors.primary,
      theme.colors.surface,
    ]
  );

  return (
    <View style={[styles.versionItem, containerStyle]}>
      <View style={styles.versionContent}>
        <Pressable style={styles.versionInfo} onPress={handlePress}>
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
        </Pressable>

        <View style={styles.versionActions}>
          {isSelected && (
            <Ionicons
              name='checkmark-circle'
              size={20}
              color={theme.colors.primary}
              style={styles.selectedIcon}
            />
          )}
          <VersionMenuButton
            version={version}
            versionType={versionType}
            onRemoveVersion={async () =>
              onRemove && (await onRemove(version.id))
            }
            onInfoRequested={onInfoRequested}
          />
        </View>
      </View>
    </View>
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
  versionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedIcon: {
    marginRight: 8,
  },
});
