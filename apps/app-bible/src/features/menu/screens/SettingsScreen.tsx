import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/hooks/useThemeFromStore';
import type {
  SettingsScreenProps,
  MenuStackNavigationProp,
} from '../navigation/MenuStackNavigator';
import { ModalHeader } from '@everylanguage/shared-native-ui';
import { MenuView, MenuAction } from '@react-native-menu/menu';
import type { ThemeMode } from '@everylanguage/shared-native-ui';
import { useLocalization } from '@/shared/hooks';
import { useMediaSettingsStore } from '@/features/settings';

export const SettingsScreen: React.FC<SettingsScreenProps> = () => {
  const { theme, mode, setTheme } = useTheme();
  const navigation = useNavigation<MenuStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { t, currentLocaleInfo } = useLocalization();
  const autoOpenOnPlay = useMediaSettingsStore(s => s.autoOpenOnPlay);
  const setAutoOpenOnPlay = useMediaSettingsStore(s => s.setAutoOpenOnPlay);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const actions: MenuAction[] = useMemo(() => {
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

  const onPressAction = useCallback(
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

  const mediaActions: MenuAction[] = useMemo(() => {
    const entries: Array<{ id: 'on' | 'off'; title: string }> = [
      { id: 'on', title: t('common.on', { defaultValue: 'On' }) },
      { id: 'off', title: t('common.off', { defaultValue: 'Off' }) },
    ];
    return entries.map(({ id, title }) => ({
      id,
      title,
      state:
        (autoOpenOnPlay && id === 'on') || (!autoOpenOnPlay && id === 'off')
          ? 'on'
          : 'off',
    }));
  }, [autoOpenOnPlay, t]);

  const onPressMediaAction = useCallback(
    ({ nativeEvent }: { nativeEvent: { event: string } }) => {
      const selected = nativeEvent.event as 'on' | 'off';
      if (selected === 'on') setAutoOpenOnPlay(true);
      else if (selected === 'off') setAutoOpenOnPlay(false);
    },
    [setAutoOpenOnPlay]
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.modalBackground,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}>
      <ModalHeader
        title={t('settings.title')}
        showBack
        onBack={handleBack}
        showClose
        onClose={() => navigation.getParent()?.goBack()}
      />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {t('menu.appearance')}
        </Text>

        <MenuView onPressAction={onPressAction} actions={actions}>
          <TouchableOpacity
            style={[styles.row, { backgroundColor: theme.colors.surface }]}
            activeOpacity={0.7}>
            <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
              {t('settings.theme')}
            </Text>
            <Text
              style={[styles.rowValue, { color: theme.colors.textSecondary }]}>
              {mode === 'system'
                ? t('settings.themeSystem')
                : mode === 'light'
                  ? t('settings.themeLight')
                  : t('settings.themeDark')}
            </Text>
          </TouchableOpacity>
        </MenuView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {t('settings.mediaPlayer', { defaultValue: 'Media player' })}
        </Text>

        <MenuView onPressAction={onPressMediaAction} actions={mediaActions}>
          <TouchableOpacity
            style={[styles.row, { backgroundColor: theme.colors.surface }]}
            activeOpacity={0.7}>
            <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
              {t('settings.autoOpenMediaPlayer', {
                defaultValue: 'Auto open media player',
              })}
            </Text>
            <Text
              style={[styles.rowValue, { color: theme.colors.textSecondary }]}>
              {autoOpenOnPlay
                ? t('common.on', { defaultValue: 'On' })
                : t('common.off', { defaultValue: 'Off' })}
            </Text>
          </TouchableOpacity>
        </MenuView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {t('menu.language')}
        </Text>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: theme.colors.surface }]}
          activeOpacity={0.7}
          onPress={() => navigation.getParent()?.navigate('LanguageSelector')}>
          <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
            {t('settings.appLanguage', { defaultValue: 'App language' })}
          </Text>
          <Text
            style={[styles.rowValue, { color: theme.colors.textSecondary }]}>
            {currentLocaleInfo?.nativeName || currentLocaleInfo?.name || ''}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});
