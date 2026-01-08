import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useLocalization } from '@/shared/hooks';
import { BaseMenuItem } from './BaseMenuItem';
import type { MenuStackNavigationProp } from '../navigation/MenuStackNavigator';

export const PlaylistMenuItem: React.FC = () => {
  const navigation = useNavigation<MenuStackNavigationProp>();
  const { t } = useLocalization();

  const handlePress = () => {
    navigation.navigate({
      name: 'Playlists',
      params: { screen: 'PlaylistsHome' },
    });
  };

  return (
    <BaseMenuItem
      onPress={handlePress}
      icon='list'
      title={t('playlists.title', 'Playlists')}
      subtitle={t(
        'playlists.subtitle',
        'Create and manage your audio playlists'
      )}
    />
  );
};
