import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';
import { useTheme } from '@/shared/hooks';
import type { Playlist } from '../types';
import { MaterialIcons } from '@expo/vector-icons';
import type { Theme } from '@everylanguage/shared-native-ui';

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

  // Create theme-aware styles
  const styles = createStyles(theme);

  const handlePlayPress = (e: GestureResponderEvent) => {
    e.stopPropagation(); // Prevent triggering onPress
    if (hasPlayableItems && onPlayPress) {
      onPlayPress();
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.image}>
        {/* <View style={styles.imageInner}></View> */}
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
    image: {
      height: 64,
      aspectRatio: 1,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
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
    prev.onPress === next.onPress &&
    prev.onPlayPress === next.onPlayPress &&
    prev.hasPlayableItems === next.hasPlayableItems
  );
});
