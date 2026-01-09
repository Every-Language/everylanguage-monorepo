import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useLocalization } from '@/shared/hooks';
import { BaseMenuItem } from './BaseMenuItem';

export const ExportBiblePackageMenuItem: React.FC = () => {
  const { t } = useLocalization();
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.getParent()?.navigate('ExportBiblePackageModal');
  };

  return (
    <BaseMenuItem
      onPress={handlePress}
      icon='share-social'
      title={t('nav.exportBiblePackage')}
    />
  );
};
