import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MenuView, MenuAction } from '@react-native-menu/menu';
import { PlayButton } from './PlayButton';
import { useTheme } from '@/shared/hooks';
import type { Theme } from '@/shared/types/theme';

export interface DetailsProps {
  title: string;
  subtitle: string;
  albumArt?: ImageSourcePropType | undefined;
  onSharePress: () => void;
  playButtonProps?:
    | {
        type: 'chapter';
        id: string;
        onPress: () => void;
      }
    | undefined;
  menuActions: MenuAction[];
  onMenuAction: ({ nativeEvent }: { nativeEvent: { event: string } }) => void;

  testID?: string;
  availability?: {
    state: 'streaming' | 'downloading' | 'downloaded';
    progress?: number;
  };
  onPressAvailability?: () => void;
}

const ALBUM_ART_PADDING = 40;
const DETAILS_PADDING = 24;

// Get responsive album art size based on screen width
const getAlbumArtSize = () => {
  const { width } = Dimensions.get('window');
  const availableWidth = width - ALBUM_ART_PADDING * 2;
  // Scale album art between 160px and 200px based on screen size
  return Math.min(200, Math.max(160, availableWidth * 0.4));
};

export const Details: React.FC<DetailsProps> = ({
  title,
  subtitle,
  albumArt,
  onSharePress,
  playButtonProps,
  menuActions,
  onMenuAction,
  testID,
  availability,
  onPressAvailability,
}) => {
  const { theme } = useTheme();
  const albumArtSize = getAlbumArtSize();
  const styles = createStyles(theme, albumArtSize);

  return (
    <View style={styles.container} testID={testID}>
      {/* Album Art Section */}
      <View style={styles.albumSection}>
        {albumArt && (
          <View style={styles.albumArtContainer}>
            <Image
              source={albumArt}
              style={styles.albumArt}
              resizeMode='contain'
            />
          </View>
        )}
      </View>

      {/* Title and Subtitle Section */}
      <View style={styles.detailsSection}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>

        {/* Action Row */}
        <View style={styles.actionRow}>
          {/* Availability Indicator (left side of row) */}
          {availability && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onPressAvailability}
              disabled={availability.state === 'downloaded'}>
              {availability.state === 'downloaded' ? (
                <MaterialIcons
                  name='download-done'
                  size={24}
                  color={theme.colors.primary}
                />
              ) : availability.state === 'downloading' ? (
                <View style={styles.availabilityPad}>
                  <MaterialIcons
                    name='downloading'
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
              ) : (
                <MaterialIcons
                  name='cloud-download'
                  size={24}
                  color={theme.colors.textSecondary}
                />
              )}
            </TouchableOpacity>
          )}
          {/* Menu */}
          <MenuView onPressAction={onMenuAction} actions={menuActions}>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons
                name='more-horiz'
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          </MenuView>

          {/* Share */}
          <TouchableOpacity style={styles.actionButton} onPress={onSharePress}>
            <MaterialIcons name='share' size={24} color={theme.colors.text} />
          </TouchableOpacity>

          {/* Play Button */}
          {playButtonProps && (
            <PlayButton
              type={playButtonProps.type}
              id={playButtonProps.id}
              onPress={playButtonProps.onPress}
              size='large'
            />
          )}
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme, albumArtSize: number = 200) => {
  return StyleSheet.create({
    /* eslint-disable */
    container: {
      paddingBottom: 20,
    },
    albumSection: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: ALBUM_ART_PADDING,
      paddingVertical: 20,
    },
    albumArtContainer: {
      width: albumArtSize,
      height: albumArtSize,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    albumArt: {
      width: '100%',
      height: '100%',
      tintColor: theme.colors.primary,
    },
    detailsSection: {
      paddingHorizontal: DETAILS_PADDING,
      paddingBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 16,
    },
    actionButton: {
      padding: 8,
    },
    availabilityPad: {
      padding: 2,
    },
  });
};
