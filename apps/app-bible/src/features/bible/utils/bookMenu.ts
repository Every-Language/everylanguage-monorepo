import type { MenuAction } from '@react-native-menu/menu';
import { i18n } from '@/shared/services';

export interface BookMenuHandlers {
  shareBook: (
    bookId: string,
    options?: {
      title?: string;
      customText?: string;
      shareType?: 'audio' | 'text';
      audioVersionId?: string;
      textVersionId?: string;
      isVersionAgnostic?: boolean;
    }
  ) => Promise<
    { success: boolean } | { success: true; shareId: string } | null
  >;
}

export interface BookMenuParams extends BookMenuHandlers {
  bookId: string;
  bookName?: string;
  currentAudioVersionId?: string;
  currentTextVersionId?: string;
}

export const getBookMenuActions = (opts: {
  hasMediaFiles: boolean;
  withIcons?: boolean;
  includeShareText?: boolean; // default true
  includeShareAudio?: boolean; // default true
}): MenuAction[] => {
  const withIcons = opts.withIcons ?? true;
  const includeShareText = opts.includeShareText ?? true;
  const includeShareAudio = opts.includeShareAudio ?? true;
  const actions: MenuAction[] = [];

  if (includeShareText) {
    actions.push(
      withIcons
        ? {
            id: 'share_text',
            title: i18n.t('sharing.shareText', 'Share Text'),
            image: 'square.and.arrow.up',
          }
        : { id: 'share_text', title: i18n.t('sharing.shareText', 'Share Text') }
    );
  }

  if (includeShareAudio && opts.hasMediaFiles) {
    actions.push(
      withIcons
        ? {
            id: 'share_audio',
            title: i18n.t('sharing.shareAudio', 'Share Audio'),
            image: 'speaker.wave.2',
          }
        : {
            id: 'share_audio',
            title: i18n.t('sharing.shareAudio', 'Share Audio'),
          }
    );
  }

  return actions;
};

export const handleBookMenuAction = async (
  actionId: string,
  params: BookMenuParams
): Promise<void> => {
  if (actionId === 'share_text' || actionId === 'share_audio') {
    const { shareBook, bookId } = params;
    try {
      const title =
        params.bookName || i18n.t('bible.unknownBook', 'Bible Book');
      const options = {
        title,
        customText: i18n.t('bible.shareBookMessage', {
          title,
        }) as string,
        ...(params.currentAudioVersionId
          ? { audioVersionId: params.currentAudioVersionId }
          : {}),
        ...(params.currentTextVersionId
          ? { textVersionId: params.currentTextVersionId }
          : {}),
        ...(actionId === 'share_audio' ? { shareType: 'audio' as const } : {}),
      } as const;
      await shareBook(bookId, options);
    } catch {
      // swallow
    }
    return;
  }
};
