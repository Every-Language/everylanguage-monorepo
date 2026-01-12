import React from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  RefreshControlProps,
} from 'react-native';
import { useTheme, useLocalization } from '@/shared/hooks';
import type { Theme } from '@everylanguage/shared-native-ui';

import { PlaylistCard } from './PlaylistCard';
import { PlaylistCardSkeleton } from './skeletons';
import type { Playlist } from '../types';

interface PlaylistListProps {
  playlists: Playlist[];
  selectedPlaylist: Playlist | null;
  onPlaylistSelect: (playlist: Playlist) => void;
  onPlaylistPlay?: (playlist: Playlist) => void; // Optional play handler
  loading?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export const PlaylistList: React.FC<PlaylistListProps> = ({
  playlists,
  onPlaylistSelect,
  onPlaylistPlay,
  loading = false,
  refreshControl,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const styles = createStyles(theme);

  if (loading) {
    const skeletonData = Array.from({ length: 8 }, (_, i) => ({
      id: `skeleton-${i}`,
    }));
    return (
      <FlatList
        data={skeletonData}
        renderItem={() => <PlaylistCardSkeleton />}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      />
    );
  }

  if (playlists.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{t('playlists.empty')}</Text>
      </View>
    );
  }

  const renderPlaylist = ({ item }: { item: Playlist }) => {
    return (
      <PlaylistCard
        playlist={item}
        onPress={() => onPlaylistSelect(item)}
        onPlayPress={() => onPlaylistPlay?.(item)}
      />
    );
  };

  return (
    <FlatList
      data={playlists}
      renderItem={renderPlaylist}
      keyExtractor={item => item.id}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    />
  );
};

const createStyles = (theme: Theme) =>
  /* eslint-disable */
  StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      fontSize: 16,
      textAlign: 'center',
      color: theme.colors.textSecondary,
    },
    list: {
      flex: 1,
      paddingHorizontal: 16,
    },
    content: {
      paddingBottom: 100, // Space for audio player
      paddingTop: 8,
      gap: 8,
    },
  });
