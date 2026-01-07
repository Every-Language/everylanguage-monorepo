import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import i18n, {
  SUPPORTED_LOCALES,
  saveLocalePreference,
  getCurrentLocaleInfo,
  isRTLLocale,
  getLocaleDirection,
  getDeviceLocale,
  isFirstLaunch,
} from '../services/i18n/config';
import { logger } from '../utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

// Types
export interface LocalizationState {
  currentLocale: string;
  currentLocaleInfo: (typeof SUPPORTED_LOCALES)[0] | undefined;
  isRTL: boolean;
  direction: 'ltr' | 'rtl';
  isLoading: boolean;
  error: string | null;
}

export interface LocalizationActions {
  changeLocale: (localeCode: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  clearError: () => void;
  // Computed getters
  getSupportedLocales: () => typeof SUPPORTED_LOCALES;
  getTranslationFunction: () => typeof i18n.t;
}

export type LocalizationStore = LocalizationState & LocalizationActions;

// Store
export const useLocalizationStore = create<LocalizationStore>()(
  persist(
    set => ({
      // Initial state
      currentLocale: i18n.language,
      currentLocaleInfo: getCurrentLocaleInfo() || SUPPORTED_LOCALES[0],
      isRTL: isRTLLocale(),
      direction: getLocaleDirection(),
      isLoading: true,
      error: null,

      // Actions
      changeLocale: async (localeCode: string) => {
        try {
          set({ isLoading: true, error: null });

          await i18n.changeLanguage(localeCode);
          await saveLocalePreference(localeCode);

          const newIsRTL = isRTLLocale(localeCode);
          const newDirection = getLocaleDirection(localeCode);

          // Update RTL settings
          if (I18nManager.isRTL !== newIsRTL) {
            I18nManager.allowRTL(newIsRTL);
            I18nManager.forceRTL(newIsRTL);
            // Reload app to fully apply RTL change
            try {
              await Updates.reloadAsync();
            } catch (reloadError) {
              logger.warn(
                true,
                'Failed to reload after RTL change:',
                reloadError
              );
            }
            return;
          }

          set({
            currentLocale: localeCode,
            currentLocaleInfo: getCurrentLocaleInfo() || SUPPORTED_LOCALES[0],
            isRTL: newIsRTL,
            direction: newDirection,
            isLoading: false,
          });
        } catch (error) {
          logger.error(ENABLE_LOGGING, 'Failed to change locale:', error);
          set({
            error: 'Failed to change locale',
            isLoading: false,
          });
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      clearError: () => {
        set({ error: null });
      },

      // Computed getters
      getSupportedLocales: () => SUPPORTED_LOCALES,

      getTranslationFunction: () => i18n.t,
    }),
    {
      name: 'localization-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the current locale, not loading/error states
      partialize: state => ({
        currentLocale: state.currentLocale,
        isRTL: state.isRTL,
        direction: state.direction,
      }),
    }
  )
);

// Initialize localization store
export const initializeLocalizationStore = async () => {
  const store = useLocalizationStore.getState();

  try {
    store.setLoading(true);

    // Check if this is first launch and log locale selection
    const isFirst = await isFirstLaunch();
    const deviceLocale = getDeviceLocale();

    if (isFirst) {
      logger.info(
        true,
        `First app launch detected. Device locale: ${deviceLocale}, Selected locale: ${i18n.language}`
      );
    }

    // Sync store state with current i18n state
    const currentLocale = i18n.language;
    const currentLocaleInfo = getCurrentLocaleInfo();
    const newIsRTL = isRTLLocale(currentLocale);
    const newDirection = getLocaleDirection(currentLocale);

    // Update store with current i18n state
    useLocalizationStore.setState({
      currentLocale,
      currentLocaleInfo,
      isRTL: newIsRTL,
      direction: newDirection,
      isLoading: false,
      error: null,
    });

    // Set up language change listener
    const handleLocaleChange = (lng: string) => {
      const localeInfo = getCurrentLocaleInfo();
      const rtl = isRTLLocale(lng);
      const direction = getLocaleDirection(lng);

      // Update RTL layout if needed
      if (I18nManager.isRTL !== rtl) {
        I18nManager.allowRTL(rtl);
        I18nManager.forceRTL(rtl);
      }

      // Update store state
      useLocalizationStore.setState({
        currentLocale: lng,
        currentLocaleInfo: localeInfo,
        isRTL: rtl,
        direction,
        isLoading: false,
      });

      logger.info(ENABLE_LOGGING, `Locale changed to: ${lng}`);
    };

    // Listen for locale changes
    i18n.on('languageChanged', handleLocaleChange);

    logger.info(
      true,
      `Localization store initialized with locale: ${currentLocale}`
    );

    // Return cleanup function
    return () => {
      i18n.off('languageChanged', handleLocaleChange);
    };
  } catch (error) {
    logger.error(
      ENABLE_LOGGING,
      'Failed to initialize localization store:',
      error
    );
    store.setLoading(false);
    return () => {}; // Return empty cleanup function
  }
};
