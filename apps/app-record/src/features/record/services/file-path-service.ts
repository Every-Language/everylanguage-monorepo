import * as FileSystem from 'expo-file-system';

/**
 * File Path Service
 *
 * Manages file paths for recording audio files.
 * Stores relative paths in database, resolves to absolute when needed.
 *
 * Pattern: `recordings/${sequenceId}/${segmentId}.aac`
 * Absolute: `${FileSystem.documentDirectory}recordings/${sequenceId}/${segmentId}.aac`
 */
export class FilePathService {
  /**
   * Get the base directory for recordings
   */
  private static getBaseDirectory(): string {
    return FileSystem.documentDirectory || '';
  }

  /**
   * Generate relative path for a recording segment
   *
   * @param sequenceId - Sequence ID
   * @param segmentId - Segment ID (UUID)
   * @returns Relative path (e.g., "recordings/seq-123/seg-456.aac")
   */
  static getRelativePath(sequenceId: string, segmentId: string): string {
    return `recordings/${sequenceId}/${segmentId}.aac`;
  }

  /**
   * Resolve relative path to absolute path
   *
   * @param relativePath - Relative path from database
   * @returns Absolute path
   */
  static getAbsolutePath(relativePath: string): string {
    const base = this.getBaseDirectory();
    if (relativePath.startsWith(base)) {
      return relativePath; // Already absolute
    }
    return `${base}${relativePath}`;
  }

  /**
   * Get absolute path for a recording segment
   *
   * @param sequenceId - Sequence ID
   * @param segmentId - Segment ID (UUID)
   * @returns Absolute path
   */
  static getAbsolutePathForSegment(
    sequenceId: string,
    segmentId: string
  ): string {
    const relativePath = this.getRelativePath(sequenceId, segmentId);
    return this.getAbsolutePath(relativePath);
  }

  /**
   * Ensure directory exists for a sequence
   *
   * @param sequenceId - Sequence ID
   * @returns Promise that resolves when directory is ready
   */
  static async ensureSequenceDirectory(sequenceId: string): Promise<void> {
    const base = this.getBaseDirectory();
    const sequenceDir = `${base}recordings/${sequenceId}`;
    const dirInfo = await FileSystem.getInfoAsync(sequenceDir);

    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(sequenceDir, { intermediates: true });
    }
  }

  /**
   * Delete a file by relative path
   *
   * @param relativePath - Relative path from database
   * @returns Promise that resolves when file is deleted
   */
  static async deleteFile(relativePath: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(relativePath);
    const fileInfo = await FileSystem.getInfoAsync(absolutePath);

    if (fileInfo.exists) {
      await FileSystem.deleteAsync(absolutePath, { idempotent: true });
    }
  }

  /**
   * Copy a file from source to destination (both relative paths)
   *
   * @param sourceRelativePath - Source relative path
   * @param destRelativePath - Destination relative path
   * @returns Promise that resolves when file is copied
   */
  static async copyFile(
    sourceRelativePath: string,
    destRelativePath: string
  ): Promise<void> {
    const sourceAbsolute = this.getAbsolutePath(sourceRelativePath);
    const destAbsolute = this.getAbsolutePath(destRelativePath);

    // Ensure destination directory exists
    const destDir = destAbsolute.substring(0, destAbsolute.lastIndexOf('/'));
    const dirInfo = await FileSystem.getInfoAsync(destDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
    }

    await FileSystem.copyAsync({
      from: sourceAbsolute,
      to: destAbsolute,
    });
  }

  /**
   * Check if a file exists by relative path
   *
   * @param relativePath - Relative path from database
   * @returns Promise that resolves to true if file exists
   */
  static async fileExists(relativePath: string): Promise<boolean> {
    const absolutePath = this.getAbsolutePath(relativePath);
    const fileInfo = await FileSystem.getInfoAsync(absolutePath);
    return fileInfo.exists;
  }
}
