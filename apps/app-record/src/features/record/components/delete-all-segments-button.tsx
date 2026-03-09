import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '@/shared/hooks';
import { environmentInfo } from '@/shared/config/env';
import { powerSyncSystem } from '@/shared/infrastructure/powersync';
import { FilePathService } from '../services/file-path-service';

export interface DeleteAllSegmentsButtonProps {
  sequenceId: string;
}

/**
 * Dev-only button to delete all segments and audio files for a sequence
 *
 * Only visible in development environment.
 * Permanently deletes all segments from PowerSync and all associated audio files.
 */
export const DeleteAllSegmentsButton: React.FC<
  DeleteAllSegmentsButtonProps
> = ({ sequenceId }) => {
  const { theme } = useTheme();

  // Only render in development
  if (!environmentInfo.isDevelopment) {
    return null;
  }

  const handleDeleteAllSegments = async (): Promise<void> => {
    if (!sequenceId) {
      return;
    }

    Alert.alert(
      'Delete All Segments',
      'This will permanently delete all segments and audio files for this sequence. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!powerSyncSystem.isInitialized) {
                Alert.alert('Error', 'PowerSync database not initialized');
                return;
              }

              // Get all segments for this sequence (including deleted ones to get all file paths)
              const allSegments = (await powerSyncSystem.getAll(
                `SELECT id, object_key 
                 FROM segments 
                 WHERE sequence_id = ?`,
                [sequenceId]
              )) as Array<{ id: string; object_key: string }>;

              // Delete all audio files from segments
              let deletedFilesCount = 0;
              for (const segment of allSegments) {
                if (segment.object_key) {
                  try {
                    await FilePathService.deleteFile(segment.object_key);
                    deletedFilesCount++;
                  } catch (err) {
                    // Ignore individual file deletion errors
                    // eslint-disable-next-line no-console
                    console.warn(
                      `Failed to delete segment file ${segment.id}:`,
                      err
                    );
                  }
                }
              }

              // Also delete all files in the sequence directory (in case there are orphaned files)
              try {
                const baseDir = FileSystem.documentDirectory || '';
                const sequenceDir = `${baseDir}recordings/${sequenceId}`;
                const dirInfo = await FileSystem.getInfoAsync(sequenceDir);
                if (dirInfo.exists && dirInfo.isDirectory) {
                  const files =
                    await FileSystem.readDirectoryAsync(sequenceDir);
                  for (const file of files) {
                    try {
                      await FileSystem.deleteAsync(`${sequenceDir}/${file}`, {
                        idempotent: true,
                      });
                      deletedFilesCount++;
                    } catch (err) {
                      // Ignore individual file deletion errors
                      // eslint-disable-next-line no-console
                      console.warn(`Failed to delete file ${file}:`, err);
                    }
                  }
                }
              } catch (err) {
                // eslint-disable-next-line no-console
                console.warn('Failed to delete sequence directory files:', err);
              }

              // Delete all segments from PowerSync
              await powerSyncSystem.execute(
                `DELETE FROM segments WHERE sequence_id = ?`,
                [sequenceId]
              );

              Alert.alert(
                'Success',
                `Deleted ${allSegments.length} segment(s) and ${deletedFilesCount} file(s)`
              );
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error('Failed to delete all segments:', error);
              Alert.alert(
                'Error',
                `Failed to delete segments: ${error instanceof Error ? error.message : 'Unknown error'}`
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.error,
          },
        ]}
        onPress={handleDeleteAllSegments}
        accessibilityLabel='Delete all segments (dev only)'
        accessibilityRole='button'>
        <Ionicons
          name='trash-outline'
          size={20}
          color={theme.colors.textInverse}
        />
        <Text style={[styles.buttonText, { color: theme.colors.textInverse }]}>
          Dev: Delete All Segments
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
