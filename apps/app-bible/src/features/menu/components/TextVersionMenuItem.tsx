import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import { useVersionsStore } from '@/features/languages/hooks';
import { BaseMenuItem } from './BaseMenuItem';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';

export const TextVersionMenuItem: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation();
  const { currentTextVersion } = useVersionsStore();

  const handlePress = () => {
    const rootNavigation = navigation.getParent() as RootStackNavigationProp;
    rootNavigation?.navigate('VersionSelectionModal', {
      versionType: 'text',
    });
  };

  const subtitle = currentTextVersion?.name || t('versions.notSelected');

  return (
    <BaseMenuItem
      onPress={handlePress}
      icon='document-text'
      title={t('versions.textVersion')}
      subtitle={subtitle}
      iconColor={theme.colors.primary}
    />
  );
};
