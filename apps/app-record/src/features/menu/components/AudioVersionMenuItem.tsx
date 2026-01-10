import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import { useVersionsStore } from '@/features/languages/hooks';
import { BaseMenuItem } from './BaseMenuItem';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';

export const AudioVersionMenuItem: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation();
  const { currentAudioVersion } = useVersionsStore();

  const handlePress = () => {
    const rootNavigation = navigation.getParent() as RootStackNavigationProp;
    rootNavigation?.navigate('VersionSelectionModal', {
      versionType: 'audio',
    });
  };

  const subtitle =
    currentAudioVersion?.name ||
    t('versions.notSelected', { defaultValue: 'Not selected' });

  return (
    <BaseMenuItem
      onPress={handlePress}
      icon='volume-high'
      title={t('versions.audioVersion', {
        defaultValue: 'Audio Version',
      })}
      subtitle={subtitle}
      iconColor={theme.colors.primary}
    />
  );
};
