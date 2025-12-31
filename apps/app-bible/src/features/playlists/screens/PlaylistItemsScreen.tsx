import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useTheme, useLocalization } from '@/shared/hooks';
import { useCurrentVersions } from '../../languages/hooks';
import { mediaPlayerService } from '@/features/media';
import { PlaylistsStackParamList } from '../navigation';
import {
  Details,
  GradientBackground,
  Header,
} from '@everylanguage/shared-native-ui';
import type { Theme } from '@everylanguage/shared-native-ui';
import { usePlaylistItemsPS } from '../hooks/usePlaylistItemsPS';
import { PlaylistItemWithVerses } from '../types';
import { DraggablePlaylistItem } from '../components/DraggablePlaylistItem';
import { usePlaylistActions } from '../hooks/usePlaylistActions';
import { usePlaylistPS } from '../hooks/usePlaylistPS';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePlaylistMutations } from '../hooks/usePlaylistMutations';
import logger from '@/shared/utils/logger';

type PlaylistItemsScreenProps = NativeStackScreenProps<
  PlaylistsStackParamList,
  'PlaylistItems'
>;

export const PlaylistItemsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const navigation =
    useNavigation<NativeStackNavigationProp<PlaylistsStackParamList>>();
  const rootNavigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<PlaylistItemsScreenProps['route']>();

  const { playlist: playlistParam } = route.params;
  const { currentTextVersion } = useCurrentVersions();

  // State for reorder mode and deletion
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Get fresh playlist data from database
  const { playlist: playlistData } = usePlaylistPS({
    playlistId: playlistParam.id,
    initialData: playlistParam,
  });

  // Use playlist data or fallback to param (should always have a value due to initialData)
  const playlist = playlistData ?? playlistParam;

  // Start reorder mode
  const startReorderMode = () => {
    setIsReorderMode(true);
  };

  // Handle add custom text
  const handleOpenAddCustomText = () => {
    logger.info(true, '[PlaylistItemsScreen] Opening Add Custom Text modal');
    rootNavigation.navigate('AddCustomTextToPlaylistModal', {
      playlistId: playlist.id,
      playlistTitle:
        playlist.title || t('playlists.createOrEditTitle', 'Playlist'),
    });
  };

  const { menuActions, handleMenuAction } = usePlaylistActions(playlist, {
    includeReorder: true,
    includeAddCustomText: true,
    onReorder: startReorderMode,
    onAddCustomText: handleOpenAddCustomText,
  });

  const {
    playlistItems,
    loading,
    error: versesError,
    refetch: refetchVerses,
    // isRefetching,
  } = usePlaylistItemsPS({
    playlistId: playlist.id,
    versionId: currentTextVersion?.id as string,
  });

  const { reorderPlaylistItems, deletePlaylistItem } = usePlaylistMutations();

  // Local state for drag-and-drop ordering
  const [localItems, setLocalItems] = useState<PlaylistItemWithVerses[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Create a stable string representation of playlistItems IDs to detect real changes
  const playlistItemsKey = React.useMemo(
    () => playlistItems.map(item => item.id).join(','),
    [playlistItems]
  );

  // Sync local items with fetched items when they change
  React.useEffect(() => {
    // Only sync when not in reorder mode
    if (!isReorderMode) {
      setLocalItems(playlistItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistItemsKey, isReorderMode]);

  // Handle playing entire playlist
  const handlePlayPlaylist = async () => {
    try {
      if (playlistItems.length === 0) return;

      // Filter out custom_text items, only play passage items
      const passageItems = playlistItems.filter(
        item => item.playlist_item_type === 'passage'
      );

      if (passageItems.length === 0) return;

      // Add all passage playlist items to queue
      for (const item of passageItems) {
        await mediaPlayerService.addPlaylistItemToQueue(item);
      }

      // Play the first passage item
      const firstItem = passageItems[0];
      if (firstItem) {
        await mediaPlayerService.playPlaylistItem(firstItem);
      }
    } catch (error) {
      logger.error(
        true,
        '[PlaylistItemsScreen] Error playing playlist:',
        error
      );
    }
  };

  // Handle drag end - only update local state
  const handleDragEnd = ({ data }: { data: PlaylistItemWithVerses[] }) => {
    if (deletingItemId) return; // Don't reorder while deleting

    setLocalItems(data);
    setHasUnsavedChanges(true);
  };

  // Save reorder changes to database
  const handleSaveReorder = async () => {
    if (!hasUnsavedChanges) {
      setIsReorderMode(false);
      return;
    }

    // Create array with new order indices
    const itemsWithNewOrder = localItems.map((item, index) => ({
      id: item.id,
      order_index: index,
    }));

    try {
      await reorderPlaylistItems.mutateAsync({
        playlistId: playlist.id,
        itemsWithNewOrder,
      });
      setHasUnsavedChanges(false);
      setIsReorderMode(false);
    } catch (error) {
      logger.error(
        true,
        '[PlaylistItemsScreen] Error reordering playlist items:',
        error
      );
      // Revert to original order on error
      setLocalItems(playlistItems);
      setHasUnsavedChanges(false);
    }
  };

  // Cancel reorder mode and revert changes
  const handleCancelReorder = () => {
    if (hasUnsavedChanges) {
      setLocalItems(playlistItems);
      setHasUnsavedChanges(false);
    }
    setIsReorderMode(false);
  };

  // Handle delete playlist item
  const handleDeleteItem = async (itemId: string) => {
    if (deletingItemId) return; // Prevent multiple deletions at once

    try {
      setDeletingItemId(itemId);

      // Update local state immediately for better UX
      setLocalItems(prev => prev.filter(item => item.id !== itemId));

      await deletePlaylistItem.mutateAsync({
        playlistId: playlist.id,
        playlistItemId: itemId,
      });
    } catch (error) {
      logger.error(
        true,
        '[PlaylistItemsScreen] Error deleting playlist item:',
        error
      );
      // Revert to original items on error
      setLocalItems(playlistItems);
    } finally {
      setDeletingItemId(null);
    }
  };

  // TODO
  const playlistImage = { uri: 'https://picsum.photos/id/1/400/400' };

  // Handle back navigation
  const handleBack = () => {
    navigation.goBack();
  };

  // Handle share
  const handleShare = async () => {
    // TODO: Implement share functionality
  };

  // Render individual playlist item with drag-and-drop
  const renderPlaylistItem = ({
    item: playlistItem,
    drag,
    isActive,
  }: RenderItemParams<PlaylistItemWithVerses>) => {
    const isThisItemDeleting = deletingItemId === playlistItem.id;
    const isAnyItemDeleting = deletingItemId !== null;

    return (
      <ScaleDecorator>
        <DraggablePlaylistItem
          playlistItem={playlistItem}
          onVersePress={() => {}}
          {...(isReorderMode &&
            !isAnyItemDeleting && { onDelete: handleDeleteItem })}
          isDragEnabled={isReorderMode && !isAnyItemDeleting}
          showDeleteButton={isReorderMode}
          drag={drag}
          isActive={isActive}
          isDeleting={isThisItemDeleting}
        />
      </ScaleDecorator>
    );
  };

  const keyExtractor = (item: PlaylistItemWithVerses) => item.id;

  // Create theme-aware styles
  const styles = createStyles(theme);

  // Render list header with Details component
  const renderListHeader = () => (
    <Details
      title={
        playlist.title || t('playlists.unknownPlaylist', 'Unknown Playlist')
      }
      subtitle={
        playlist.description ||
        t('playlists.noDescription', 'No description available')
      }
      albumArt={playlistImage}
      onSharePress={handleShare}
      playButtonProps={
        playlistItems.filter(item => item.playlist_item_type === 'passage')
          .length > 0
          ? {
              type: 'chapter',
              id: `playlist-${playlist.id}`,
              onPress: handlePlayPlaylist,
            }
          : undefined
      }
      menuActions={menuActions}
      onMenuAction={event => {
        logger.info(
          true,
          '[PlaylistItemsScreen] Menu action triggered:',
          event.nativeEvent.event
        );
        handleMenuAction(event);
      }}
      testID='chapter-screen-details'
    />
  );

  // Render empty state
  const renderEmptyState = () => {
    if (loading && playlistItems.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <MaterialIcons
            name='hourglass-empty'
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.loadingText}>
            {t('verses.loading', 'Loading verses...')}
          </Text>
        </View>
      );
    }

    if (versesError || playlistItems.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons
            name='error-outline'
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.errorText}>
            {versesError ||
              t('playlists.noItems', 'No items available for this playlist')}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetchVerses}>
            <Text style={styles.retryButtonText}>
              {t('verses.tryAgain', 'Try Again')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <GestureHandlerRootView>
      <GradientBackground>
        <Header
          onBackPress={handleBack}
          title={
            playlist.title || t('playlists.unknownPlaylist', 'Unknown Playlist')
          }
          testID='playlist-screen-header'
          transparent={true}
        />
        <View style={styles.container}>
          <DraggableFlatList
            data={localItems}
            renderItem={renderPlaylistItem}
            keyExtractor={keyExtractor}
            onDragEnd={handleDragEnd}
            activationDistance={isReorderMode && !deletingItemId ? 0 : 999999}
            dragItemOverflow={true}
            ListHeaderComponent={renderListHeader}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isReorderMode || deletingItemId === null}
          />

          {/* Floating Action Buttons - Only visible in reorder mode */}
          {isReorderMode && (
            <View style={styles.fabContainer}>
              {/* Cancel Reorder */}
              <TouchableOpacity
                style={[styles.fab, styles.fabDanger]}
                onPress={handleCancelReorder}
                disabled={
                  deletingItemId !== null || reorderPlaylistItems.isPending
                }>
                <MaterialIcons
                  name='close'
                  size={28}
                  color={theme.colors.textInverse}
                />
              </TouchableOpacity>

              {/* Save Changes */}
              <TouchableOpacity
                style={[styles.fab, styles.fabSuccess]}
                onPress={handleSaveReorder}
                disabled={
                  deletingItemId !== null || reorderPlaylistItems.isPending
                }>
                {reorderPlaylistItems.isPending ? (
                  <ActivityIndicator
                    size='small'
                    color={theme.colors.textInverse}
                  />
                ) : (
                  <MaterialIcons
                    name='check'
                    size={28}
                    color={theme.colors.textInverse}
                  />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </GradientBackground>
    </GestureHandlerRootView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    /* eslint-disable */
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      minHeight: 400,
    },
    loadingText: {
      fontSize: 16,
      marginTop: 16,
      textAlign: 'center',
      color: theme.colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingHorizontal: 32,
      minHeight: 400,
    },
    errorText: {
      fontSize: 16,
      marginTop: 16,
      marginBottom: 24,
      textAlign: 'center',
      lineHeight: 24,
      color: theme.colors.text,
    },
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.background,
    },
    listContent: {
      paddingHorizontal: 8,
      paddingBottom: 100,
    },
    container: {
      flex: 1,
    },
    fabContainer: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      flexDirection: 'column',
      gap: 12,
    },
    fab: {
      backgroundColor: theme.colors.primary,
      borderRadius: 27,
      width: 54,
      height: 54,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.27,
      shadowRadius: 4.65,
    },
    fabSuccess: {
      backgroundColor: theme.colors.success || '#48BB78',
    },
    fabDanger: {
      backgroundColor: theme.colors.error || '#E53E3E',
    },
  });
