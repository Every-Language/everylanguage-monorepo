import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useLocalization } from '@/shared/hooks';
import { BaseMenuItem } from './BaseMenuItem';

export const HistoryMenuItem: React.FC = () => {
  const { t } = useLocalization();
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.getParent()?.navigate('HistoryModal');
  };

  return (
    <BaseMenuItem onPress={handlePress} icon='time' title={t('nav.history')} />
  );
};
