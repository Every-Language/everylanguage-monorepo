import { useCallback } from 'react';
import { Alert } from 'react-native';
import { logger } from '@/shared/utils/logger';
import { i18n } from '@/shared/services';

// Logging configuration for this module
const ENABLE_LOGGING = false;

export interface VersionActionItem {
  id: string;
  name: string;
  total_files: number;
}

export interface VersionDownloadActionsProps {
  onToggleDownload: (versionId: string) => Promise<void>;
}

export const useVersionDownloadActions = ({
  onToggleDownload,
}: VersionDownloadActionsProps) => {
  // Handle remove downloaded version confirmation
  const handleRemoveDownloadedVersion = useCallback(
    async (version: VersionActionItem) => {
      const message =
        version.total_files === 0
          ? i18n.t('downloads.confirmRemoveNoFiles', { name: version.name })
          : i18n.t('downloads.confirmRemoveWithFiles', { name: version.name });

      Alert.alert(i18n.t('downloads.removeDownloadedFilesTitle'), message, [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await onToggleDownload(version.id);
            } catch (error) {
              logger.error(
                ENABLE_LOGGING,
                'Error removing downloaded version:',
                error
              );
            }
          },
        },
      ]);
    },
    [onToggleDownload]
  );

  // Handle download version confirmation
  const handleDownloadVersion = useCallback(
    async (version: VersionActionItem) => {
      // Handle edge case of versions with no audio files
      if (version.total_files === 0) {
        Alert.alert(
          i18n.t('downloads.downloadVersionTitle'),
          i18n.t('downloads.confirmDownloadNoFiles', { name: version.name }),
          [
            { text: i18n.t('common.cancel'), style: 'cancel' },
            {
              text: i18n.t('common.download'),
              onPress: async () => {
                try {
                  await onToggleDownload(version.id);
                } catch (error) {
                  logger.error(
                    ENABLE_LOGGING,
                    'Error downloading version:',
                    error
                  );
                }
              },
            },
          ]
        );
        return;
      }

      // Estimate size (approximate 1MB per file for audio)
      const estimatedSizeMB = Math.max(
        10,
        Math.round((version.total_files * 1) / 10) * 10
      ); // Minimum 10MB, round to nearest 10MB

      Alert.alert(
        i18n.t('downloads.downloadVersionTitle'),
        i18n.t('downloads.confirmDownloadEstimate', {
          name: version.name,
          sizeMB: estimatedSizeMB,
        }),
        [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          {
            text: i18n.t('common.download'),
            onPress: async () => {
              try {
                await onToggleDownload(version.id);
              } catch (error) {
                logger.error(
                  ENABLE_LOGGING,
                  'Error downloading version:',
                  error
                );
              }
            },
          },
        ]
      );
    },
    [onToggleDownload]
  );

  return {
    handleRemoveDownloadedVersion,
    handleDownloadVersion,
  };
};
