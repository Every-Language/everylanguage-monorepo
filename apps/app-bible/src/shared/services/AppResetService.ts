import { logger } from '../utils/logger';
import { powerSyncSystem } from './powersync/PowerSyncSystem';
import { powerSyncConnectionManager } from './powersync/PowerSyncConnectionManager';
import { authService } from '../../features/auth/services/authService';
import { appInitializationService } from './AppInitializationService';
import { dataClearingService } from './DataClearingService';
import { signOutProgressService } from './SignOutProgressService';
// Store clearing is now handled by DataClearingService

// Logging configuration for this module
const ENABLE_LOGGING = false;

/**
 * Service responsible for completely resetting the app to a clean state
 * and reinitializing it from scratch
 */
class AppResetService {
  private static instance: AppResetService;

  public static getInstance(): AppResetService {
    if (!AppResetService.instance) {
      AppResetService.instance = new AppResetService();
    }
    return AppResetService.instance;
  }

  /**
   * Completely reset the app and reinitialize it from scratch
   * This ensures a clean slate for the user
   */
  public async resetApp(): Promise<void> {
    try {
      logger.info(
        ENABLE_LOGGING,
        '🔄 AppResetService: Starting complete app reset...'
      );

      // 1. Clear all data (files, database, stores)
      signOutProgressService.updateStep('Deleting downloaded files...', 40);
      await dataClearingService.clearAllData();

      // 2. Stop and reset PowerSync
      signOutProgressService.updateStep('Resetting database...', 60);
      await this.resetPowerSync();

      // 3. Clear media player state
      signOutProgressService.updateStep('Clearing media player...', 70);
      await this.resetMediaPlayer();

      // 4. Sign out and clear auth state
      signOutProgressService.updateStep('Signing out...', 80);
      await this.resetAuthState();

      // 5. Reinitialize the entire app from scratch
      signOutProgressService.updateStep('Reinitializing app...', 90);
      await appInitializationService.initializeApp();

      logger.info(
        ENABLE_LOGGING,
        '✅ AppResetService: Complete app reset finished successfully'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '💥 AppResetService: App reset failed:',
        error
      );
      throw error;
    }
  }

  /**
   * Reset PowerSync to clean state
   */
  private async resetPowerSync(): Promise<void> {
    try {
      logger.info(ENABLE_LOGGING, '🔄 Resetting PowerSync...');

      // Stop PowerSync connection
      await powerSyncConnectionManager.shutdown();

      // Clear PowerSync database
      if (powerSyncSystem.isInitialized) {
        // Note: PowerSync doesn't have a direct "clear all data" method
        // The database will be reinitialized fresh when we call initialize()
        logger.info(
          ENABLE_LOGGING,
          '📊 PowerSync will be reinitialized with fresh database'
        );
      }

      logger.info(ENABLE_LOGGING, '✅ PowerSync reset completed');
    } catch (error) {
      logger.error(ENABLE_LOGGING, '❌ Failed to reset PowerSync:', error);
      throw error;
    }
  }

  /**
   * Reset media player to clean state
   */
  private async resetMediaPlayer(): Promise<void> {
    try {
      logger.info(ENABLE_LOGGING, '🎵 Resetting media player...');

      // Import media player service dynamically
      const { mediaPlayerService } =
        await import('@/features/media/services/MediaPlayerService');

      // Stop media player
      await mediaPlayerService.stop();

      // Reset React Native Track Player
      const TrackPlayer = await import('react-native-track-player');
      await TrackPlayer.default.reset();

      logger.info(ENABLE_LOGGING, '✅ Media player reset completed');
    } catch (error) {
      logger.warn(
        ENABLE_LOGGING,
        '⚠️ Media player reset failed (non-fatal):',
        error
      );
      // Don't throw - media player reset failure shouldn't block the entire reset
    }
  }

  /**
   * Reset authentication state
   */
  private async resetAuthState(): Promise<void> {
    try {
      logger.info(ENABLE_LOGGING, '🔐 Resetting authentication state...');

      // Sign out from Supabase
      await authService.signOut();

      logger.info(ENABLE_LOGGING, '✅ Authentication state reset completed');
    } catch (error) {
      logger.error(ENABLE_LOGGING, '❌ Failed to reset auth state:', error);
      throw error;
    }
  }

  /**
   * Reset only user data while keeping app services running
   * Used for scenarios where we want to clear user data but not restart everything
   */
  public async resetUserDataOnly(): Promise<void> {
    try {
      logger.info(
        ENABLE_LOGGING,
        '🧹 AppResetService: Resetting user data only...'
      );

      // Clear user data only (preserves downloads)
      await dataClearingService.clearUserDataOnly();

      // Reset media player
      await this.resetMediaPlayer();

      // Sign out and ensure anonymous session
      await this.resetAuthState();
      await authService.ensureSessionIfOnline();

      logger.info(
        ENABLE_LOGGING,
        '✅ AppResetService: User data reset completed'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '💥 AppResetService: User data reset failed:',
        error
      );
      throw error;
    }
  }
}

export const appResetService = AppResetService.getInstance();
