import type { MenuAction } from '@react-native-menu/menu';
import { i18n } from '@/shared/services';
import { Alert } from 'react-native';

export interface VerseMenuHandlers {
  shareVerse: (
    verseId: string,
    options?: {
      title?: string;
      customText?: string;
      audioVersionId?: string;
      textVersionId?: string;
      isVersionAgnostic?: boolean;
    }
  ) => Promise<unknown>;
  playChapterFromVerse?: (
    chapterId: string,
    verseId: string,
    options?: {
      audioVersionId?: string;
      textVersionId?: string;
      preferOffline?: boolean;
    }
  ) => Promise<void>;
  playChapter?: (
    chapterId: string,
    options?: {
      audioVersionId?: string;
      textVersionId?: string;
      preferOffline?: boolean;
    }
  ) => Promise<void>;
  seekToVerse?: (verseId: string) => Promise<void>;
}

export interface VerseContextParams {
  verseId: string;
  chapterId: string;
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  verseText?: string | null;
  currentAudioVersionId?: string;
  currentTextVersionId?: string;
}

export const getVerseMenuActions = (opts?: {
  includeShareText?: boolean; // default true
  includeShareAudio?: boolean; // default true
  includePlay?: boolean; // default true
}): MenuAction[] => {
  const includeShareText = opts?.includeShareText ?? true;
  const includeShareAudio = opts?.includeShareAudio ?? true;
  const includePlay = opts?.includePlay ?? true;
  const actions: MenuAction[] = [];
  if (includeShareText) {
    actions.push({
      id: 'share_text',
      title: i18n.t('sharing.shareText', 'Share Text'),
      image: 'square.and.arrow.up',
    });
  }
  if (includeShareAudio) {
    actions.push({
      id: 'share_audio',
      title: i18n.t('sharing.shareAudio', 'Share Audio'),
      image: 'speaker.wave.2',
    });
  }
  if (includePlay) {
    actions.push({ id: 'play', title: i18n.t('audio.play'), image: 'play' });
  }
  actions.push({
    id: 'copy',
    title: i18n.t('bible.copy'),
    image: 'doc.on.doc',
  });
  return actions;
};

export const handleVerseMenuAction = async (
  actionId: string,
  ctx: VerseContextParams & VerseMenuHandlers
): Promise<void> => {
  const {
    verseId,
    chapterId,
    bookName,
    chapterNumber,
    verseNumber,
    verseText,
    currentAudioVersionId,
    currentTextVersionId,
    shareVerse,
    playChapterFromVerse,
    playChapter,
    seekToVerse,
  } = ctx;

  if (actionId === 'share_text' || actionId === 'share_audio') {
    const title = `${bookName} ${chapterNumber}:${verseNumber}`;
    const options: Parameters<typeof shareVerse>[1] = {
      title,
      customText: verseText
        ? `"${verseText}" - ${title}`
        : `Check out ${title}`,
      ...(currentAudioVersionId
        ? { audioVersionId: currentAudioVersionId }
        : {}),
      ...(currentTextVersionId ? { textVersionId: currentTextVersionId } : {}),
      ...(actionId === 'share_audio' ? { shareType: 'audio' as const } : {}),
    };
    await shareVerse(verseId, options);
    return;
  }

  if (actionId === 'play') {
    const options = {
      preferOffline: true,
      ...(currentAudioVersionId
        ? { audioVersionId: currentAudioVersionId }
        : {}),
      ...(currentTextVersionId ? { textVersionId: currentTextVersionId } : {}),
    } as const;
    try {
      if (playChapterFromVerse) {
        await playChapterFromVerse(chapterId, verseId, options);
      } else if (playChapter && seekToVerse) {
        await playChapter(chapterId, options);
        await seekToVerse(verseId);
      }
    } catch {
      // swallow
    }
    return;
  }

  if (actionId === 'copy') {
    try {
      const text = `${verseText ?? ''}\n\n${bookName} ${chapterNumber}:${verseNumber}`;
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(text);
      Alert.alert(i18n.t('bible.copied'), i18n.t('bible.copied'));
    } catch {
      // ignore copy failure
    }
    return;
  }
};
