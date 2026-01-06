import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLocalization } from '@/shared/hooks';
import { useToastStore } from '@everylanguage/shared-native-ui';
import { usePlaylistMutations } from './usePlaylistMutations';
import type {
  RootStackNavigationProp,
  RootStackParamList,
} from '@/app/navigation/RootNavigator';
import type { Playlist } from '../types';
import logger from '@/shared/utils/logger';

type AddToPlaylistModalParams = NativeStackScreenProps<
  RootStackParamList,
  'AddToPlaylistModal'
>['route']['params'];

interface UseAddToPlaylistFlowProps {
  params: AddToPlaylistModalParams;
}

export const useAddToPlaylistFlow = ({ params }: UseAddToPlaylistFlowProps) => {
  const { t } = useLocalization();
  const navigation = useNavigation<RootStackNavigationProp>();
  const { showToast } = useToastStore();
  const { addToPlaylist, addVerseRangeToPlaylist } = usePlaylistMutations();

  const { chapterId, bookName, chapterNumber } = params;

  // Determine if verse range selection should be shown
  const showVerseRangeSelection = Boolean(
    chapterId && bookName && chapterNumber
  );

  // State management
  const [step, setStep] = useState<'verse-range' | 'playlist-selection'>(
    showVerseRangeSelection ? 'verse-range' : 'playlist-selection'
  );
  const [selectedStartVerseId, setSelectedStartVerseId] = useState<
    string | null
  >(null);
  const [selectedEndVerseId, setSelectedEndVerseId] = useState<string | null>(
    null
  );

  /**
   * Handles confirmation of verse range selection
   */
  const handleVerseRangeConfirm = useCallback(
    (startVerseId: string, endVerseId: string) => {
      setSelectedStartVerseId(startVerseId);
      setSelectedEndVerseId(endVerseId);
      setStep('playlist-selection');
    },
    []
  );

  /**
   * Handles adding content to an existing playlist
   */
  const handleAddToPlaylist = useCallback(
    async (playlistItem: Playlist): Promise<void> => {
      try {
        if (showVerseRangeSelection) {
          // Add verse range to playlist
          if (!selectedStartVerseId || !selectedEndVerseId) {
            Alert.alert(
              t('common.error', 'Error'),
              t('playlists.noVerseRangeSelected', 'No verse range selected')
            );
            return;
          }

          await addVerseRangeToPlaylist.mutateAsync({
            playlistId: playlistItem.id,
            startVerseId: selectedStartVerseId,
            endVerseId: selectedEndVerseId,
          });

          showToast(
            t('playlists.addedToPlaylist', 'Added to {{playlistName}}', {
              playlistName: playlistItem.title,
            }),
            'success'
          );
        } else {
          // Add chapter to playlist
          if (!chapterId) {
            Alert.alert(
              t('common.error', 'Error'),
              t('playlists.noChapterSelected', 'No chapter selected')
            );
            return;
          }

          await addToPlaylist.mutateAsync({
            playlistId: playlistItem.id,
            chapterId,
          });

          showToast(
            t(
              'playlists.chapterAddedSuccess',
              'Chapter added to "{{title}}" successfully!',
              { title: playlistItem.title }
            ),
            'success'
          );
        }

        // Close modal on success
        navigation.goBack();
      } catch (error) {
        logger.error(
          true,
          '[useAddToPlaylistFlow] Error adding to playlist:',
          error
        );
        const errorMessage =
          error instanceof Error
            ? error.message
            : t(
                'playlists.chapterAddError',
                'Failed to add chapter to playlist. Please try again.'
              );
        showToast(errorMessage, 'error');
      }
    },
    [
      showVerseRangeSelection,
      selectedStartVerseId,
      selectedEndVerseId,
      chapterId,
      addToPlaylist,
      addVerseRangeToPlaylist,
      showToast,
      navigation,
      t,
    ]
  );

  /**
   * Handles navigation to create new playlist modal
   */
  const handleCreateNewPlaylist = useCallback(() => {
    const createPlaylistParams: {
      chapterId?: string;
      bookName?: string;
      chapterNumber?: number;
      startVerseId?: string;
      endVerseId?: string;
    } = {};

    if (showVerseRangeSelection && selectedStartVerseId && selectedEndVerseId) {
      // For verse range: pass the selected range
      if (chapterId) {
        createPlaylistParams.chapterId = chapterId;
      }
      createPlaylistParams.startVerseId = selectedStartVerseId;
      createPlaylistParams.endVerseId = selectedEndVerseId;
    } else if (chapterId) {
      // For chapter: pass chapter info
      createPlaylistParams.chapterId = chapterId;
      if (bookName) {
        createPlaylistParams.bookName = bookName;
      }
      if (chapterNumber !== undefined) {
        createPlaylistParams.chapterNumber = chapterNumber;
      }
    }

    navigation.goBack();
    navigation.navigate('CreatePlaylistModal', createPlaylistParams);
  }, [
    showVerseRangeSelection,
    selectedStartVerseId,
    selectedEndVerseId,
    chapterId,
    bookName,
    chapterNumber,
    navigation,
  ]);

  /**
   * Handles closing the modal and resetting state
   */
  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  /**
   * Determine the header title based on current step
   */
  const headerTitle =
    step === 'verse-range'
      ? t('playlists.selectVerseRange', 'Select Verse Range')
      : t('playlists.addToPlaylist', 'Add to Playlist');

  return {
    // State
    step,
    showVerseRangeSelection,
    selectedStartVerseId,
    selectedEndVerseId,
    headerTitle,
    // Params
    chapterId,
    bookName,
    chapterNumber,
    // Handlers
    handleVerseRangeConfirm,
    handleAddToPlaylist,
    handleCreateNewPlaylist,
    handleClose,
  };
};
