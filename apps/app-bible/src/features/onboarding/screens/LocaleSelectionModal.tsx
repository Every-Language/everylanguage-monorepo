import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { useTheme, useLocalization } from '@/shared/hooks';
import { COLOR_VARIATIONS } from '@/shared/constants/theme';

export const LocaleSelectionModal: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { currentLocale, changeLocale, supportedLocales, t } =
    useLocalization();

  const handleClose = () => {
    navigation.goBack();
  };

  const handleSelectLocale = (localeCode: string) => {
    changeLocale(localeCode);
    navigation.goBack();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.modalBackground,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('onboarding.selectLanguage')}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons
              name='close'
              size={24}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Choose your preferred language for the app interface
        </Text>

        <View style={styles.languageList}>
          {supportedLocales.map(locale => (
            <TouchableOpacity
              key={locale.code}
              style={[
                styles.languageItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor:
                    currentLocale === locale.code
                      ? theme.colors.primary
                      : COLOR_VARIATIONS.TRANSPARENT,
                },
              ]}
              onPress={() => handleSelectLocale(locale.code)}>
              <View style={styles.languageInfo}>
                <Text
                  style={[styles.languageName, { color: theme.colors.text }]}>
                  {locale.nativeName}
                </Text>
                <Text
                  style={[
                    styles.languageCode,
                    { color: theme.colors.textSecondary },
                  ]}>
                  {locale.name}
                </Text>
              </View>
              {currentLocale === locale.code && (
                <Ionicons
                  name='checkmark-circle'
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  languageList: {
    gap: 12,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  languageCode: {
    fontSize: 14,
  },
});
