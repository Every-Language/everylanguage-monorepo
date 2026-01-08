import { logger } from '../../../shared/utils/logger';
import { AudioVersion, TextVersion } from '../types/entities';
import { powerSyncSystem } from '../../../shared/services/powersync/PowerSyncSystem';
import { queryLogger } from '@/shared/utils/queryLogger';
import { useAuthStore } from '@/shared/store/authStore';

// Logging configuration for this module
const ENABLE_LOGGING = false;

import { generateUUID } from '@/shared/utils/uuid';

/**
 * Service for managing user saved versions and current selections using PowerSync
 * Uses the correct schema tables:
 * - user_saved_audio_versions / user_saved_text_versions for saved versions
 * - user_current_selections for current audio/text version selection
 */
export class UserVersionsService {
  private static instance: UserVersionsService;

  // Cached user id (read lazily from auth store to avoid heavy lookups/logging)
  private currentUserId: string | null = null;

  private constructor() {
    try {
      const state = useAuthStore.getState();
      this.currentUserId = state.userId ?? null;
    } catch (error) {
      logger.warn(
        ENABLE_LOGGING,
        'UserVersionsService: Failed to read initial auth state',
        error
      );
      this.currentUserId = null;
    }
  }

  static getInstance(): UserVersionsService {
    if (!UserVersionsService.instance) {
      UserVersionsService.instance = new UserVersionsService();
    }
    return UserVersionsService.instance;
  }

  /** Ensure DB is ready before executing queries */
  private ensureDbReady(): void {
    if (!powerSyncSystem.isInitialized) {
      throw new Error('PowerSync database not initialized');
    }
  }

  /** Get the current user's auth ID from cached auth store */
  private getCurrentUserId(): string | null {
    try {
      const state = useAuthStore.getState();
      this.currentUserId = state.userId ?? null;
      return this.currentUserId;
    } catch {
      return this.currentUserId ?? null;
    }
  }

