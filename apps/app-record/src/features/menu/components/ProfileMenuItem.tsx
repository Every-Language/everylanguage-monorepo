import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useLocalization } from '@/shared/hooks';
import { BaseMenuItem } from './BaseMenuItem';
import type { MenuStackNavigationProp } from '../navigation/MenuStackNavigator';

export const ProfileMenuItem: React.FC = () => {
  const { t } = useLocalization();
  const navigation = useNavigation<MenuStackNavigationProp>();

  const handlePress = () => {
    navigation.navigate('Profile');
  };

  return (
    <BaseMenuItem
      onPress={handlePress}
      icon='person'
      title={t('profile.myProfile')}
    />
  );
};
