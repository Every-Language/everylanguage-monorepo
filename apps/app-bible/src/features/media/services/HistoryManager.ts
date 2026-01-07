import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';
import type { BibleTrack } from '../types';

// Logging configuration for this module
const ENABLE_LOGGING = false;

export interface HistoryItem {
  id: string;
  trackId: string;
  chapterId: string;
  audioVersionId: string;
  languageEntityId: string;
  title: string;
  subtitle: string;
  startedAt: string;
  completedAt: string | undefined;
  lastPositionSeconds: number;
  durationSeconds: number;
  completionPercentage: number;
}

/**
 * HistoryManager handles play history tracking and management
 */
export class HistoryManager {
  private static instance: HistoryManager;

  public static getInstance(): HistoryManager {
    if (!HistoryManager.instance) {
      HistoryManager.instance = new HistoryManager();
    }
    return HistoryManager.instance;
  }

  private constructor() {}

  // ==========================================
  // History Management
  // ==========================================

  /**
   * Add track to play history when it starts playing
   */
  async addToHistory(track: BibleTrack): Promise<void> {
    try {
      if (!powerSyncSystem.isInitialized) {
        logger.warn(
          ENABLE_LOGGING,
          'PowerSync not initialized, skipping history add'
        );
        return;
      }

      const trackId = `${track.chapterId}_${track.audioVersionId}`;

      // Check if this track is already in recent history (last 5 minutes)
      const recentHistory = await powerSyncSystem.getAll(
        `SELECT id FROM play_history 
         WHERE track_id = ? AND started_at > datetime('now', '-5 minutes')
         ORDER BY started_at DESC LIMIT 1`,
        [trackId]
      );

      if (recentHistory.length > 0) {
        // Track already in recent history, skipping duplicate (reduced logging)
        return;
      }

      const historyId = `${trackId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // DEBUG: Log what we're about to save to history
      const historyData = {
        historyId,
        trackId,
        chapterId: track.chapterId,
        audioVersionId: track.audioVersionId || '',
        languageEntityId: track['languageEntityId'] || '',
        startedAt: new Date().toISOString(),
        duration: track.duration || 0,
        trackTitle: track.title,
      };

      logger.info(
        ENABLE_LOGGING,
        '[HistoryManager] Saving to history:',
        historyData
      );

      await powerSyncSystem.execute(
        `INSERT INTO play_history (
          id, track_id, chapter_id, audio_version_id, language_entity_id,
          started_at, last_position_seconds, duration_seconds, completion_percentage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historyId,
          trackId,
          track.chapterId,
          track.audioVersionId || '',
          track['languageEntityId'] || '',
          new Date().toISOString(),
          0, // Start at beginning
          track.duration || 0,
          0, // 0% completion initially
        ]
      );

      logger.info(ENABLE_LOGGING, `✅ Added track to history: ${track.title}`);

      // Clean up old history entries if needed
      await this.cleanupOldHistory();
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error adding to history:', error);
    }
  }

  /**
   * Update history progress for current track
   */
  async updateHistoryProgress(
    trackId: string,
    position: number,
    duration: number,
    isCompleted: boolean = false
  ): Promise<void> {
    try {
      if (!powerSyncSystem.isInitialized) {
        return;
      }

      const completionPercentage =
        duration > 0 ? Math.min(1.0, position / duration) : 0;
      const completedAt = isCompleted ? new Date().toISOString() : null;

      // Find the most recent history entry for this track
      const result = await powerSyncSystem.getAll(
        `SELECT id FROM play_history 
         WHERE track_id = ? 
         ORDER BY started_at DESC 
         LIMIT 1`,
        [trackId]
      );

      if (result.length > 0) {
        const historyId = (result[0] as { id: string }).id;

        const updateQuery = completedAt
          ? `UPDATE play_history SET 
               last_position_seconds = ?, 
               completion_percentage = ?,
               completed_at = ?
             WHERE id = ?`
          : `UPDATE play_history SET 
               last_position_seconds = ?, 
               completion_percentage = ?
             WHERE id = ?`;

        const params = completedAt
          ? [position, completionPercentage, completedAt, historyId]
          : [position, completionPercentage, historyId];

        await powerSyncSystem.execute(updateQuery, params);
      }
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error updating history progress:', error);
    }
  }

  /**
   * Mark track as completed in history
   */
  async markTrackCompleted(
    trackId: string,
    finalPosition: number,
    duration: number
  ): Promise<void> {
    await this.updateHistoryProgress(trackId, finalPosition, duration, true);
    logger.info(ENABLE_LOGGING, `Marked track as completed: ${trackId}`);
  }

  /**
   * Get play history with metadata
   */
  async getHistory(limit: number = 50): Promise<HistoryItem[]> {
    try {
      if (!powerSyncSystem.isInitialized) {
        return [];
      }

      // Get basic history data first
      const result = await powerSyncSystem.getAll(
        `SELECT 
          ph.id, ph.track_id, ph.chapter_id, ph.audio_version_id, ph.language_entity_id,
          ph.started_at, ph.completed_at, ph.last_position_seconds, 
          ph.duration_seconds, ph.completion_percentage,
          b.name || ' ' || c.chapter_number as title
        FROM play_history ph
        JOIN chapters c ON c.id = ph.chapter_id
        JOIN books b ON b.id = c.book_id
        ORDER BY ph.started_at DESC
        LIMIT ?`,
        [limit]
      );

      // Get audio version info for each history item using centralized service
      const { audioVersionService } = await import('./AudioVersionService');
      const enrichedResults = [];

      for (const row of result as Array<{
        id: string;
        track_id: string;
        chapter_id: string;
        audio_version_id: string;
        language_entity_id: string;
        started_at: string;
        completed_at?: string;
        last_position_seconds: number;
        duration_seconds: number;
        completion_percentage: number;
        title: string;
      }>) {
        const audioVersionInfo = await audioVersionService.getAudioVersionInfo(
          row.audio_version_id
        );

        // DEBUG: Log what AudioVersionService returned
        logger.info(
          ENABLE_LOGGING,
          '[HistoryManager] AudioVersionService result:',
          {
            audioVersionId: row.audio_version_id,
            audioVersionInfo: audioVersionInfo
              ? {
                  id: audioVersionInfo.id,
                  name: audioVersionInfo.name,
                  languageEntityId: audioVersionInfo.languageEntityId,
                  languageName: audioVersionInfo.languageName,
                }
              : null,
            finalLanguageName:
              audioVersionInfo?.languageName || 'Unknown Language',
          }
        );

        enrichedResults.push({
          ...row,
          audio_version_name: audioVersionInfo?.name || 'Unknown Version',
          language_name: audioVersionInfo?.languageName || 'Unknown Language',
        });
      }

      // DEBUG: Log what we retrieved from the database
      logger.info(ENABLE_LOGGING, '[HistoryManager] Retrieved history data:', {
        resultCount: enrichedResults.length,
        sampleData: enrichedResults
          .slice(0, 2)
          .map(
            (row: {
              track_id: string;
              audio_version_id: string;
              language_entity_id: string;
              audio_version_name: string;
              language_name: string;
              title: string;
            }) => ({
              trackId: row.track_id,
              audioVersionId: row.audio_version_id,
              languageEntityId: row.language_entity_id,
              audioVersionName: row.audio_version_name,
              languageName: row.language_name,
              title: row.title,
            })
          ),
      });

      return enrichedResults.map(row => ({
        id: row.id,
        trackId: row.track_id,
        chapterId: row.chapter_id,
        audioVersionId: row.audio_version_id,
        languageEntityId: row.language_entity_id,
        title: row.title,
        subtitle: `${row.language_name || row.language_entity_id || 'Unknown'} - ${row.audio_version_name || 'Unknown'}`,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        lastPositionSeconds: row.last_position_seconds || 0,
        durationSeconds: row.duration_seconds || 0,
        completionPercentage: row.completion_percentage || 0,
      }));
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error getting history:', error);
      return [];
    }
  }

  /**
   * Get history for a specific chapter
   */
  async getChapterHistory(
    chapterId: string,
    limit: number = 10
  ): Promise<HistoryItem[]> {
    try {
      if (!powerSyncSystem.isInitialized) {
        return [];
      }

      const result = await powerSyncSystem.getAll(
        `SELECT 
          ph.id, ph.track_id, ph.chapter_id, ph.audio_version_id, ph.language_entity_id,
          ph.started_at, ph.completed_at, ph.last_position_seconds, 
          ph.duration_seconds, ph.completion_percentage,
          b.name || ' ' || c.chapter_number as title,
          av.name as audio_version_name,
          vll.language_entity_name as language_name
        FROM play_history ph
        JOIN chapters c ON c.id = ph.chapter_id
        JOIN books b ON b.id = c.book_id
        LEFT JOIN audio_versions av ON av.id = ph.audio_version_id
        LEFT JOIN version_language_lookup vll ON (
          vll.version_type = 'audio' AND vll.version_id = av.id
        )
        WHERE ph.chapter_id = ?
        ORDER BY ph.started_at DESC
        LIMIT ?`,
        [chapterId, limit]
      );

      return (
        result as Array<{
          id: string;
          track_id: string;
          chapter_id: string;
          audio_version_id: string;
          language_entity_id: string;
          started_at: string;
          completed_at?: string;
          last_position_seconds: number;
          duration_seconds: number;
          completion_percentage: number;
          title: string;
          audio_version_name: string;
          language_name: string;
        }>
      ).map(row => ({
        id: row.id,
        trackId: row.track_id,
        chapterId: row.chapter_id,
        audioVersionId: row.audio_version_id,
        languageEntityId: row.language_entity_id,
        title: row.title,
        subtitle: `${row.language_name || row.language_entity_id || 'Unknown'} - ${row.audio_version_name || 'Unknown'}`,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        lastPositionSeconds: row.last_position_seconds || 0,
        durationSeconds: row.duration_seconds || 0,
        completionPercentage: row.completion_percentage || 0,
      }));
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error getting chapter history:', error);
      return [];
    }
  }

  /**
   * Clear all history
   */
  async clearHistory(): Promise<void> {
    try {
      if (!powerSyncSystem.isInitialized) {
        return;
      }

      await powerSyncSystem.execute(`DELETE FROM play_history`);
      logger.info(ENABLE_LOGGING, 'Cleared all play history');
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error clearing history:', error);
    }
  }

  /**
   * Remove specific history entry
   */
  async removeHistoryEntry(historyId: string): Promise<void> {
    try {
      if (!powerSyncSystem.isInitialized) {
        return;
      }

      await powerSyncSystem.execute(`DELETE FROM play_history WHERE id = ?`, [
        historyId,
      ]);

      logger.info(ENABLE_LOGGING, `Removed history entry: ${historyId}`);
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error removing history entry:', error);
    }
  }

  /**
   * Get recently played chapters (unique chapters only)
   */
  async getRecentChapters(limit: number = 20): Promise<HistoryItem[]> {
    try {
      if (!powerSyncSystem.isInitialized) {
        return [];
      }

      const result = await powerSyncSystem.getAll(
        `SELECT 
          ph.id, ph.track_id, ph.chapter_id, ph.audio_version_id, ph.language_entity_id,
          ph.started_at, ph.completed_at, ph.last_position_seconds, 
          ph.duration_seconds, ph.completion_percentage,
          b.name || ' ' || c.chapter_number as title,
          av.name as audio_version_name,
          vll.language_entity_name as language_name
        FROM play_history ph
        JOIN chapters c ON c.id = ph.chapter_id
        JOIN books b ON b.id = c.book_id
        LEFT JOIN audio_versions av ON av.id = ph.audio_version_id
        LEFT JOIN version_language_lookup vll ON (
          vll.version_type = 'audio' AND vll.version_id = av.id
        )
        WHERE ph.id IN (
          SELECT id FROM play_history ph2 
          WHERE ph2.chapter_id = ph.chapter_id 
          ORDER BY ph2.started_at DESC 
          LIMIT 1
        )
        ORDER BY ph.started_at DESC
        LIMIT ?`,
        [limit]
      );

      return (
        result as Array<{
          id: string;
          track_id: string;
          chapter_id: string;
          audio_version_id: string;
          language_entity_id: string;
          started_at: string;
          completed_at?: string;
          last_position_seconds: number;
          duration_seconds: number;
          completion_percentage: number;
          title: string;
          audio_version_name: string;
          language_name: string;
        }>
      ).map(row => ({
        id: row.id,
        trackId: row.track_id,
        chapterId: row.chapter_id,
        audioVersionId: row.audio_version_id,
        languageEntityId: row.language_entity_id,
        title: row.title,
        subtitle: `${row.language_name || row.language_entity_id || 'Unknown'} - ${row.audio_version_name || 'Unknown'}`,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        lastPositionSeconds: row.last_position_seconds || 0,
        durationSeconds: row.duration_seconds || 0,
        completionPercentage: row.completion_percentage || 0,
      }));
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error getting recent chapters:', error);
      return [];
    }
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  /**
   * Clean up old history entries based on retention limit
   */
  private async cleanupOldHistory(): Promise<void> {
    try {
      // Default retention limit (removed queueManager dependency)
      const retentionLimit = 1000; // Keep last 1000 history entries

      // Count current history entries
      const countResult = await powerSyncSystem.getAll(
        `SELECT COUNT(*) as count FROM play_history`
      );

      const currentCount = (countResult[0] as { count: number }).count;

      if (currentCount > retentionLimit) {
        const excessCount = currentCount - retentionLimit;

        // Delete oldest entries
        await powerSyncSystem.execute(
          `DELETE FROM play_history 
           WHERE id IN (
             SELECT id FROM play_history 
             ORDER BY started_at ASC 
             LIMIT ?
           )`,
          [excessCount]
        );

        logger.info(
          ENABLE_LOGGING,
          `Cleaned up ${excessCount} old history entries`
        );
      }
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error cleaning up old history:', error);
    }
  }

  /**
   * Get history statistics
   */
  async getHistoryStats(): Promise<{
    totalTracks: number;
    completedTracks: number;
    totalListeningTime: number;
    averageCompletion: number;
  }> {
    try {
      if (!powerSyncSystem.isInitialized) {
        return {
          totalTracks: 0,
          completedTracks: 0,
          totalListeningTime: 0,
          averageCompletion: 0,
        };
      }

      const result = await powerSyncSystem.getAll(
        `SELECT 
          COUNT(*) as total_tracks,
          COUNT(completed_at) as completed_tracks,
          SUM(last_position_seconds) as total_listening_time,
          AVG(completion_percentage) as average_completion
        FROM play_history`
      );

      const row = result[0] as {
        total_tracks: number;
        completed_tracks: number;
        total_listening_time: number;
        average_completion: number;
      };
      return {
        totalTracks: row.total_tracks || 0,
        completedTracks: row.completed_tracks || 0,
        totalListeningTime: row.total_listening_time || 0,
        averageCompletion: row.average_completion || 0,
      };
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error getting history stats:', error);
      return {
        totalTracks: 0,
        completedTracks: 0,
        totalListeningTime: 0,
        averageCompletion: 0,
      };
    }
  }
}

// Export singleton instance
export const historyManager = HistoryManager.getInstance();
