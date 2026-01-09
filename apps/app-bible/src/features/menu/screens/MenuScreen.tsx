import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import { ModalHeader } from '@everylanguage/shared-native-ui';
import { useAuthContext } from '@/features/auth/hooks/useAuthFromStore';
import { DownloadPill } from '@/features/downloads/components/DownloadPill';
import {
  HistoryMenuItem,
  AudioVersionMenuItem,
  TextVersionMenuItem,
  SettingsMenuItem,
  ExportBiblePackageMenuItem,
  ImportBiblePackageMenuItem,
  ProfileMenuItem,
  AuthMenuItem,
  NetworkStatusWidget,
} from '../components';
import type {
  MenuScreenProps,
  MenuStackNavigationProp,
} from '../navigation/MenuStackNavigator';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';

export const MenuScreen: React.FC<MenuScreenProps> = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation<MenuStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthContext();

  const isAuthenticated =
    !!user && !(user as { is_anonymous?: boolean })?.is_anonymous;

  const handleClose = () => {
    navigation.getParent()?.goBack();
  };

  const handleOpenDownloads = () => {
    const rootNavigation = navigation.getParent() as RootStackNavigationProp;
    rootNavigation?.navigate('DownloadStatusModal');
  };

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
      <ModalHeader title={t('nav.menu')} showClose onClose={handleClose} />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.menuItems}>
          <HistoryMenuItem />
          <DownloadPill onPress={handleOpenDownloads} />

          <AudioVersionMenuItem />
          <TextVersionMenuItem />
          <NetworkStatusWidget />
          <SettingsMenuItem />
          <ExportBiblePackageMenuItem />

          {isAuthenticated ? <ProfileMenuItem /> : <AuthMenuItem />}

          <ImportBiblePackageMenuItem />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16 },
  menuItems: { gap: 8 },
});
