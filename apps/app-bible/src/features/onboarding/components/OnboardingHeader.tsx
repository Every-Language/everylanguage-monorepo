import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { MenuView, MenuAction } from '@react-native-menu/menu';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useLocalization } from '@/shared/hooks';
import type { ThemeMode } from '@everylanguage/shared-native-ui';
import type { OnboardingStackNavigationProp } from '../navigation/OnboardingStackNavigator';

interface OnboardingHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: (() => void) | undefined;
  showControls?: boolean;
}

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  onBack,
  showControls = true,
}) => {
  const navigation = useNavigation<OnboardingStackNavigationProp>();
  const { theme, mode, setTheme } = useTheme();
  const { currentLocale, supportedLocales, t } = useLocalization();

  // MenuView actions for theme selection
  const themeActions: MenuAction[] = useMemo(() => {
    const entries: Array<{ id: ThemeMode; title: string }> = [
      { id: 'system', title: t('settings.themeSystem') },
      { id: 'light', title: t('settings.themeLight') },
      { id: 'dark', title: t('settings.themeDark') },
    ];
    return entries.map(({ id, title }) => ({
      id,
      title,
      state: mode === id ? 'on' : 'off',
    }));
  }, [mode, t]);

  const onPressThemeAction = useCallback(
    ({ nativeEvent }: { nativeEvent: { event: string } }) => {
      const selected = nativeEvent.event as ThemeMode;
      if (
        selected === 'light' ||
        selected === 'dark' ||
        selected === 'system'
      ) {
        setTheme(selected);
      }
    },
    [setTheme]
  );

  const handleLanguagePress = () => {
    navigation.navigate('LanguageSelector');
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        {showBackButton && onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons
              name='chevron-left'
              size={24}
              color={theme.colors.primary}
              style={styles.backIcon}
            />
            <Text
              style={[styles.backButtonText, { color: theme.colors.primary }]}>
              {t('common.back')}
            </Text>
          </TouchableOpacity>
        )}

        {showControls && (
          <View
            style={[
              styles.controls,
              showBackButton ? styles.controlsWithBack : null,
            ]}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                { backgroundColor: theme.colors.secondary },
              ]}
              onPress={handleLanguagePress}>
              <Ionicons name='language' size={18} color={theme.colors.text} />
              <Text style={[styles.controlText, { color: theme.colors.text }]}>
                {supportedLocales.find(locale => locale.code === currentLocale)
                  ?.nativeName || 'EN'}
              </Text>
            </TouchableOpacity>

            <MenuView onPressAction={onPressThemeAction} actions={themeActions}>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  { backgroundColor: theme.colors.secondary },
                ]}>
                <Ionicons
                  name={mode === 'light' ? 'moon' : 'sunny'}
                  size={18}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </MenuView>
          </View>
        )}
      </View>

      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },
  backIcon: {
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  controlsWithBack: {
    marginRight: 0,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  controlText: {
    fontSize: 14,
    fontWeight: '500',
  },
  titleContainer: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'left',
  },
});
