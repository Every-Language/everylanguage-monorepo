import { logger } from '../utils/logger';
import { powerSyncSystem } from '../infrastructure/powersync/services/PowerSyncSystem';
import { initializeAllStores } from '../store';
import { useAuthStore } from '../auth/store/authStore';

/**
 * Service responsible for initializing the app
 *
 * This service centralizes all app initialization logic, keeping
 * app/_layout.tsx clean and focused on rendering.
 *
 * Initialization order:
 * 1. PowerSync database (required for auth and data)
 * 2. All stores (theme, i18n, localization)
 * 3. Auth store (may depend on PowerSync)
 */
class AppInitializationService {
  private static instance: AppInitializationService;
  private initializationPromise: Promise<void> | null = null;

  public static getInstance(): AppInitializationService {
    if (!AppInitializationService.instance) {
      AppInitializationService.instance = new AppInitializationService();
    }
    return AppInitializationService.instance;
  }

  /**
   * Initialize the entire app
   *
   * This method is idempotent - calling it multiple times will
   * return the same promise if initialization is already in progress.
   */
  public async initializeApp(): Promise<void> {
    // Return existing promise if initialization is already in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      logger.info(
        '🚀 AppInitializationService: Starting app initialization...'
      );

      // 1. Initialize PowerSync database first
      // This is required before auth store can work properly
      try {
        logger.info('📊 Initializing PowerSync database...');
        await powerSyncSystem.initialize();
        logger.info('✅ PowerSync database initialized');
      } catch (powerSyncInitError) {
        logger.error(
          '❌ PowerSync initialize failed (continuing):',
          powerSyncInitError
        );
        // Continue with initialization even if PowerSync fails
        // The app can still function in offline mode
      }

      // 2. Initialize all Zustand stores
      // This includes theme, i18n, and localization stores
      logger.info('🏪 Initializing all stores...');
      await initializeAllStores();
      logger.info('✅ All stores initialized');

      // 3. Initialize auth store (non-blocking)
      // Auth initialization can happen in the background
      try {
        const { initialize } = useAuthStore.getState();
        logger.info('🔐 Initializing auth store...');
        // Fire-and-forget - don't block UI on auth initialization
        void initialize().catch(error => {
          logger.warn('Auth initialization failed (non-fatal):', error);
        });
      } catch (error) {
        logger.warn('Failed to start auth initialization:', error);
      }

      logger.info('✅ AppInitializationService: App initialization complete');
    } catch (error) {
      logger.error(
        '❌ AppInitializationService: Initialization failed:',
        error
      );
      // Reset promise so we can retry
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Reset initialization state
   * Useful for testing or app reset scenarios
   */
  public reset(): void {
    this.initializationPromise = null;
  }
}

export const appInitializationService = AppInitializationService.getInstance();
