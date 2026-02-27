import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, useLocalization } from '@/shared/hooks';
import { PlaylistForm } from './PlaylistForm';
import type {
  RootStackNavigationProp,
  RootStackParamList,
} from '@/app/navigation/RootNavigator';
import { usePlaylistMutations } from '../hooks/usePlaylistMutations';
import { useToastStore } from '@everylanguage/shared-native-ui';
import logger from '@/shared/utils/logger';

type CreatePlaylistModalProps = NativeStackScreenProps<
  RootStackParamList,
  'CreatePlaylistModal'
>;

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  route,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const { createPlaylist, addToPlaylist, addVerseRangeToPlaylist } =
    usePlaylistMutations();
  const { showToast } = useToastStore();

  const params = route.params;

  const handleClose = () => {
    navigation.goBack();
  };

  const handleSubmit = async (values: {
    title: string;
    description?: string | undefined;
  }) => {
    try {
      const result = await createPlaylist.mutateAsync({
        title: values.title,
        description: values.description ?? '',
      });

      // If there are params, add the content to the newly created playlist
      if (params) {
        try {
          // Check if it's a verse range addition
          if (params?.startVerseId && params?.endVerseId) {
            await addVerseRangeToPlaylist.mutateAsync({
              playlistId: result.id,
              startVerseId: params.startVerseId,
              endVerseId: params.endVerseId,
            });
            showToast(
              t(
                'playlists.playlistCreatedWithRange',
                'Playlist created and verse range added!'
              ),
              'success'
            );
          }
          // Check if it's a chapter addition
          else if (params.chapterId) {
            await addToPlaylist.mutateAsync({
              playlistId: result.id,
              chapterId: params.chapterId,
            });
            showToast(
              t(
                'playlists.playlistCreatedWithChapter',
                'Playlist created and chapter added!'
              ),
              'success'
            );
          } else {
            showToast(
              t('playlists.playlistCreated', 'Playlist created successfully!'),
              'success'
            );
          }
        } catch (addError) {
          logger.error(
            true,
            '[CreatePlaylistModal] Error adding content to playlist:',
            addError
          );
          // Still show success for playlist creation, but warn about content addition
          showToast(
            t('playlists.playlistCreated', 'Playlist created successfully!'),
            'success'
          );
          const errorMessage =
            addError instanceof Error
              ? addError.message
              : t(
                  'playlists.contentAddError',
                  'Failed to add content to playlist. Please try again.'
                );
          showToast(errorMessage, 'error');
        }
      } else {
        showToast(
          t('playlists.playlistCreated', 'Playlist created successfully!'),
          'success'
        );
      }

      navigation.goBack();
      setTimeout(() => {
        // Navigate: Root 'Home' -> Tab 'Playlists' -> Stack 'PlaylistItems'
        navigation.replace('Home', {
          screen: 'Playlists',
          params: {
            screen: 'PlaylistItems',
            params: { playlist: result },
          },
        });
      }, 100);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : t('errors.generic', 'Something went wrong');
      showToast(message, 'error');
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.modalBackground,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}>
      <PlaylistForm
        onSubmit={handleSubmit}
        onCancel={handleClose}
        submitLabel={t('common.create', 'Create')}
        isSubmitting={createPlaylist.isPending}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
