import React, { useMemo, useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MenuView, MenuAction } from '@react-native-menu/menu';
import { useTheme } from '@/shared/hooks';
import { logger } from '../../../shared/utils/logger';
import type { AudioVersion, TextVersion } from '../types/entities';
import { useLocalization } from '@/shared/hooks';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export interface VersionMenuButtonProps {
  version: AudioVersion | TextVersion;
  versionType: 'audio' | 'text';
  onRemoveVersion: () => Promise<void>;
  onInfoRequested?: (() => void) | undefined;
}

export const VersionMenuButton: React.FC<VersionMenuButtonProps> = ({
  version: _version,
  versionType: _versionType,
  onRemoveVersion,
  onInfoRequested,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const actions: MenuAction[] = useMemo(() => {
    return [
      { id: 'info', title: t('versions.infoTitle'), image: 'info.circle' },
      {
        id: 'remove',
        title: t('versions.remove', { defaultValue: 'Remove version' }),
        attributes: { destructive: true },
        image: 'trash',
      },
    ];
  }, [t]);

  const handleAction = useCallback(
    async ({
      nativeEvent,
    }: {
      nativeEvent: { event: string; selectedMenuItem?: string };
    }) => {
      const id = nativeEvent.event;
      try {
        if (id === 'info') {
          onInfoRequested?.();
        } else if (id === 'remove') {
          await onRemoveVersion();
        }
      } catch (err) {
        logger.warn(ENABLE_LOGGING, 'Menu action failed:', err);
      }
    },
    [onRemoveVersion, onInfoRequested]
  );

  return (
    <MenuView onPressAction={handleAction} actions={actions}>
      <TouchableOpacity>
        <Ionicons
          name='ellipsis-horizontal'
          size={20}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>
    </MenuView>
  );
};
