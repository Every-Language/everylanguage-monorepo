// Logging configuration for this module
const ENABLE_LOGGING = false;

export {
  useOnboardingStore,
  type OnboardingStore,
  type OnboardingState,
  type OnboardingActions,
} from '../../features/onboarding/store/onboardingStore';

// Re-export theme store from shared-native-ui package
export {
  useThemeStore,
  initializeThemeStore,
  type ThemeStore,
  type ThemeState,
  type ThemeActions,
} from '@everylanguage/shared-native-ui';

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

// Re-export toast store from shared-native-ui package
export { useToastStore } from '@everylanguage/shared-native-ui';
export type { ToastStore } from '@everylanguage/shared-native-ui';

// Initialize all stores
export const initializeAllStores = async () => {
  try {
    // Import the initialization functions
    const { initializeThemeStore } =
      await import('@everylanguage/shared-native-ui');
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
