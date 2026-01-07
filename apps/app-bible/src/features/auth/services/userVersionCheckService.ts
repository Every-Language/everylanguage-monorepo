import { logger } from '../../../shared/utils/logger';
import { userVersionsService } from '../../languages/services/userVersionsService';
import { powerSyncSystem } from '../../../shared/services/powersync/PowerSyncSystem';

// Logging configuration for this module
const ENABLE_LOGGING = false;

export interface UserVersionCheckResult {
  needsVersionSelection: boolean;
  hasCurrentSelections: boolean;
  hasSavedVersions: boolean;
  hasDefaultVersions: boolean;
  reason?: string;
}

/**
 * Service to check if a user needs to select versions after sign-in
 */
export class UserVersionCheckService {
  private static instance: UserVersionCheckService;

  static getInstance(): UserVersionCheckService {
    if (!UserVersionCheckService.instance) {
      UserVersionCheckService.instance = new UserVersionCheckService();
    }
    return UserVersionCheckService.instance;
  }

  /**
   * Check if user needs version selection after sign-in
   */
  async checkUserVersionNeeds(userId: string): Promise<UserVersionCheckResult> {
    try {
      logger.info(
        ENABLE_LOGGING,
        'UserVersionCheckService: Checking version needs for user:',
        userId
      );

      // Check if user has current selections
      const currentSelections =
        await userVersionsService.getCurrentSelections();
      const hasCurrentSelections = !!(
        currentSelections.audio || currentSelections.text
      );

      // Check if user has saved versions
      const savedVersions = await userVersionsService.getSavedVersions();
      const hasSavedVersions =
        savedVersions.audio.length > 0 || savedVersions.text.length > 0;

      // Check if there are default versions available in the system
      const hasDefaultVersions = await this.checkDefaultVersionsAvailable();

      // Determine if user needs version selection
      let needsVersionSelection = false;
      let reason = '';

      if (!hasCurrentSelections && hasSavedVersions) {
        // User has saved versions but no current selections - they should pick
        needsVersionSelection = true;
        reason = 'User has saved versions but no current selections';
      } else if (
        !hasCurrentSelections &&
        !hasSavedVersions &&
        hasDefaultVersions
      ) {
        // User has no versions at all but defaults are available - they should pick
        needsVersionSelection = true;
        reason = 'User has no versions but defaults are available';
      } else if (
        !hasCurrentSelections &&
        !hasSavedVersions &&
        !hasDefaultVersions
      ) {
        // User has no versions and no defaults - they can't select anything
        needsVersionSelection = false;
        reason = 'No versions available in system';
      } else {
        // User already has current selections - no need to show modal
        needsVersionSelection = false;
        reason = 'User already has current version selections';
      }

      const result: UserVersionCheckResult = {
        needsVersionSelection,
        hasCurrentSelections,
        hasSavedVersions,
        hasDefaultVersions,
        reason,
      };

      logger.info(
        ENABLE_LOGGING,
        'UserVersionCheckService: Version check result:',
        result
      );
      return result;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'UserVersionCheckService: Error checking version needs:',
        error
      );

      // On error, assume user needs version selection if defaults are available
      const hasDefaultVersions = await this.checkDefaultVersionsAvailable();
      return {
        needsVersionSelection: hasDefaultVersions,
        hasCurrentSelections: false,
        hasSavedVersions: false,
        hasDefaultVersions,
        reason: 'Error occurred, defaulting to show version selection',
      };
    }
  }

  /**
   * Check if default versions are available in the system
   */
  private async checkDefaultVersionsAvailable(): Promise<boolean> {
    try {
      if (!powerSyncSystem.isInitialized) {
        return false;
      }

      // Check for any audio versions
      const audioQuery = 'SELECT COUNT(*) as count FROM audio_versions LIMIT 1';
      const audioResult = await powerSyncSystem.get(audioQuery);
      const hasAudio =
        audioResult && (audioResult as { count: number }).count > 0;

      // Check for any text versions
      const textQuery = 'SELECT COUNT(*) as count FROM text_versions LIMIT 1';
      const textResult = await powerSyncSystem.get(textQuery);
      const hasText = textResult && (textResult as { count: number }).count > 0;

      return hasAudio || hasText;
    } catch (error) {
      logger.warn(
        ENABLE_LOGGING,
        'UserVersionCheckService: Error checking default versions:',
        error
      );
      return false;
    }
  }

  /**
   * Get default versions for the user to select from
   */
  async getDefaultVersions(): Promise<{
    audio: Array<{ id: string; name: string; languageEntityId: string }>;
    text: Array<{ id: string; name: string; languageEntityId: string }>;
  }> {
    try {
      if (!powerSyncSystem.isInitialized) {
        return { audio: [], text: [] };
      }

      // Get first few audio versions
      const audioQuery = `
        SELECT id, name, language_entity_id 
        FROM audio_versions 
        ORDER BY created_at ASC 
        LIMIT 5
      `;
      const audioResults = await powerSyncSystem.getAll(audioQuery);

      // Get first few text versions
      const textQuery = `
        SELECT id, name, language_entity_id 
        FROM text_versions 
        ORDER BY created_at ASC 
        LIMIT 5
      `;
      const textResults = await powerSyncSystem.getAll(textQuery);

      return {
        audio: audioResults as Array<{
          id: string;
          name: string;
          languageEntityId: string;
        }>,
        text: textResults as Array<{
          id: string;
          name: string;
          languageEntityId: string;
        }>,
      };
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'UserVersionCheckService: Error getting default versions:',
        error
      );
      return { audio: [], text: [] };
    }
  }
}

export const userVersionCheckService = UserVersionCheckService.getInstance();
