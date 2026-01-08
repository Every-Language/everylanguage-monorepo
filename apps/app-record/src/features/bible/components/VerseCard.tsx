import React from 'react';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MenuView, MenuAction } from '@react-native-menu/menu';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import { useShare } from '@/features/sharing/hooks/useShare';
// Use MediaPlayerService directly for chapter playback
import { useVerseStore } from '@/features/media/store/VerseStore';
import type { ChapterMediaOptions } from '@/features/media/types';
import {
  playChapterWithAutoOpen,
  playChapterFromVerseWithAutoOpen,
} from '@/features/media/utils/autoOpenHelper';
import {
  getVerseMenuActions,
  handleVerseMenuAction,
} from '@/features/bible/utils/verseMenu';
import type { Verse, VerseText } from '../types';
import type { Theme } from '@/shared/types/theme';

interface VerseCardProps {
  verse: Verse;
  verseText?: VerseText | null;
  onPress?: () => void;
  theme?: Theme;
  testID?: string;
  /** Chapter information for sharing context */
  chapterInfo?: {
    chapterId: string;
    bookName: string;
    chapterNumber: number;
  };
  /** Current audio version ID for sharing */
  currentAudioVersionId?: string;
  /** Current text version ID for sharing */
  currentTextVersionId?: string;
  /** Show menu with share and bookmark options */
  showMenu?: boolean;
}

export const VerseCard: React.FC<VerseCardProps> = React.memo(
  ({
    verse,
    verseText,
    onPress,
    theme: propTheme,
    testID,
    chapterInfo,
    currentAudioVersionId,
    currentTextVersionId,
    showMenu = false,
  }) => {
    const { theme: defaultTheme } = useTheme();
    const { t } = useLocalization();
    const theme = propTheme || defaultTheme;
    const { shareVerse } = useShare();
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
        'VerseCard'
      );
    };

    const playChapter = async (
      chapterId: string,
      options?: ChapterMediaOptions
    ) => {
      await playChapterWithAutoOpen(chapterId, options, 'VerseCard');
    };
    const { seekToVerse } = useVerseStore();

    const styles = StyleSheet.create({
      container: {
        backgroundColor: theme.colors.surface || theme.colors.background,
        borderRadius: 12,
        marginHorizontal: 16,
        marginVertical: 6,
      },
      verseContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
      },
      textContainer: {
        flex: 1,
        padding: 16,
      },
      menuContainer: {
        padding: 8,
        alignItems: 'center',
        justifyContent: 'flex-start',
      },
      menuButton: {
        padding: 8,
        borderRadius: 6,
      },
      content: {
        fontSize: 16,
        lineHeight: 24,
        color: theme.colors.text,
      },
      verseNumberInline: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.primary || theme.colors.text,
      },
      placeholderText: {
        fontSize: 16,
        lineHeight: 24,
        color: theme.colors.textSecondary || theme.colors.text,
        fontStyle: 'italic',
        opacity: 0.7,
      },
    });

    const handlePress = () => {
      onPress?.();
    };

    const onMenuAction = async ({
      nativeEvent,
    }: {
      nativeEvent: { event: string };
    }) => {
      const id = nativeEvent.event;
      await handleVerseMenuAction(id, {
        verseId: verse.id,
        chapterId: chapterInfo!.chapterId,
        bookName: chapterInfo!.bookName,
        chapterNumber: chapterInfo!.chapterNumber,
        verseNumber: verse.verse_number,
        verseText: verseText?.verse_text ?? null,
        shareVerse,
        playChapterFromVerse,
        playChapter,
        seekToVerse,
        ...(currentAudioVersionId ? { currentAudioVersionId } : {}),
        ...(currentTextVersionId ? { currentTextVersionId } : {}),
      });
    };

    const menuActions: MenuAction[] = getVerseMenuActions();

    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.verseContent}>
          <TouchableOpacity
            style={styles.textContainer}
            onPress={handlePress}
            activeOpacity={0.7}>
            <Text
              style={
                verseText?.verse_text ? styles.content : styles.placeholderText
              }>
              <Text
                style={
                  styles.verseNumberInline
                }>{`${verse.verse_number} `}</Text>
              {verseText?.verse_text ||
                t('bible.noVerseText', {
                  defaultValue: 'Verse text not available',
                })}
            </Text>
          </TouchableOpacity>

          {showMenu && chapterInfo && (
            <View style={styles.menuContainer}>
              <MenuView onPressAction={onMenuAction} actions={menuActions}>
                <TouchableOpacity style={styles.menuButton}>
                  <MaterialIcons
                    name='more-vert'
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </MenuView>
            </View>
          )}
        </View>
      </View>
    );
  }
);

VerseCard.displayName = 'VerseCard';
