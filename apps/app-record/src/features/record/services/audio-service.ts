import { Audio } from 'expo-av';
import { FilePathService } from './file-path-service';

/**
 * Audio Service
 *
 * Handles audio file operations like extracting duration.
 */
export class AudioService {
  /**
   * Extract duration from an audio file
   *
   * @param relativePath - Relative path to the audio file
   * @returns Promise that resolves to duration in seconds, or null if extraction fails
   */
  static async extractDuration(relativePath: string): Promise<number | null> {
    try {
      const fileExists = await FilePathService.fileExists(relativePath);
      if (!fileExists) {
        return null;
      }

      const absolutePath = FilePathService.getAbsolutePath(relativePath);
      const audioUri = absolutePath.startsWith('file://')
        ? absolutePath
        : `file://${absolutePath}`;

      // Load the sound to get duration (without playing)
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false }
      );

      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.durationMillis !== undefined) {
          return status.durationMillis / 1000;
        }
        return null;
      } finally {
        // Unload the sound after getting duration
        await sound.unloadAsync();
      }
    } catch (err) {
      // Silently fail - return null to indicate extraction failed
      // eslint-disable-next-line no-console
      console.warn('Failed to extract duration from audio file:', err);
      return null;
    }
  }
}
