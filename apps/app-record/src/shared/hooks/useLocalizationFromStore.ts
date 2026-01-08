import { useLocalizationStore } from '../store/localizationStore';

/**
 * Hook that provides the same API as the old LocalizationContext
 * but uses the new Zustand store instead of React Context
 */
export const useLocalization = () => {
  const {
    currentLocale,
    currentLocaleInfo,
    isRTL,
    direction,
    isLoading,
    error,
    changeLocale,
    getSupportedLocales,
    getTranslationFunction,
    clearError,
  } = useLocalizationStore();

  return {
    // Translation function (same as i18n.t)
    t: getTranslationFunction(),

    // Current locale
    currentLocale,
    currentLocaleInfo,

    // Available locales
    supportedLocales: getSupportedLocales(),

    // Locale functions
    changeLocale,

    // RTL support
    isRTL,
    direction,

    // Loading state
    isLoading,

    // Error handling
    error,
    clearError,
  };
};

// Convenience hook for translation function (compatibility with old API)
export const useTranslations = () => {
  const { t } = useLocalization();
  return t;
};
