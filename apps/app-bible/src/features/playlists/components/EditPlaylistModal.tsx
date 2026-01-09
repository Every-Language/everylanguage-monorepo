import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme, useLocalization } from '@/shared/hooks';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';
import { PlaylistForm } from './PlaylistForm';
import { PlaylistImageUpload } from './PlaylistImageUpload';
import { usePlaylistMutations } from '../hooks/usePlaylistMutations';
import { useToastStore } from '@everylanguage/shared-native-ui';
import { useQueryClient } from '@tanstack/react-query';
import type { Playlist } from '../types';

type RouteParams = { playlist: Playlist };

export const EditPlaylistModal: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { editPlaylist } = usePlaylistMutations();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  const { playlist } = route.params as RouteParams;

  const initialValues = useMemo(
    () => ({
      title: playlist?.title ?? '',
      description: playlist?.description ?? '',
    }),
    [playlist]
  );

  const handleClose = () => {
    navigation.goBack();
  };

  const handleImageUploaded = () => {
    // Invalidate playlist queries to refresh the UI with the new image
    queryClient.invalidateQueries({ queryKey: ['playlists'] });
    queryClient.invalidateQueries({ queryKey: ['playlist', playlist.id] });
  };

  const handleImageRemoved = () => {
    // Invalidate playlist queries to refresh the UI without the image
    queryClient.invalidateQueries({ queryKey: ['playlists'] });
    queryClient.invalidateQueries({ queryKey: ['playlist', playlist.id] });
  };

  const handleSubmit = async (values: {
    title: string;
    description?: string | undefined;
  }) => {
    if (!playlist?.id) return;
    try {
      await editPlaylist.mutateAsync({
        playlistId: playlist.id,
        updates: { title: values.title, description: values.description ?? '' },
      });
      showToast(
        t('playlists.playlistUpdated', 'Playlist updated successfully!'),
        'success'
      );
      navigation.goBack();
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
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        submitLabel={t('common.save', 'Save')}
        isSubmitting={editPlaylist.isPending}
        imageUploadComponent={
          <PlaylistImageUpload
            playlistId={playlist.id}
            currentImageId={playlist.image_id ?? null}
            onImageUploaded={handleImageUploaded}
            onImageRemoved={handleImageRemoved}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
