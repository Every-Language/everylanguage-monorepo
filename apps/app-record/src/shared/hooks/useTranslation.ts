import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useLocalizationStore } from '../store/localizationStore';

/**
 * Custom hook for translations
 *
 * Provides access to translation function and current locale info
 */
export const useTranslation = () => {
  const { t } = useI18nTranslation();
  const { currentLocaleInfo, changeLocale } = useLocalizationStore();

  return {
    t,
    currentLocale: currentLocaleInfo,
    changeLocale,
  };
};
