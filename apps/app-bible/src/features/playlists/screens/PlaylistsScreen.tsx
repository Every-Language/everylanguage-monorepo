import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';

import { useTheme, useLocalization } from '@/shared/hooks';
import { GradientBackground } from '@everylanguage/shared-native-ui';
import { PlaylistList } from '../components/PlaylistList';
import { usePlaylistsPS } from '../hooks/usePlaylistsPS';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { PlaylistsStackParamList } from '../navigation';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';
import { Playlist } from '../types';
import { PlaylistGroupsTabs } from '../components/PlaylistGroupsTabs';
import { MaterialIcons } from '@expo/vector-icons';
import type { Theme } from '@everylanguage/shared-native-ui';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { mediaPlayerService } from '@/features/media';
import type { PlaylistItem } from '../types';
import { useCurrentVersions } from '@/features/languages/hooks';
import { logger } from '@/shared/utils/logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Logging configuration for this module
const ENABLE_LOGGING = true;
import { ModalHeader } from '@everylanguage/shared-native-ui';

export const PlaylistsScreen: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();

  const navigation =
    useNavigation<NativeStackNavigationProp<PlaylistsStackParamList>>();
  const rootNavigation = useNavigation<RootStackNavigationProp>();

  const [selectedPLGroup, setSelectedPLGroup] = useState<string | null>(null);
  const { currentTextVersion } = useCurrentVersions();

  const {
    playlists,
    loading: playlistsLoading,
    refetch,
  } = usePlaylistsPS({ playlistGroupId: selectedPLGroup });

  const handlePlaylistSelect = (playlist: Playlist) => {
    navigation.navigate('PlaylistItems', { playlist });
  };

  const handleCreatePlaylistPress = () => {
    rootNavigation.navigate('CreatePlaylistModal');
  };

  const handlePlayPlaylist = async (playlist: Playlist) => {
    try {
      if (!currentTextVersion?.id) {
        logger.warn(
          ENABLE_LOGGING,
          '[PlaylistsScreen] No current text version available for playlist playback'
        );
        return;
      }

      // Fetch playlist items
      const playlistItems: PlaylistItem[] = await powerSyncSystem.getAll(
        `SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY order_index ASC`,
        [playlist.id]
      );

      if (playlistItems.length === 0) {
        logger.warn(ENABLE_LOGGING, '[PlaylistsScreen] Playlist has no items');
        return;
      }

      // Filter out custom_text items, only play passage items
      const passageItems = playlistItems.filter(
        item => item.playlist_item_type === 'passage'
      );

      if (passageItems.length === 0) {
        logger.warn(
          ENABLE_LOGGING,
          '[PlaylistsScreen] Playlist has no playable passage items'
        );
        return;
      }

      logger.info(
        ENABLE_LOGGING,
        `[PlaylistsScreen] Playing playlist "${playlist.title}" with ${passageItems.length} passage items`
      );

      // Add all passage playlist items to queue
      for (const item of passageItems) {
        await mediaPlayerService.addPlaylistItemToQueue(item);
      }

      // Play the first passage item
      const firstItem = passageItems[0];
      if (firstItem) {
        await mediaPlayerService.playPlaylistItem(firstItem);
      }

      logger.info(
        ENABLE_LOGGING,
        '[PlaylistsScreen] ✅ Playlist playback started'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[PlaylistsScreen] ❌ Error playing playlist:',
        error
      );
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const styles = createStyles(theme);

  return (
    <GradientBackground>
      <View
        style={[
          styles.container,
          {
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}>
        <ModalHeader
          title={t('playlists.title', 'Playlists')}
          showClose
          onClose={handleClose}
        />

        <View style={styles.content}>
          <PlaylistGroupsTabs
            activeTab={selectedPLGroup}
            onTabPress={setSelectedPLGroup}
          />
          <PlaylistList
            playlists={playlists}
            selectedPlaylist={null}
            onPlaylistSelect={handlePlaylistSelect}
            onPlaylistPlay={handlePlayPlaylist}
            loading={playlistsLoading}
            refreshControl={
              <RefreshControl
                refreshing={playlistsLoading}
                onRefresh={refetch}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          />
          <TouchableOpacity
            style={[styles.createButton]}
            onPress={handleCreatePlaylistPress}>
            <MaterialIcons
              name='add'
              size={28}
              color={theme.colors.textInverse}
            />
          </TouchableOpacity>
        </View>
      </View>
    </GradientBackground>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    /* eslint-disable */
    createButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 27,
      width: 54,
      height: 54,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      bottom: 20,
      right: 20,
    },
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
  });
