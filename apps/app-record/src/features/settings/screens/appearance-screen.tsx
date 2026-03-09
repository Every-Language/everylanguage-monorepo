import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MenuView, MenuAction } from '@react-native-menu/menu';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/shared/ui';
import { useTheme, useTranslation } from '@/shared/hooks';
import type { ThemeMode } from '@/shared/types/theme';

/**
 * Appearance Settings Screen
 *
 * Allows users to select their preferred theme mode:
 * - System (follows device theme)
 * - Light
 * - Dark
 */
export const AppearanceScreen: React.FC = () => {
  const router = useRouter();
  const { theme, mode, setTheme } = useTheme();
  const { t } = useTranslation();

  const handleBack = useCallback((): void => {
    router.back();
  }, [router]);

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

  const getModeLabel = useCallback(
    (currentMode: ThemeMode): string => {
      switch (currentMode) {
        case 'system':
          return t('settings.themeSystem');
        case 'light':
          return t('settings.themeLight');
        case 'dark':
          return t('settings.themeDark');
        default:
          return t('settings.themeSystem');
      }
    },
    [t]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={t('appearance.title')}
        leftButton={{
          label: t('common.back'),
          onPress: handleBack,
        }}
      />
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('appearance.theme')}
          </Text>

          <MenuView onPressAction={onPressAction} actions={actions}>
            <TouchableOpacity
              style={[styles.row, { backgroundColor: theme.colors.surface }]}
              activeOpacity={0.7}>
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                {t('appearance.appTheme')}
              </Text>
              <Text
                style={[
                  styles.rowValue,
                  { color: theme.colors.textSecondary },
                ]}>
                {getModeLabel(mode)}
              </Text>
            </TouchableOpacity>
          </MenuView>
        </View>
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
    marginTop: 8,
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
