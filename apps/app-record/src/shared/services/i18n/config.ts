import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = __DEV__;

// Import translation files
import enTranslations from './locales/en.json';
import ptTranslations from './locales/pt.json';

// Storage keys
const LOCALE_STORAGE_KEY = '@app_locale';
const FIRST_LAUNCH_KEY = '@app_first_launch';

// Available locales
export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
];

// Translation resources
const resources = {
  en: { translation: enTranslations },
  pt: { translation: ptTranslations },
};

// Check if this is the first app launch
async function isFirstLaunch(): Promise<boolean> {
  try {
    const hasLaunched = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
    return hasLaunched === null;
  } catch (error) {
    if (ENABLE_LOGGING) {
      logger.error('Error checking first launch:', error);
    }
    return true; // Assume first launch if error
  }
}

// Mark that the app has been launched
async function markAppLaunched(): Promise<void> {
  try {
    await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
  } catch (error) {
    if (ENABLE_LOGGING) {
      logger.error('Error marking app as launched:', error);
    }
  }
}

// Get device locale with improved detection
function getDeviceLocale(): string {
  try {
    const deviceLocales = Localization.getLocales();
    if (ENABLE_LOGGING) {
      logger.info('Device locales detected:', deviceLocales);
    }

    if (!deviceLocales || deviceLocales.length === 0) {
      if (ENABLE_LOGGING) {
        logger.warn('No device locales found, using default: en');
      }
      return 'en';
    }

    const supportedCodes = SUPPORTED_LOCALES.map(locale => locale.code);

    // Try primary locale first
    const primaryLocale = deviceLocales[0];
    if (primaryLocale) {
      const localeCode = primaryLocale.languageCode?.toLowerCase();
      if (localeCode && supportedCodes.includes(localeCode)) {
        if (ENABLE_LOGGING) {
          logger.info(`Using primary device locale: ${localeCode}`);
        }
        return localeCode;
      }
    }

    // Try other locales
    for (const locale of deviceLocales) {
      const localeCode = locale.languageCode?.toLowerCase();
      if (localeCode && supportedCodes.includes(localeCode)) {
        if (ENABLE_LOGGING) {
          logger.info(`Using device locale: ${localeCode}`);
        }
        return localeCode;
      }
    }

    if (ENABLE_LOGGING) {
      logger.info('No supported device locale found, using default: en');
    }
    return 'en'; // Default fallback
  } catch (error) {
    if (ENABLE_LOGGING) {
      logger.error('Error getting device locale:', error);
    }
    return 'en'; // Default fallback
  }
}

// Get saved locale preference
async function getSavedLocale(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
  } catch (error) {
    if (ENABLE_LOGGING) {
      logger.error('Error getting saved locale:', error);
    }
    return null;
  }
}

// Save locale preference
export async function saveLocalePreference(localeCode: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, localeCode);
  } catch (error) {
    if (ENABLE_LOGGING) {
      logger.error('Error saving locale preference:', error);
    }
  }
}

// Initialize i18n with automatic locale detection on first launch
export const initializeI18n = async (): Promise<void> => {
  try {
    const isFirst = await isFirstLaunch();
    const savedLocale = await getSavedLocale();
    const deviceLocale = getDeviceLocale();

    let initialLocale: string;

    if (isFirst) {
      // First launch: automatically use device locale if supported, otherwise default to 'en'
      initialLocale = deviceLocale;
      logger.info(
        `First app launch: automatically setting locale to ${initialLocale} (device: ${deviceLocale})`
      );

      // Save the automatically selected locale
      await saveLocalePreference(initialLocale);
      await markAppLaunched();
    } else {
      // Not first launch: use saved locale or fall back to device locale
      initialLocale = savedLocale || deviceLocale;
      logger.info(
        `App already launched: using locale ${initialLocale} (saved: ${savedLocale}, device: ${deviceLocale})`
      );
    }

    await i18n.use(initReactI18next).init({
      resources,
      lng: initialLocale,
      fallbackLng: 'en',

      interpolation: {
        escapeValue: false,
      },

      react: {
        useSuspense: false,
      },

      debug: __DEV__,

      // Key separator
      keySeparator: '.',

      // Namespace separator
      nsSeparator: ':',

      // Pluralization
      pluralSeparator: '_',

      // Context separator
      contextSeparator: '_',

      // Missing key handler
      missingKeyHandler: (lng, _ns, key, fallbackValue) => {
        if (__DEV__) {
          logger.warn(`Missing translation key: ${key} for locale: ${lng}`);
        }
        return fallbackValue || key;
      },

      // Load languages on demand
      load: 'languageOnly',

      // Clean code
      cleanCode: true,

      // Note: RN does not use i18next-browser-languagedetector; detection handled manually above
    });

    logger.info(`i18n initialized successfully with locale: ${initialLocale}`);
  } catch (error) {
    if (ENABLE_LOGGING) {
      logger.error('Failed to initialize i18n:', error);
    }
    // Fallback initialization with English
    try {
      await i18n.use(initReactI18next).init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        react: { useSuspense: false },
      });
      if (ENABLE_LOGGING) {
        logger.info('i18n fallback initialization successful');
      }
    } catch (fallbackError) {
      logger.error('Failed to initialize i18n with fallback:', fallbackError);
    }
  }
};

// Export the i18n instance
export default i18n;

// Helper function to get current locale info
export function getCurrentLocaleInfo():
  | (typeof SUPPORTED_LOCALES)[0]
  | undefined {
  const currentLocale = i18n.language;
  return (
    SUPPORTED_LOCALES.find(locale => locale.code === currentLocale) ||
    SUPPORTED_LOCALES[0]
  );
}

// Helper function to check if locale is RTL
export function isRTLLocale(localeCode?: string): boolean {
  const rtlLocales = ['ar', 'he', 'fa', 'ur'];
  const locale = localeCode || i18n.language;
  return rtlLocales.includes(locale);
}

// Helper function to get locale direction
export function getLocaleDirection(localeCode?: string): 'ltr' | 'rtl' {
  return isRTLLocale(localeCode) ? 'rtl' : 'ltr';
}

// Export helper functions for external use
export { getDeviceLocale, isFirstLaunch, markAppLaunched };
