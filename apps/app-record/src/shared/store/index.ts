// Centralized store exports and initialization

export {
  useThemeStore,
  initializeThemeStore,
  type ThemeStore,
} from './themeStore';

export {
  useLocalizationStore,
  initializeLocalizationStore,
  type LocalizationStore,
} from './localizationStore';

export { useAuthStore, type AuthStore } from '../auth/store/authStore';

/**
 * Initialize all stores
 *
 * This function should be called once during app startup.
 * It initializes stores in the correct order and handles dependencies.
 */
export const initializeAllStores = async (): Promise<void> => {
  try {
    // Import initialization functions dynamically to avoid circular dependencies
    const { initializeThemeStore } = await import('./themeStore');
    const { initializeI18n } = await import('../services/i18n');
    const { initializeLocalizationStore } = await import('./localizationStore');

    // Ensure i18n is initialized before localization store (dependency)
    await initializeI18n();

    // Initialize stores in parallel where possible
    // Use Promise.allSettled to tolerate partial failures
    await Promise.allSettled([
      initializeThemeStore(),
      initializeLocalizationStore(),
    ]);
  } catch (error) {
    const { logger } = await import('../utils/logger');
    logger.error('Failed to initialize stores:', error);
    // Don't throw - allow app to continue with partial initialization
  }
};
