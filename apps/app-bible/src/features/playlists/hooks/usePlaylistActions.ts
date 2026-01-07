import { useLocalization } from '@/shared';
import type { MenuAction } from '@react-native-menu/menu';
import { logger } from '../../../shared/utils/logger';
import { Playlist, PlaylistWithItems } from '../types';

// Logging configuration for this module
const ENABLE_LOGGING = false;
import { useAuthContext } from '@/features/auth';
import { usePlaylistMutations } from './usePlaylistMutations';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';

export interface PlaylistActionsOptions {
  /** Include reorder action (for PlaylistItemsScreen) */
  includeReorder?: boolean;
  /** Include add custom text action (for PlaylistItemsScreen) */
  includeAddCustomText?: boolean;
  /** Callback for reorder action */
  onReorder?: () => void;
  /** Callback for add custom text action */
  onAddCustomText?: () => void;
}

export const usePlaylistActions = (
  playlist: Playlist | PlaylistWithItems,
  options?: PlaylistActionsOptions
) => {
  const { t } = useLocalization();
  const navigation = useNavigation<RootStackNavigationProp>();
  const { deletePlaylist } = usePlaylistMutations();

  const { user } = useAuthContext();
  const isUserPlaylist = playlist.created_by === user?.id;

  // Build menu actions based on options
  const menuActions: MenuAction[] = [
    // Add item-specific actions first (if enabled)
    ...(options?.includeReorder
      ? [
          {
            id: 'reorder',
            title: t('playlists.reorderItems'),
            image: 'reorder',
          },
        ]
      : []),
    ...(options?.includeAddCustomText
      ? [
          {
            id: 'add-custom-text',
            title: t('playlists.addCustomText'),
            image: 'note-add',
          },
        ]
      : []),
    // Standard actions
    { id: 'download', title: 'Download' },
    { id: 'queue', title: 'Add to queue' },
    { id: 'bookmark', title: 'Bookmark' },
    // User-specific actions
    ...(isUserPlaylist
      ? [
          {
            id: 'edit',
            title: t('playlists.editPlaylist'),
          },
          {
            id: 'delete',
            title: t('playlists.deletePlaylist'),
          },
        ]
      : []),
  ];

  // Handle menu actions
  const handleMenuAction = ({
    nativeEvent,
  }: {
    nativeEvent: { event: string };
  }) => {
    const action = nativeEvent.event;
    logger.info(ENABLE_LOGGING, 'Menu action pressed:', action);
    logger.info(
      ENABLE_LOGGING,
      'Available options - onReorder:',
      !!options?.onReorder,
      'onAddCustomText:',
      !!options?.onAddCustomText
    );

    switch (action) {
      case 'reorder':
        logger.info(ENABLE_LOGGING, 'Calling onReorder callback');
        options?.onReorder?.();
        break;
      case 'add-custom-text':
        logger.info(ENABLE_LOGGING, 'Calling onAddCustomText callback');
        options?.onAddCustomText?.();
        break;
      case 'download':
        // TODO: Implement download functionality
        break;
      case 'queue':
        // TODO: Implement add to queue functionality
        break;
      case 'bookmark':
        // TODO: Implement bookmark functionality
        break;
      case 'edit':
        navigation.navigate('EditPlaylistModal', {
          playlist,
        });
        break;
      case 'delete':
        Alert.alert(
          t('playlists.deletePlaylist'),
          t('playlists.deletePlaylistConfirmation'),
          [
            {
              text: t('common.cancel'),
              style: 'cancel',
            },
            {
              text: t('common.delete'),
              style: 'destructive',
              onPress: async () => {
                await deletePlaylist.mutateAsync(playlist.id);
                navigation.goBack();
              },
            },
          ]
        );
        break;
    }
  };

  return { menuActions, handleMenuAction };
};
