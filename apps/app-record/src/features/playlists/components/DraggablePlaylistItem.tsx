import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { PlaylistItemCard } from './PlaylistItemCard';
import type { PlaylistItemWithVerses } from '../types';

type DraggablePlaylistItemProps = {
  playlistItem: PlaylistItemWithVerses;
  onVersePress: () => void;
  onDelete?: ((itemId: string) => void | Promise<void>) | undefined;
  isDragEnabled?: boolean;
  showDeleteButton?: boolean;
  drag?: () => void;
  isActive?: boolean;
  isDeleting?: boolean;
};

/**
 * Draggable wrapper for PlaylistItemCard
 * Adds drag handle and delete button
 */
export const DraggablePlaylistItem: React.FC<DraggablePlaylistItemProps> = ({
  playlistItem,
  onVersePress,
  onDelete,
  isDragEnabled = true,
  showDeleteButton = true,
  drag,
  isActive = false,
  isDeleting = false,
}) => {
  const { theme } = useTheme();

  const handleDelete = () => {
    if (onDelete && !isDeleting) {
      onDelete(playlistItem.id);
    }
  };

  return (
    <View
      style={[
        styles.container,
        isActive && styles.activeContainer,
        isDeleting && styles.deletingContainer,
      ]}>
      {/* Drag Handle */}
      {isDragEnabled && drag && !isDeleting && (
        <TouchableOpacity
          onLongPress={drag}
          style={styles.dragHandle}
          activeOpacity={0.7}
          disabled={isDeleting}>
          <MaterialIcons
            name='drag-indicator'
            size={24}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      )}

      {/* Loading Indicator (in place of drag handle when deleting) */}
      {isDeleting && (
        <View style={styles.dragHandle}>
          <ActivityIndicator size='small' color={theme.colors.primary} />
        </View>
      )}

      {/* Playlist Item Card */}
      <View style={[styles.cardContainer, isDeleting && styles.cardDeleting]}>
        <PlaylistItemCard
          playlistItem={playlistItem}
          onVersePress={onVersePress}
        />
      </View>

      {/* Delete Button */}
      {showDeleteButton && onDelete && (
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.deleteButton}
          activeOpacity={0.7}
          disabled={isDeleting}>
          {isDeleting ? (
            <ActivityIndicator size='small' color={theme.colors.error} />
          ) : (
            <MaterialIcons
              name='delete-outline'
              size={24}
              color={theme.colors.error}
            />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  activeContainer: {
    opacity: 0.8,
    transform: [{ scale: 1.02 }],
  },
  deletingContainer: {
    opacity: 0.5,
  },
  dragHandle: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  cardContainer: {
    flex: 1,
  },
  cardDeleting: {
    opacity: 0.6,
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
});
