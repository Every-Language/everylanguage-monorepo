import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import { useDownloadsStore } from '@/shared/store/downloadsStore';

export interface DownloadPillProps {
  onPress?: () => void;
}

export const DownloadPill: React.FC<DownloadPillProps> = ({ onPress }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { queued, active } = useDownloadsStore();
  const pendingCount = queued + active;

  const getDownloadStatusText = () => {
    if (active > 0) {
      return t('downloads.downloading', {
        defaultValue: `${active} downloading pending ${pendingCount}`,
      });
    }
    if (queued > 0) {
      return t('downloads.queued', {
        defaultValue: `${queued} queued`,
      });
    }
    return t('downloads.noDownloads', {
      defaultValue: 'No downloads',
    });
  };

  return (
    <TouchableOpacity
      style={[styles.downloadCard, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.downloadContent}>
        <Ionicons
          name='cloud-download'
          size={24}
          color={theme.colors.primary}
        />
        <View style={styles.downloadInfo}>
          <Text style={[styles.downloadTitle, { color: theme.colors.text }]}>
            {t('downloads.title', { defaultValue: 'Downloads' })}
          </Text>
          <Text
            style={[
              styles.downloadSubtext,
              { color: theme.colors.textSecondary },
            ]}>
            {getDownloadStatusText()}
          </Text>
        </View>
      </View>
      <Ionicons
        name='chevron-forward'
        size={16}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  downloadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  downloadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  downloadInfo: {
    flex: 1,
  },
  downloadTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  downloadSubtext: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
});
