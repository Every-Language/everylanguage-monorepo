import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useCallback } from 'react';

export function useSharing() {
  const shareFile = useCallback(async (fileUri: string) => {
    try {
      const can = await Sharing.isAvailableAsync();
      if (!can) {
        return false;
      }
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.everylanguage.elpkg',
        UTI: 'com.everylanguage.elpkg',
        dialogTitle: 'Share EL Bible Package',
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const ensureDir = useCallback(async (dir: string) => {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists)
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }, []);

  return { shareFile, ensureDir };
}