  /** Get authenticated user id or throw with a helpful message for write ops */
  private requireUserIdOrThrow(actionDescription: string): string {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error(
        `Authentication required to ${actionDescription}. Please sign in to sync your data.`
      );
    }
    return userId;
  }

  /**
   * Add a version to user's saved versions
   */
  async addSavedVersion(
    version: AudioVersion | TextVersion,
    type: 'audio' | 'text'
  ): Promise<void> {
    try {
      this.ensureDbReady();

      // DEBUG: Log what version we're adding
      logger.info(
        ENABLE_LOGGING,
        '[UserVersionsService] addSavedVersion called:',
        {
          versionId: version.id,
          versionName: version.name,
          versionType: type,
          languageEntityId: version.languageEntityId,
          languageName: version.languageName,
          hasLanguageName: !!version.languageName,
          versionKeys: Object.keys(version),
        }
      );
      const userId = this.requireUserIdOrThrow('save versions');

      // Check if already exists
      const table =
        type === 'audio'
          ? 'user_saved_audio_versions'
          : 'user_saved_text_versions';
      const versionColumn =
        type === 'audio' ? 'audio_version_id' : 'text_version_id';

      const existingQuery = `SELECT * FROM ${table} WHERE user_id = ? AND ${versionColumn} = ?`;
      const existingResults = await queryLogger.logQuery(
        'user-versions-service',
        existingQuery,
        async () => {
          return await powerSyncSystem.getAll(existingQuery, [
            userId,
            version.id,
          ]);
        }
      );

      if (existingResults.length > 0) {
        logger.info(
          ENABLE_LOGGING,
          `${type} version already saved:`,
          version.name
        );
      } else {
        // Create new saved version record
        const recordId = generateUUID();
        const timestamp = new Date().toISOString();

        const insertQuery = `INSERT INTO ${table} (id, user_id, ${versionColumn}, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`;
        const insertParams = [
          recordId,
          userId,
          version.id,
          timestamp,
          timestamp,
        ];

        await powerSyncSystem.execute(insertQuery, insertParams);
      }

      // Write-through seed for downloads table on audio
      if (type === 'audio') {
        try {
          await powerSyncSystem.execute(
            `INSERT INTO user_saved_audio_versions_downloads (id, audio_version_id, created_at)
             SELECT ?, ?, ? WHERE NOT EXISTS (
                SELECT 1 FROM user_saved_audio_versions_downloads WHERE audio_version_id = ?
              )`,
            [generateUUID(), version.id, new Date().toISOString(), version.id]
          );
          const rows = (await powerSyncSystem.getAll(
            `SELECT audio_version_id, created_at FROM user_saved_audio_versions_downloads ORDER BY created_at DESC`
          )) as Array<{ audio_version_id: string; created_at: string }>;
          logger.info(
            ENABLE_LOGGING,
            'UserVersionsService: seeded downloads table after addSavedVersion',
            rows
          );
        } catch (seedErr) {
          logger.warn(
            ENABLE_LOGGING,
            'UserVersionsService: failed to seed downloads table',
            seedErr
          );
        }
      }

      // Cache language labels locally for display (no remote schema changes)
      try {
        const now = new Date().toISOString();

        // DEBUG: Log what we're about to save to version_language_lookup
        logger.info(
          ENABLE_LOGGING,
          '[UserVersionsService] Adding to version_language_lookup:',
          {
            versionId: version.id,
            versionType: type,
            languageEntityId: version.languageEntityId,
            languageName: version.languageName,
            versionName: version.name,
            hasLanguageName: !!version.languageName,
          }
        );

        await powerSyncSystem.execute(
          `INSERT OR IGNORE INTO version_language_lookup (id, version_type, version_id, language_entity_id, language_entity_name, language_alias_name, region_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateUUID(),
            type,
            version.id,
            version.languageEntityId,
            version.languageName || version.name || 'Unknown Language', // Use version.name as fallback
            version.languageName || version.name || 'Unknown Language', // Use version.name as fallback
            null,
            now,
            now,
          ]
        );

        logger.info(
          ENABLE_LOGGING,
          '[UserVersionsService] ✅ Successfully added to version_language_lookup'
        );
      } catch (cacheErr) {
        logger.warn(
          ENABLE_LOGGING,
          'UserVersionsService: failed to cache language label',
          cacheErr
        );
      }
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Error adding saved version to PowerSync:',
        error
      );
      throw new Error(`Failed to save ${type} version`);
    }
  }

  /**
   * Remove a version from user's saved versions
   */
  async removeSavedVersion(
    versionId: string,
    type: 'audio' | 'text'
  ): Promise<void> {
    try {
      this.ensureDbReady();
      const userId = this.requireUserIdOrThrow('manage saved versions');

      const table =
        type === 'audio'
          ? 'user_saved_audio_versions'
          : 'user_saved_text_versions';
      const versionColumn =
        type === 'audio' ? 'audio_version_id' : 'text_version_id';

      const deleteQuery = `DELETE FROM ${table} WHERE user_id = ? AND ${versionColumn} = ?`;
      await powerSyncSystem.execute(deleteQuery, [userId, versionId]);

      // logger.info(ENABLE_LOGGING, `Removed ${type} version from PowerSync:`, versionId, {
      //   userId,
      // });
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Error removing saved version from PowerSync:',
        error
      );
      throw new Error(`Failed to remove ${type} version`);
    }
  }

  /**
   * Get all saved versions for the current user
   */
  async getSavedVersions(): Promise<{
    audio: AudioVersion[];
    text: TextVersion[];
  }> {
    try {
      this.ensureDbReady();

      const userId = this.getCurrentUserId();
      if (!userId) {
        logger.info(
          ENABLE_LOGGING,
          'No user session found, returning empty results'
        );
        return { audio: [], text: [] };
      }

      // Get audio versions with details
      const audioQuery = `
        SELECT usav.*, av.name, av.language_entity_id, av.created_at as version_created_at
        FROM user_saved_audio_versions usav
        JOIN audio_versions av ON usav.audio_version_id = av.id
        WHERE usav.user_id = ?
        ORDER BY usav.created_at DESC
      `;

      // Get text versions with details
      const textQuery = `
        SELECT ustv.*, tv.name, tv.language_entity_id, tv.created_at as version_created_at
        FROM user_saved_text_versions ustv
        JOIN text_versions tv ON ustv.text_version_id = tv.id
        WHERE ustv.user_id = ?
        ORDER BY ustv.created_at DESC
      `;

      const [audioResults, textResults] = await Promise.all([
        powerSyncSystem.getAll(audioQuery, [userId]),
        powerSyncSystem.getAll(textQuery, [userId]),
      ]);

      // Convert to internal format with language name lookup
      type SavedAudioRow = {
        audio_version_id: string;
        name: string;
        language_entity_id: string;
        version_created_at: string;
      };
      const audioVersions: AudioVersion[] = [];
      for (const row of audioResults as SavedAudioRow[]) {
        let languageName = '';
        try {
          const langRows = await powerSyncSystem.getAll(
            `SELECT language_alias_name, language_entity_name FROM version_language_lookup WHERE version_type = 'audio' AND version_id = ? LIMIT 1`,
            [row.audio_version_id]
          );
          if (langRows && langRows.length > 0) {
            languageName =
              langRows[0].language_alias_name ||
              langRows[0].language_entity_name ||
              '';
          }
        } catch {
          // ignore lookup failure
        }
        audioVersions.push({
          id: row.audio_version_id,
          name: row.name,
          languageEntityId: row.language_entity_id,
          languageName,
          mediaFileCount: 0,
          createdAt: row.version_created_at,
          updatedAt: row.version_created_at,
        });
      }

      type SavedTextRow = {
        text_version_id: string;
        name: string;
        language_entity_id: string;
        version_created_at: string;
      };
      const textVersions: TextVersion[] = [];
      for (const row of textResults as SavedTextRow[]) {
        let languageName = '';
        try {
          const langRows = await powerSyncSystem.getAll(
            `SELECT language_alias_name, language_entity_name FROM version_language_lookup WHERE version_type = 'text' AND version_id = ? LIMIT 1`,
            [row.text_version_id]
          );
          if (langRows && langRows.length > 0) {
            languageName =
              langRows[0].language_alias_name ||
              langRows[0].language_entity_name ||
              '';
          }
        } catch {
          // ignore lookup failure
        }
        textVersions.push({
          id: row.text_version_id,
          name: row.name,
          languageEntityId: row.language_entity_id,
          languageName,
          source: 'project' as const,
          verseCount: 0,
          createdAt: row.version_created_at,
          updatedAt: row.version_created_at,
        });
      }

      return {
        audio: audioVersions,
        text: textVersions,
      };
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Error getting saved versions from PowerSync:',
        error
      );
      return { audio: [], text: [] };
    }
  }

  /**
   * Check if a version is saved by the current user
   */
  async isVersionSaved(
    versionId: string,
    type: 'audio' | 'text'
  ): Promise<boolean> {
    try {
      this.ensureDbReady();

      const userId = this.getCurrentUserId();
      if (!userId) return false;

      const table =
        type === 'audio'
          ? 'user_saved_audio_versions'
          : 'user_saved_text_versions';
      const versionColumn =
        type === 'audio' ? 'audio_version_id' : 'text_version_id';

      const query = `SELECT COUNT(*) as count FROM ${table} WHERE user_id = ? AND ${versionColumn} = ?`;
      const results = (await powerSyncSystem.getAll(query, [
        userId,
        versionId,
      ])) as { count: number }[];
      const result = results.length > 0 ? results[0] : { count: 0 };

      return (result?.count || 0) > 0;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Error checking if version is saved in PowerSync:',
        error
      );
      return false;
    }
  }

  /**
   * Get current selections for the user
   */
  async getCurrentSelections(): Promise<{
    audio: AudioVersion | null;
    text: TextVersion | null;
  }> {
    try {
      this.ensureDbReady();

      const userId = this.getCurrentUserId();
      if (!userId) {
        return { audio: null, text: null };
      }

      // Get current selections with version details
      const query = `
        SELECT 
          ucs.*,
          av.name as audio_name,
          av.language_entity_id as audio_language_entity_id,
          av.created_at as audio_created_at,
          tv.name as text_name,
          tv.language_entity_id as text_language_entity_id,
          tv.created_at as text_created_at
        FROM user_current_selections ucs
        LEFT JOIN audio_versions av ON ucs.selected_audio_version = av.id
        LEFT JOIN text_versions tv ON ucs.selected_text_version = tv.id
        WHERE ucs.user_id = ?
        LIMIT 1
      `;

      const results = await powerSyncSystem.getAll(query, [userId]);
      const result = results.length > 0 ? results[0] : null;

      if (!result) {
        return { audio: null, text: null };
      }

      // Resolve language names from local cache for consistent display
      type LangRow = {
        language_alias_name: string | null;
        language_entity_name: string | null;
      };
      let audioLanguageName = '';
      if (result.selected_audio_version) {
        try {
          const langRows = (await powerSyncSystem.getAll(
            `SELECT language_alias_name, language_entity_name FROM version_language_lookup WHERE version_type = 'audio' AND version_id = ? LIMIT 1`,
            [result.selected_audio_version]
          )) as LangRow[];
          if (langRows.length > 0) {
            const first: LangRow | undefined = langRows[0];
            if (first) {
              audioLanguageName =
                first.language_alias_name || first.language_entity_name || '';
            }
          }
        } catch (e) {
          logger.debug(
            ENABLE_LOGGING,
            'getCurrentSelections: failed to resolve audio language',
            e
          );
        }
      }

      const audioVersion = result.selected_audio_version
        ? {
            id: result.selected_audio_version,
            name: result.audio_name || '',
            languageEntityId: result.audio_language_entity_id || '',
            languageName: audioLanguageName,
            mediaFileCount: 0,
            createdAt: result.audio_created_at || '',
            updatedAt: result.audio_created_at || '',
          }
        : null;

      let textLanguageName = '';
      if (result.selected_text_version) {
        try {
          const langRows = (await powerSyncSystem.getAll(
            `SELECT language_alias_name, language_entity_name FROM version_language_lookup WHERE version_type = 'text' AND version_id = ? LIMIT 1`,
            [result.selected_text_version]
          )) as LangRow[];
          if (langRows.length > 0) {
            const first: LangRow | undefined = langRows[0];
            if (first) {
              textLanguageName =
                first.language_alias_name || first.language_entity_name || '';
            }
          }
        } catch (e) {
          logger.debug(
            ENABLE_LOGGING,
            'getCurrentSelections: failed to resolve text language',
            e
          );
        }
      }

      const textVersion = result.selected_text_version
        ? {
            id: result.selected_text_version,
            name: result.text_name || '',
            languageEntityId: result.text_language_entity_id || '',
            languageName: textLanguageName,
            source: 'project' as const,
            verseCount: 0,
            createdAt: result.text_created_at || '',
            updatedAt: result.text_created_at || '',
          }
        : null;

      return { audio: audioVersion, text: textVersion };
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error getting current selections:', error);
      return { audio: null, text: null };
    }
  }

  /**
   * Set current audio version selection
   */
  async setCurrentAudioVersion(version: AudioVersion | null): Promise<void> {
    await this.updateCurrentSelection('audio', version?.id || null);
    try {
      const id = version?.id || null;
      const uid = this.getCurrentUserId();
      logger.info(
        ENABLE_LOGGING,
        'UserVersionsService: setCurrentAudioVersion',
        {
          userId: uid,
          versionId: id,
        }
      );
      if (id) {
        try {
          await powerSyncSystem.execute(
            `INSERT INTO user_saved_audio_versions_downloads (id, audio_version_id, created_at)
             SELECT ?, ?, ? WHERE NOT EXISTS (
               SELECT 1 FROM user_saved_audio_versions_downloads WHERE audio_version_id = ?
             )`,
            [generateUUID(), id, new Date().toISOString(), id]
          );
          const rows = (await powerSyncSystem.getAll(
            `SELECT audio_version_id, created_at FROM user_saved_audio_versions_downloads ORDER BY created_at DESC`
          )) as Array<{ audio_version_id: string; created_at: string }>;
          logger.info(
            ENABLE_LOGGING,
            'UserVersionsService: seeded downloads table after setCurrentAudioVersion',
            rows
          );
        } catch (seedErr) {
          logger.warn(
            ENABLE_LOGGING,
            'UserVersionsService: failed to seed downloads table on setCurrentAudioVersion',
            seedErr
          );
        }
      }
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        'UserVersionsService: setCurrentAudioVersion logging failed',
        e
      );
    }
  }

  /**
   * Set current text version selection
   */
  async setCurrentTextVersion(version: TextVersion | null): Promise<void> {
    await this.updateCurrentSelection('text', version?.id || null);
  }

  /**
   * Update current selection for audio or text
   */
  private async updateCurrentSelection(
    type: 'audio' | 'text',
    versionId: string | null
  ): Promise<void> {
    this.ensureDbReady();

    const userId = this.requireUserIdOrThrow('set current selections');
    const timestamp = new Date().toISOString();

    try {
      // Check if user_current_selections record exists
      const existingQuery =
        'SELECT * FROM user_current_selections WHERE user_id = ?';
      const existingResults = await powerSyncSystem.getAll(existingQuery, [
        userId,
      ]);
      const existing = existingResults.length > 0 ? existingResults[0] : null;

      if (existing) {
        // Update existing record - only update the specific field
        const column =
          type === 'audio' ? 'selected_audio_version' : 'selected_text_version';
        const updateQuery = `UPDATE user_current_selections SET ${column} = ?, updated_at = ? WHERE user_id = ?`;
        await powerSyncSystem.execute(updateQuery, [
          versionId,
          timestamp,
          userId,
        ]);
      } else {
        // Create new record with both fields, setting the appropriate one
        const recordId = generateUUID();
        const audioVersionId = type === 'audio' ? versionId : null;
        const textVersionId = type === 'text' ? versionId : null;

        const insertQuery = `
          INSERT INTO user_current_selections (id, user_id, selected_audio_version, selected_text_version, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        const insertParams = [
          recordId,
          userId,
          audioVersionId,
          textVersionId,
          timestamp,
          timestamp,
        ];
        await powerSyncSystem.execute(insertQuery, insertParams);
      }

      // logger.info(ENABLE_LOGGING, `Updated current ${type} selection:`, { userId, versionId });
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        `Error setting current ${type} version:`,
        error
      );

      // If it's a unique constraint violation, try to handle it gracefully
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as { message: string }).message;
        if (
          errorMessage.includes('unique constraint') ||
          errorMessage.includes('duplicate key')
        ) {
          logger.warn(
            ENABLE_LOGGING,
            `Unique constraint violation detected, attempting to update existing record for ${type} selection`
          );

          // Try to update the existing record directly
          try {
            const column =
              type === 'audio'
                ? 'selected_audio_version'
                : 'selected_text_version';
            const updateQuery = `UPDATE user_current_selections SET ${column} = ?, updated_at = ? WHERE user_id = ?`;
            await powerSyncSystem.execute(updateQuery, [
              versionId,
              timestamp,
              userId,
            ]);
            // logger.info(ENABLE_LOGGING, //   `Successfully updated existing ${type} selection after constraint violation`
            // );
            return;
          } catch (updateError) {
            logger.error(
              ENABLE_LOGGING,
              `Failed to update existing record after constraint violation:`,
              updateError
            );
          }
        }
      }

      throw new Error(`Failed to set current ${type} version`);
    }
  }

  /**
   * Update both audio and text selections atomically (useful for preventing race conditions)
   */
  async updateCurrentSelections(
    audioVersionId: string | null,
    textVersionId: string | null
  ): Promise<void> {
    this.ensureDbReady();

    const userId = this.requireUserIdOrThrow('set current selections');
    const timestamp = new Date().toISOString();

    try {
      // Check if user_current_selections record exists
      const existingQuery =
        'SELECT * FROM user_current_selections WHERE user_id = ?';
      const existingResults = await powerSyncSystem.getAll(existingQuery, [
        userId,
      ]);
      const existing = existingResults.length > 0 ? existingResults[0] : null;

      if (existing) {
        // Update existing record with both values
        const updateQuery = `UPDATE user_current_selections SET selected_audio_version = ?, selected_text_version = ?, updated_at = ? WHERE user_id = ?`;
        await powerSyncSystem.execute(updateQuery, [
          audioVersionId,
          textVersionId,
          timestamp,
          userId,
        ]);
      } else {
        // Create new record with both fields
        const recordId = generateUUID();
        const insertQuery = `
          INSERT INTO user_current_selections (id, user_id, selected_audio_version, selected_text_version, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        const insertParams = [
          recordId,
          userId,
          audioVersionId,
          textVersionId,
          timestamp,
          timestamp,
        ];
        await powerSyncSystem.execute(insertQuery, insertParams);
      }

      logger.info(ENABLE_LOGGING, 'Updated current selections:', {
        userId,
        audioVersionId,
        textVersionId,
      });
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error setting current selections:', error);

      // Handle unique constraint violation
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as { message: string }).message;
        if (
          errorMessage.includes('unique constraint') ||
          errorMessage.includes('duplicate key')
        ) {
          logger.warn(
            ENABLE_LOGGING,
            'Unique constraint violation detected, attempting to update existing record'
          );

          try {
            const updateQuery = `UPDATE user_current_selections SET selected_audio_version = ?, selected_text_version = ?, updated_at = ? WHERE user_id = ?`;
            await powerSyncSystem.execute(updateQuery, [
              audioVersionId,
              textVersionId,
              timestamp,
              userId,
            ]);
            logger.info(
              ENABLE_LOGGING,
              'Successfully updated existing selections after constraint violation'
            );
            return;
          } catch (updateError) {
            logger.error(
              ENABLE_LOGGING,
              'Failed to update existing record after constraint violation:',
              updateError
            );
          }
        }
      }

      throw new Error('Failed to set current selections');
    }
  }

  /**
   * Watch saved versions for real-time updates (authenticated users only)
   */
  async watchSavedVersions() {
    const userId = this.getCurrentUserId();
    if (!userId) {
      // Return empty watcher for anonymous users
      return powerSyncSystem.watch(
        'SELECT NULL as type, NULL as version_id, NULL as name, NULL as language_entity_id, NULL as version_created_at WHERE 1=0'
      );
    }

    return powerSyncSystem.watch(
      `
      SELECT 
        'audio' as type,
        usav.audio_version_id as version_id,
        av.name,
        av.language_entity_id,
        av.created_at as version_created_at
      FROM user_saved_audio_versions usav
      JOIN audio_versions av ON usav.audio_version_id = av.id
      WHERE usav.user_id = ?
      UNION ALL
      SELECT 
        'text' as type,
        ustv.text_version_id as version_id,
        tv.name,
        tv.language_entity_id,
        tv.created_at as version_created_at
      FROM user_saved_text_versions ustv
      JOIN text_versions tv ON ustv.text_version_id = tv.id
      WHERE ustv.user_id = ?
      ORDER BY version_created_at DESC
    `,
      [userId, userId]
    );
  }

  /**
   * Watch current selections for real-time updates (authenticated users only)
   */
  async watchCurrentSelections() {
    const userId = this.getCurrentUserId();
    if (!userId) {
      // Return empty watcher for anonymous users
      return powerSyncSystem.watch(
        'SELECT NULL as user_id, NULL as selected_audio_version, NULL as selected_text_version, NULL as audio_name, NULL as audio_language_entity_id, NULL as text_name, NULL as text_language_entity_id WHERE 1=0'
      );
    }

    return powerSyncSystem.watch(
      `
      SELECT 
        ucs.*,
        av.name as audio_name,
        av.language_entity_id as audio_language_entity_id,
        tv.name as text_name,
        tv.language_entity_id as text_language_entity_id
      FROM user_current_selections ucs
      LEFT JOIN audio_versions av ON ucs.selected_audio_version = av.id
      LEFT JOIN text_versions tv ON ucs.selected_text_version = tv.id
      WHERE ucs.user_id = ?
    `,
      [userId]
    );
  }
}

// Export singleton instance
export const userVersionsService = UserVersionsService.getInstance();
