import { logger } from '@/shared/utils/logger';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';

// Logging configuration for this module
const ENABLE_LOGGING = false;

/**
 * Centralized service for getting audio version information
 * Single source of truth for all audio version data queries
 */
export class AudioVersionService {
  private static instance: AudioVersionService;

  // Cache for language entity ID to name mapping
  private languageNameCache = new Map<string, string>();

  private constructor() {}

  static getInstance(): AudioVersionService {
    if (!AudioVersionService.instance) {
      AudioVersionService.instance = new AudioVersionService();
    }
    return AudioVersionService.instance;
  }

  /**
   * Populate language name cache from version_language_lookup table
   */
  private async populateLanguageCache(): Promise<void> {
    try {
      logger.info(
        ENABLE_LOGGING,
        '[AudioVersionService] Populating language cache...'
      );

      const languageMappings = await powerSyncSystem.getAll(
        `SELECT DISTINCT language_entity_id, language_entity_name, language_alias_name 
         FROM version_language_lookup 
         WHERE language_entity_id IS NOT NULL 
         AND (language_entity_name IS NOT NULL OR language_alias_name IS NOT NULL)`
      );

      logger.info(
        ENABLE_LOGGING,
        '[AudioVersionService] Found language mappings:',
        {
          count: languageMappings.length,
          mappings: languageMappings
            .slice(0, 3)
            .map(
              (m: {
                language_entity_id: string;
                language_entity_name: string;
                language_alias_name: string;
              }) => ({
                languageEntityId: m.language_entity_id,
                languageEntityName: m.language_entity_name,
                languageAliasName: m.language_alias_name,
              })
            ),
        }
      );

      for (const mapping of languageMappings as Array<{
        language_entity_id: string;
        language_entity_name: string;
        language_alias_name: string;
      }>) {
        const languageName =
          mapping.language_alias_name || mapping.language_entity_name;
        if (languageName && mapping.language_entity_id) {
          this.languageNameCache.set(mapping.language_entity_id, languageName);
        }
      }

      logger.info(
        ENABLE_LOGGING,
        `[AudioVersionService] ✅ Populated language cache with ${this.languageNameCache.size} entries`
      );
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Failed to populate language cache:', error);
    }
  }

  /**
   * Get language name from cache or fallback to version name
   */
  private async getLanguageName(
    languageEntityId: string,
    versionName: string
  ): Promise<string> {
    // Check cache first
    if (this.languageNameCache.has(languageEntityId)) {
      return this.languageNameCache.get(languageEntityId)!;
    }

    // If cache is empty, try to populate it
    if (this.languageNameCache.size === 0) {
      await this.populateLanguageCache();
    }

    // Check cache again after population
    if (this.languageNameCache.has(languageEntityId)) {
      return this.languageNameCache.get(languageEntityId)!;
    }

    // Fallback to version name
    return versionName || 'Unknown Language';
  }

  /**
   * Get complete audio version information by ID
   * This is the single source of truth for audio version data
   */
  async getAudioVersionInfo(audioVersionId: string): Promise<{
    id: string;
    name: string;
    languageEntityId: string;
    languageName: string;
    createdAt: string;
    updatedAt: string;
  } | null> {
    try {
      if (!powerSyncSystem.isInitialized) {
        logger.warn(
          ENABLE_LOGGING,
          'PowerSync not initialized, cannot get audio version info'
        );
        return null;
      }

      // First, get basic info from audio_versions table (always available offline)
      const audioVersion = await powerSyncSystem.get(
        `SELECT id, name, language_entity_id, created_at, updated_at 
         FROM audio_versions 
         WHERE id = ? AND deleted_at IS NULL 
         LIMIT 1`,
        [audioVersionId]
      );

      if (!audioVersion) {
        logger.warn(
          ENABLE_LOGGING,
          `Audio version not found: ${audioVersionId}`
        );
        return null;
      }

      // Get language name using improved resolution
      const languageName = await this.getLanguageName(
        audioVersion.language_entity_id || '',
        audioVersion.name || ''
      );

      // DEBUG: Log language resolution process
      logger.info(
        ENABLE_LOGGING,
        '[AudioVersionService] Language resolution:',
        {
          audioVersionId,
          languageEntityId: audioVersion.language_entity_id,
          versionName: audioVersion.name,
          resolvedLanguageName: languageName,
          cacheSize: this.languageNameCache.size,
          hasInCache: this.languageNameCache.has(
            audioVersion.language_entity_id || ''
          ),
        }
      );

      const result = {
        id: audioVersion.id,
        name: audioVersion.name || 'Unknown Version',
        languageEntityId: audioVersion.language_entity_id || '',
        languageName,
        createdAt: audioVersion.created_at || new Date().toISOString(),
        updatedAt:
          audioVersion.updated_at ||
          audioVersion.created_at ||
          new Date().toISOString(),
      };

      logger.debug(
        ENABLE_LOGGING,
        `[AudioVersionService] Retrieved audio version info:`,
        {
          id: result.id,
          name: result.name,
          languageEntityId: result.languageEntityId,
          languageName: result.languageName,
        }
      );

      return result;
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error getting audio version info:', error);
      return null;
    }
  }

  /**
   * Get multiple audio versions by IDs
   */
  async getMultipleAudioVersions(audioVersionIds: string[]): Promise<
    Array<{
      id: string;
      name: string;
      languageEntityId: string;
      languageName: string;
      createdAt: string;
      updatedAt: string;
    }>
  > {
    const results = [];

    for (const id of audioVersionIds) {
      const info = await this.getAudioVersionInfo(id);
      if (info) {
        results.push(info);
      }
    }

    return results;
  }

  /**
   * Manually populate language cache (useful for initialization)
   */
  async initializeLanguageCache(): Promise<void> {
    await this.populateLanguageCache();
  }

  /**
   * Get all available audio versions (for selection purposes)
   */
  async getAllAudioVersions(limit: number = 50): Promise<
    Array<{
      id: string;
      name: string;
      languageEntityId: string;
      languageName: string;
      createdAt: string;
      updatedAt: string;
    }>
  > {
    try {
      if (!powerSyncSystem.isInitialized) {
        return [];
      }

      const audioVersions = await powerSyncSystem.getAll(
        `SELECT id, name, language_entity_id, created_at, updated_at 
         FROM audio_versions 
         WHERE deleted_at IS NULL 
         ORDER BY created_at ASC 
         LIMIT ?`,
        [limit]
      );

      const results = [];
      for (const version of audioVersions as Array<{
        id: string;
        name: string;
        language_entity_id: string;
        created_at: string;
        updated_at: string;
      }>) {
        const info = await this.getAudioVersionInfo(version.id);
        if (info) {
          results.push(info);
        }
      }

      return results;
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error getting all audio versions:', error);
      return [];
    }
  }
}

// Export singleton instance
export const audioVersionService = AudioVersionService.getInstance();
