import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/shared/ui';
import { useTheme, useTranslation } from '@/shared/hooks';
import { useLocalizationStore } from '@/shared/store/localizationStore';
import { SUPPORTED_LOCALES } from '@/shared/services/i18n';

/**
 * App Language Settings Screen
 *
 * Allows users to select their preferred app language.
 */
export const AppLanguageScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { currentLocale, changeLocale, isLoading } = useLocalizationStore();

  const handleBack = useCallback((): void => {
    router.back();
  }, [router]);

  const handleLanguageSelect = useCallback(
    async (localeCode: string): Promise<void> => {
      if (localeCode === currentLocale || isLoading) {
        return;
      }
      await changeLocale(localeCode);
    },
    [currentLocale, changeLocale, isLoading]
  );

  // Memoize language select handlers to avoid recreating on each render
  const languageSelectHandlers = useMemo(() => {
    return new Map(
      SUPPORTED_LOCALES.map(locale => [
        locale.code,
        () => handleLanguageSelect(locale.code),
      ])
    );
  }, [handleLanguageSelect]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={t('language.title')}
        leftButton={{
          label: t('common.back'),
          onPress: handleBack,
        }}
      />
      <ScrollView style={styles.content}>
        {SUPPORTED_LOCALES.map(locale => {
          const isSelected = locale.code === currentLocale;

          return (
            <View
              key={locale.code}
              style={[
                styles.languageCard,
                {
                  backgroundColor: theme.colors.surface,
                },
              ]}>
              <TouchableOpacity
                style={styles.languageItem}
                onPress={languageSelectHandlers.get(locale.code)}
                disabled={isLoading}
                activeOpacity={0.7}
                accessibilityLabel={`Select ${locale.nativeName}`}
                accessibilityState={{ selected: isSelected }}>
                <View style={styles.languageContent}>
                  <Text
                    style={[
                      styles.languageName,
                      isSelected && styles.languageNameSelected,
                      { color: theme.colors.text },
                    ]}>
                    {locale.nativeName}
                  </Text>
                  {locale.name !== locale.nativeName && (
                    <Text
                      style={[
                        styles.languageNativeName,
                        { color: theme.colors.textSecondary },
                      ]}>
                      {locale.name}
                    </Text>
                  )}
                </View>
                {isSelected && (
                  <View
                    style={[
                      styles.checkmark,
                      { backgroundColor: theme.colors.accent },
                    ]}>
                    <Text
                      style={[
                        styles.checkmarkText,
                        { color: theme.colors.textInverse },
                      ]}>
                      ✓
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  languageCard: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  languageContent: {
    flex: 1,
  },
  languageName: {
    fontSize: 17,
    fontWeight: '400',
  },
  languageNameSelected: {
    fontWeight: '600',
  },
  languageNativeName: {
    fontSize: 15,
    marginTop: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    // Color will be set dynamically via theme
    fontSize: 14,
    fontWeight: 'bold',
  },
});
