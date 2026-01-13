import { powerSyncSystem } from '@/shared/infrastructure/powersync/services/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';

/**
 * Find the first verse of a chapter
 *
 * @param chapterId - The ID of the chapter
 * @returns The first verse ID, or null if not found
 */
export async function findFirstVerseId(
  chapterId: string
): Promise<string | null> {
  try {
    if (!powerSyncSystem.isInitialized) {
      throw new Error('PowerSync database not initialized');
    }

    const result = await powerSyncSystem.getAll(
      `SELECT id FROM verses 
       WHERE chapter_id = ? 
       ORDER BY verse_number ASC 
       LIMIT 1`,
      [chapterId]
    );

    const verses = result as Array<{ id: string }>;
    if (verses && verses.length > 0 && verses[0]) {
      return verses[0].id;
    }

    logger.warn('No first verse found for chapter:', { chapterId });
    return null;
  } catch (error) {
    logger.error('Error finding first verse:', error);
    throw error;
  }
}

/**
 * Find the last verse of a chapter
 *
 * @param chapterId - The ID of the chapter
 * @returns The last verse ID, or null if not found
 */
export async function findLastVerseId(
  chapterId: string
): Promise<string | null> {
  try {
    if (!powerSyncSystem.isInitialized) {
      throw new Error('PowerSync database not initialized');
    }

    const result = await powerSyncSystem.getAll(
      `SELECT id FROM verses 
       WHERE chapter_id = ? 
       ORDER BY verse_number DESC 
       LIMIT 1`,
      [chapterId]
    );

    const verses = result as Array<{ id: string }>;
    if (verses && verses.length > 0 && verses[0]) {
      return verses[0].id;
    }

    logger.warn('No last verse found for chapter:', { chapterId });
    return null;
  } catch (error) {
    logger.error('Error finding last verse:', error);
    throw error;
  }
}
