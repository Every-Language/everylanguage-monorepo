// Logging configuration for this module
const ENABLE_LOGGING = true;

export {
  useOnboardingStore,
  type OnboardingStore,
  type OnboardingState,
  type OnboardingActions,
} from '../../features/onboarding/store/onboardingStore';

export {
  useThemeStore,
  initializeThemeStore,
  type ThemeStore,
  type ThemeState,
  type ThemeActions,
} from './themeStore';

export {
  useLocalizationStore,
  initializeLocalizationStore,
  type LocalizationStore,
  type LocalizationState,
  type LocalizationActions,
} from './localizationStore';

export {
  useAuthStore,
  initializeAuthStore,
  type AuthStore,
  type AuthStoreState,
  type AuthStoreActions,
} from './authStore';

export { useNetworkStore } from './networkStore';
export type { NetworkStore, NetworkCapabilities } from './networkStore';

export { useToastStore } from './toastStore';
export type { ToastStore } from './toastStore';

// Initialize all stores
export const initializeAllStores = async () => {
  try {
    // Import the initialization functions
    const { initializeThemeStore } = await import('./themeStore');
    const { initializeI18n } = await import('../services/i18n/config');
    const { initializeLocalizationStore } = await import('./localizationStore');
    const { initializeAuthStore } = await import('./authStore');
    const { useOnboardingStore } =
      await import('../../features/onboarding/store/onboardingStore');

    // Prepare store instances
    const onboardingStore = useOnboardingStore.getState();

    // Ensure i18n is initialized before localization store
    await initializeI18n();

    // Initialize essential stores in parallel; tolerate partial failures
    // Note: Network store auto-initializes via getState() and performs connectivity checks
    // in the background. We avoid awaiting its heavy online test here to keep boot fast.
    // Initialize essential stores in parallel, but run auth in background to avoid blocking UI
    await Promise.allSettled([
      initializeThemeStore(),
      initializeLocalizationStore(),
      onboardingStore.checkOnboardingStatus(),
    ]);

    // Fire-and-forget auth initialization (non-blocking)
    try {
      void initializeAuthStore();
    } catch {
      // ignore
    }
  } catch (error) {
    // Use logger instead of console
    const { logger } = await import('../utils/logger');
    logger.error(ENABLE_LOGGING, 'Failed to initialize stores:', error);
  }
};
