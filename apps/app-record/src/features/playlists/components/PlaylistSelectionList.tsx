import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useLocalization } from '@/shared/hooks';
import type { Playlist } from '../types';

interface PlaylistSelectionListProps {
  playlists: Playlist[];
  loading: boolean;
  onCreateNewPlaylist: () => void;
  onSelectPlaylist: (playlist: Playlist) => void;
}

export const PlaylistSelectionList: React.FC<PlaylistSelectionListProps> = ({
  playlists,
  loading,
  onCreateNewPlaylist,
  onSelectPlaylist,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const renderCreatePlaylistButton = () => (
    <TouchableOpacity
      style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
      onPress={onCreateNewPlaylist}>
      <Ionicons
        name='add-circle-outline'
        size={20}
        color={theme.colors.textInverse}
      />
      <Text
        style={[styles.createButtonText, { color: theme.colors.textInverse }]}>
        {t('playlists.createNewPlaylist', 'Create New Playlist')}
      </Text>
    </TouchableOpacity>
  );

  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity
      style={[
        styles.playlistItem,
        {
          backgroundColor:
            theme.mode === 'light'
              ? theme.colors.surface
              : theme.colors.surfaceVariant,
        },
      ]}
      onPress={() => onSelectPlaylist(item)}>
      <View style={styles.playlistInfo}>
        <Text style={[styles.playlistTitle, { color: theme.colors.text }]}>
          {item.title}
        </Text>
        {item.description ? (
          <Text
            style={[
              styles.playlistDescription,
              { color: theme.colors.textSecondary },
            ]}
            numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name='chevron-forward'
        size={20}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name='musical-notes-outline'
        size={48}
        color={theme.colors.textSecondary}
      />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {t('playlists.noPlaylists', 'No playlists yet')}
      </Text>
      <Text
        style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
        {t(
          'playlists.createFirstPlaylist',
          'Create your first playlist to get started'
        )}
      </Text>
    </View>
  );
  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={renderCreatePlaylistButton}
          renderItem={renderPlaylistItem}
          ListEmptyComponent={renderEmptyComponent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    paddingHorizontal: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  playlistInfo: {
    flex: 1,
    marginRight: 12,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  playlistDescription: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
