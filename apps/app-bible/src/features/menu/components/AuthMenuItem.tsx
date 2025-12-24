import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useLocalization } from '@/shared/hooks';
import { BaseMenuItem } from './BaseMenuItem';
import type { MenuStackNavigationProp } from '../navigation/MenuStackNavigator';

export const AuthMenuItem: React.FC = () => {
  const { t } = useLocalization();
  const navigation = useNavigation<MenuStackNavigationProp>();

  const handlePress = () => {
    navigation.getParent()?.navigate('AuthModal');
  };

  return (
    <BaseMenuItem
      onPress={handlePress}
      icon='log-in'
      title={t('auth.signIn')}
    />
  );
};
