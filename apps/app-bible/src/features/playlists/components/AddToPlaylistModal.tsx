import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/shared/hooks';
import { usePlaylistsPS } from '../hooks/usePlaylistsPS';
import { useAddToPlaylistFlow } from '../hooks/useAddToPlaylistFlow';
import { VerseRangeSelection } from './VerseRangeSelection';
import { PlaylistSelectionList } from './PlaylistSelectionList';
import type { RootStackParamList } from '@/app/navigation/RootNavigator';

type AddToPlaylistModalProps = NativeStackScreenProps<
  RootStackParamList,
  'AddToPlaylistModal'
>;

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  route,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Use the custom hook for all business logic
  const {
    step,
    showVerseRangeSelection,
    headerTitle,
    chapterId,
    bookName,
    chapterNumber,
    handleVerseRangeConfirm,
    handleAddToPlaylist,
    handleCreateNewPlaylist,
    handleClose,
  } = useAddToPlaylistFlow({ params: route.params });

  const { playlists, loading: playlistsLoading } = usePlaylistsPS({
    playlistGroupId: null,
  });

  // Render content based on current step
  const renderContent = () => {
    if (step === 'verse-range' && showVerseRangeSelection && chapterId) {
      return (
        <VerseRangeSelection
          chapterId={chapterId}
          onConfirm={handleVerseRangeConfirm}
        />
      );
    }

    return (
      <>
        {/* Chapter Info - Only show in playlist selection step */}
        {bookName && chapterNumber && (
          <View
            style={[
              styles.chapterInfo,
              { backgroundColor: theme.colors.surface },
            ]}>
            <Text style={[styles.chapterTitle, { color: theme.colors.text }]}>
              {bookName} {chapterNumber}
            </Text>
          </View>
        )}
        <PlaylistSelectionList
          playlists={playlists}
          loading={playlistsLoading}
          onCreateNewPlaylist={handleCreateNewPlaylist}
          onSelectPlaylist={handleAddToPlaylist}
        />
      </>
    );
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
          paddingTop: Platform.OS === 'android' ? insets.top : 0,
        },
      ]}>
      {/* Header */}
      <View
        style={[styles.header, { borderBottomColor: theme.colors.overlay }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name='close' size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {headerTitle}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  chapterInfo: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  chapterTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
});
