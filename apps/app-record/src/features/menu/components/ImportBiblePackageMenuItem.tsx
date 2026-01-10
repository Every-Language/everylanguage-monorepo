import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useLocalization } from '@/shared/hooks';
import { BaseMenuItem } from './BaseMenuItem';

export const ImportBiblePackageMenuItem: React.FC = () => {
  const { t } = useLocalization();
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.getParent()?.navigate('ImportBiblePackageModal');
  };

  return (
    <BaseMenuItem
      onPress={handlePress}
      icon='download'
      title={t('nav.importBiblePackage')}
    />
  );
};
