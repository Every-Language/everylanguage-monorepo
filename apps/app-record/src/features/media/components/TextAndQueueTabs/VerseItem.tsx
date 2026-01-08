import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { MenuView } from '@react-native-menu/menu';
import { VerseCard as VerseCardAnimated } from '../VerseCard';
import {
  getVerseMenuActions,
  handleVerseMenuAction,
} from '@/features/bible/utils/verseMenu';
import { useShare } from '@/features/sharing/hooks/useShare';
import { useCurrentVersions } from '@/features/languages/hooks';
import { useVerseStore } from '../../store/VerseStore';
import type { VerseRow } from '../../store/VerseStore';
import type { ChapterMediaOptions } from '../../types';
import {
  playChapterWithAutoOpen,
  playChapterFromVerseWithAutoOpen,
} from '../../utils/autoOpenHelper';
import type { BibleTrack } from '../../types/track-player';

// @ts-expect-error - Icon type definitions not available
import Icon from 'react-native-vector-icons/Ionicons';

interface VerseItemProps {
  verse: VerseRow;
  isActive: boolean;
  chapterId: string;
  onPress: () => Promise<void>;
  currentTrack?: BibleTrack | null;
}

export const VerseItem: React.FC<VerseItemProps> = React.memo(
  function VerseItem({ verse, isActive, chapterId, onPress, currentTrack }) {
    const { theme } = useTheme();
    const { shareVerse } = useShare();
    const { currentAudioVersion, currentTextVersion } = useCurrentVersions();
    // Use enhanced playChapter functions with auto-open logic
    const playChapterFromVerse = async (
      chapterId: string,
      verseId: string,
      options?: ChapterMediaOptions
    ) => {
      await playChapterFromVerseWithAutoOpen(
        chapterId,
        verseId,
        options,
        'VerseItem'
      );
    };

    const playChapter = async (
      chapterId: string,
      options?: ChapterMediaOptions
    ) => {
      await playChapterWithAutoOpen(chapterId, options, 'VerseItem');
    };
    const { seekToVerse } = useVerseStore();

    return (
      <View>
        <VerseCardAnimated
          id={verse.id}
          number={verse.number}
          text={verse.text}
          active={isActive}
          chapterId={chapterId}
          onPress={onPress}
        />
        <View style={styles.absTopRight12}>
          <MenuView
            actions={getVerseMenuActions({
              includeShareText: true,
              includeShareAudio: true,
              includePlay: false,
            })}
            onPressAction={async ({ nativeEvent }) => {
              await handleVerseMenuAction(nativeEvent.event, {
                verseId: verse.id,
                chapterId,
                bookName: currentTrack?.bookName || 'Unknown',
                chapterNumber: currentTrack?.chapterNumber || 0,
                verseNumber: verse.number,
                verseText: verse.text ?? null,
                ...(currentAudioVersion?.id
                  ? { currentAudioVersionId: currentAudioVersion.id }
                  : {}),
                ...(currentTextVersion?.id
                  ? { currentTextVersionId: currentTextVersion.id }
                  : {}),
                shareVerse: async (verseId, options) =>
                  shareVerse(verseId, options),
                playChapterFromVerse: async (chapterId, verseId, options) => {
                  const opts = {
                    preferOffline: true,
                    ...(options?.audioVersionId
                      ? { audioVersionId: options.audioVersionId }
                      : {}),
                    ...(options?.textVersionId
                      ? { textVersionId: options.textVersionId }
                      : {}),
                  } as Parameters<typeof playChapterFromVerse>[2];
                  await playChapterFromVerse(chapterId, verseId, opts);
                },
                playChapter: async (chapterId, options) => {
                  const opts = {
                    preferOffline: true,
                    ...(options?.audioVersionId
                      ? { audioVersionId: options.audioVersionId }
                      : {}),
                    ...(options?.textVersionId
                      ? { textVersionId: options.textVersionId }
                      : {}),
                  } as Parameters<typeof playChapter>[1];
                  await playChapter(chapterId, opts);
                },
                seekToVerse: async verseId => seekToVerse(verseId),
              });
            }}>
            <TouchableOpacity style={styles.iconButton}>
              <Icon
                name='ellipsis-horizontal'
                size={16}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          </MenuView>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  absTopRight12: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
