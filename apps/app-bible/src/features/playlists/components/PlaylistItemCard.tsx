import React, { useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useLocalization, useTheme } from '@/shared/hooks';
import type { PlaylistItemWithVerses } from '../types';
import type { Theme } from '@everylanguage/shared-native-ui';
import { VerseCard } from '@/features/bible';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type PlaylistItemCardProps = {
  playlistItem: PlaylistItemWithVerses;
  onVersePress: () => void;
  showMetadata?: boolean; // Show chapter counts and media availability
};

/**
 * PlaylistItemCard component
 */
export const PlaylistItemCard: React.FC<PlaylistItemCardProps> = ({
  playlistItem,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [verseListHeight, setVerseListHeight] = useState(0);
  const rotation = useSharedValue(0);
  const animatedHeight = useSharedValue(0);

  const animatedRotationStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const animatedHeightStyle = useAnimatedStyle(() => {
    return {
      height: animatedHeight.value,
      overflow: 'hidden',
    };
  });

  useEffect(() => {
    rotation.value = withTiming(isCollapsed ? 0 : -90, {
      duration: 250,
    });
    if (verseListHeight > 0) {
      animatedHeight.value = withTiming(isCollapsed ? 0 : verseListHeight, {
        duration: 250,
      });
    }
  }, [animatedHeight, isCollapsed, rotation, verseListHeight]);

  const isCustomText = playlistItem.playlist_item_type === 'custom_text';

  // Create theme-aware styles
  const styles = createStyles(theme);

  const getPlaylistItemName = () => {
    if (playlistItem.custom_text) {
      return null;
    }

    return playlistItem?.title;
  };

  const getVerseRange = () => {
    // Extract the verse number, which is the last part of the ID string after splitting by '-'.
    const startVerse = playlistItem?.start_verse_id?.split('-').pop();
    const endVerse = playlistItem?.end_verse_id?.split('-').pop();

    // If the start and end verses are the same, show a single verse number.
    if (startVerse === endVerse) {
      return t('bible.verse', { number: startVerse });
    }

    // Otherwise, return the formatted range.
    return (
      t('bible.verse', { number: startVerse }) +
      ' - ' +
      t('bible.verse', { number: endVerse })
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.textContent}>
        {!isCustomText && (
          <TouchableOpacity onPress={() => setIsCollapsed(prev => !prev)}>
            <View style={styles.titleContainer}>
              <Text
                style={styles.playlistName}
                numberOfLines={1}
                ellipsizeMode='tail'>
                {getPlaylistItemName()}
              </Text>

              <Text
                style={styles.verseRange}
                numberOfLines={1}
                ellipsizeMode='tail'>
                {getVerseRange()}
              </Text>
              <Animated.View style={animatedRotationStyle}>
                <MaterialCommunityIcons
                  name={'chevron-left-circle-outline'}
                  size={24}
                  color={theme.colors.primary}
                />
              </Animated.View>
            </View>
          </TouchableOpacity>
        )}
        {isCustomText && (
          <Text style={styles.playlistItemCustomText}>
            {playlistItem.custom_text}
          </Text>
        )}
        {!isCustomText && (
          <Animated.View
            style={[styles.verseListContainer, animatedHeightStyle]}>
            <View
              style={styles.verseListContent}
              onLayout={(event: LayoutChangeEvent) => {
                const height = event.nativeEvent.layout.height;
                if (height > 0 && height !== verseListHeight) {
                  setVerseListHeight(height);
                }
              }}>
              {playlistItem.verses.map(item => (
                <VerseCard
                  key={item.verse.id}
                  verse={item.verse}
                  verseText={item.verseText}
                />
              ))}
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    /*eslint-disable */
    container: {
      borderRadius: 24,
      backgroundColor: theme.colors.secondary || theme.colors.background,
      shadowColor: theme.colors.shadow,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      gap: 8,
      flex: 1,
    },
    textContent: {
      paddingHorizontal: 0,
      paddingVertical: 10,
      flex: 1,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    playlistName: {
      fontWeight: '600',
      fontSize: 18,
      color: theme.colors.text,
    },
    verseRange: {
      fontSize: 14,
      color: theme.colors.text,
      marginLeft: 'auto',
      marginRight: 8,
    },
    playlistItemCustomText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      paddingHorizontal: 16,
    },
    playButton: {
      paddingHorizontal: 4,
      borderRadius: 6,
    },
    verseListContainer: {},
    verseListContent: {
      position: 'absolute',
      width: '100%',
    },
  });
};
