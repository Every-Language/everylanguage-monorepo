import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
  Image,
} from 'react-native';
import { useTheme } from '@/shared/hooks';
import type { Playlist } from '../types';
import { MaterialIcons } from '@expo/vector-icons';
import type { Theme } from '@everylanguage/shared-native-ui';
import { imageDownloadManager } from '@/features/downloads/services';

type PlaylistCardProps = {
  playlist: Playlist;
  onPress: () => void;
  onPlayPress?: () => void; // Optional play handler
  hasPlayableItems?: boolean; // Whether the playlist has playable items
  showMetadata?: boolean; // Show chapter counts and media availability
};

/**
 * PlaylistCard component
 */
const PlaylistCardBase: React.FC<PlaylistCardProps> = ({
  playlist,
  onPress,
  onPlayPress,
  hasPlayableItems = true, // Default to true to avoid fetching items count
  showMetadata: _showMetadata = false,
}) => {
  const { theme } = useTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Create theme-aware styles
  const styles = createStyles(theme);

  // Resolve playlist image URI
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!playlist.image_id) {
        if (isMounted) setImageUri(null);
        return;
      }
      try {
        const uri = await imageDownloadManager.resolveImageUrl(
          playlist.image_id
        );
        if (isMounted) setImageUri(uri);
      } catch {
        if (isMounted) setImageUri(null);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [playlist.image_id]);

  const handlePlayPress = (e: GestureResponderEvent) => {
    e.stopPropagation(); // Prevent triggering onPress
    if (hasPlayableItems && onPlayPress) {
      onPlayPress();
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialIcons
              name='queue-music'
              size={32}
              color={theme.colors.textSecondary}
            />
          </View>
        )}
      </View>
      <View style={styles.textContent}>
        <Text
          style={styles.playlistName}
          numberOfLines={1}
          ellipsizeMode='tail'>
          {playlist.title}
        </Text>
        <Text
          style={styles.playlistDescription}
          numberOfLines={1}
          ellipsizeMode='tail'>
          {playlist.description}
        </Text>
      </View>
      {onPlayPress && (
        <TouchableOpacity
          style={[
            styles.playButton,
            !hasPlayableItems && styles.playButtonDisabled,
          ]}
          onPress={handlePlayPress}
          disabled={!hasPlayableItems}>
          <MaterialIcons
            name='play-circle-outline'
            size={32}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) =>
  /* eslint-disable */
  StyleSheet.create({
    container: {
      borderRadius: 12,
      backgroundColor: theme.colors.surface || theme.colors.background,
      shadowColor: theme.colors.shadow,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      flex: 1,
    },
    imageContainer: {
      height: 64,
      aspectRatio: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imagePlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textContent: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
      flex: 1,
    },
    playlistName: {
      fontWeight: '600',
      fontSize: 18,
      color: theme.colors.text,
    },
    playlistDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    playButton: {
      paddingHorizontal: 4,
      borderRadius: 6,
    },
    playButtonDisabled: {
      opacity: 0.4,
    },
  });

export const PlaylistCard = React.memo(PlaylistCardBase, (prev, next) => {
  return (
    prev.playlist.id === next.playlist.id &&
    prev.playlist.image_id === next.playlist.image_id &&
    prev.onPress === next.onPress &&
    prev.onPlayPress === next.onPlayPress &&
    prev.hasPlayableItems === next.hasPlayableItems
  );
});
