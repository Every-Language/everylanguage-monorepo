import { logger } from '../utils/logger';
import { powerSyncSystem } from './powersync/PowerSyncSystem';
import { initializeAllStores } from '../store';
import { initializeVersionsStore } from '../../features/languages/store/versionsStore';
import { authService } from '../../features/auth/services/authService';
// Search initialization is handled by components using useSearchInitialization hook

// Logging configuration for this module
const ENABLE_LOGGING = false;

/**
 * Service responsible for initializing the app from scratch
 * Extracted from App.tsx to be reusable for reset scenarios
 */
class AppInitializationService {
  private static instance: AppInitializationService;

  public static getInstance(): AppInitializationService {
    if (!AppInitializationService.instance) {
      AppInitializationService.instance = new AppInitializationService();
    }
    return AppInitializationService.instance;
  }

  /**
   * Initialize the entire app from scratch
   * This is the same logic used during app startup
   */
  public async initializeApp(): Promise<void> {
    try {
      logger.info(
        ENABLE_LOGGING,
        '🚀 AppInitializationService: Starting app initialization...'
      );

      // 1. Initialize PowerSync database first to avoid deadlocks with auth store
      try {
        logger.info(ENABLE_LOGGING, '📊 Initializing PowerSync database...');
        await powerSyncSystem.initialize();
        logger.info(ENABLE_LOGGING, '✅ PowerSync database initialized');
      } catch (powerSyncInitError) {
        logger.error(
          ENABLE_LOGGING,
          '❌ PowerSync initialize failed (continuing):',
          powerSyncInitError
        );
        // Continue with initialization even if PowerSync fails
      }

      // 2. Initialize all Zustand stores (some may await DB readiness)
      logger.info(ENABLE_LOGGING, '🏪 Initializing all stores...');
      await initializeAllStores();
      logger.info(ENABLE_LOGGING, '✅ All stores initialized');

      // 3. Ensure versions store is ready as soon as PowerSync is initialized
      try {
        logger.info(ENABLE_LOGGING, '📚 Initializing versions store...');
        await initializeVersionsStore();
        logger.info(ENABLE_LOGGING, '✅ Versions store initialized');
      } catch (e) {
        logger.warn(
          ENABLE_LOGGING,
          '⚠️ Versions store early init failed (non-fatal)',
          e
        );
      }

      // 4. Initialize MediaPlayerService
      try {
        logger.info(ENABLE_LOGGING, '🎵 Initializing MediaPlayerService...');
        const { mediaPlayerService } =
          await import('@/features/media/services');
        await mediaPlayerService.initialize();
        logger.info(
          ENABLE_LOGGING,
          '✅ MediaPlayerService initialized successfully'
        );
      } catch (e) {
        logger.error(ENABLE_LOGGING, '❌ MediaPlayerService init failed:', e);
        // Continue without media player - app should still function
      }

      // 5. Initialize search indexes (fire-and-forget)
      try {
        logger.info(ENABLE_LOGGING, '🔍 Initializing search indexes...');
        // Note: useSearchInitialization is a hook, so we'll handle this differently
        // For now, we'll let the component handle search initialization
        logger.info(
          ENABLE_LOGGING,
          '✅ Search initialization delegated to components'
        );
      } catch (e) {
        logger.warn(
          ENABLE_LOGGING,
          '⚠️ Search initialization failed (non-fatal):',
          e
        );
      }

      // 6. Ensure anonymous session is available
      try {
        logger.info(ENABLE_LOGGING, '🔐 Ensuring anonymous session...');
        await authService.ensureSessionIfOnline();
        logger.info(ENABLE_LOGGING, '✅ Anonymous session ensured');
      } catch (e) {
        logger.warn(
          ENABLE_LOGGING,
          '⚠️ Anonymous session setup failed (non-fatal):',
          e
        );
      }

      logger.info(
        ENABLE_LOGGING,
        '🎉 AppInitializationService: App initialization completed successfully'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '💥 AppInitializationService: Failed during app initialization:',
        error
      );
      throw error;
    }
  }

  /**
   * Initialize only the core services (PowerSync, stores, auth)
   * Used for partial initialization scenarios
   */
  public async initializeCoreServices(): Promise<void> {
    try {
      logger.info(
        ENABLE_LOGGING,
        '🔧 AppInitializationService: Initializing core services...'
      );

      // Initialize PowerSync database
      await powerSyncSystem.initialize();

      // Initialize all stores
      await initializeAllStores();

      // Ensure anonymous session
      await authService.ensureSessionIfOnline();

      logger.info(
        ENABLE_LOGGING,
        '✅ AppInitializationService: Core services initialized'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '❌ AppInitializationService: Core services initialization failed:',
        error
      );
      throw error;
    }
  }
}

export const appInitializationService = AppInitializationService.getInstance();
