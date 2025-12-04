import type { MenuAction } from '@react-native-menu/menu';
import { i18n } from '@/shared/services';
import type { ChapterWithMetadata } from '@/features/bible/types';

export interface ChapterShareParams {
  bookName?: string;
  currentAudioVersionId?: string;
  currentTextVersionId?: string;
}

export interface ChapterMenuHandlers {
  shareChapter: (
    chapterId: string,
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
  addToQueue?: (
    chapterId: string,
    options?: {
      audioVersionId?: string;
      textVersionId?: string;
      preferOffline?: boolean;
    }
  ) => Promise<void>;
  openAddToPlaylist?: (chapter: ChapterWithMetadata) => void;
}

export const buildChapterShareOptions = (
  chapter: ChapterWithMetadata,
  params: ChapterShareParams
) => {
  const title = params.bookName
    ? `${params.bookName} ${chapter.chapter_number}`
    : `Chapter ${chapter.chapter_number}`;

  return {
    title,
    customText: `Check out ${title} - ${chapter.total_verses} verses`,
    ...(params.currentAudioVersionId
      ? { audioVersionId: params.currentAudioVersionId }
      : {}),
    ...(params.currentTextVersionId
      ? { textVersionId: params.currentTextVersionId }
      : {}),
  } as const;
};

export const getChapterMenuActions = (
  hasMediaFiles: boolean,
  withIcons: boolean = true,
  includeAudioShare: boolean = false,
  includeShareText: boolean = true,
  includeQueue: boolean = true,
  includeDownloadActions: boolean = false,
  includePlaylistActions: boolean = true,
  downloadState?: 'streaming' | 'downloading' | 'downloaded'
): MenuAction[] => {
  const actions: MenuAction[] = [];
  if (includeQueue && hasMediaFiles)
    actions.push(
      withIcons
        ? { id: 'queue', title: i18n.t('queue.addToQueue'), image: 'plus' }
        : { id: 'queue', title: i18n.t('queue.addToQueue') }
    );
  if (includeDownloadActions && hasMediaFiles) {
    if (downloadState === 'downloaded') {
      actions.push(
        withIcons
          ? {
              id: 'remove_download_chapter',
              title: i18n.t(
                'downloads.removeDownloadedChapter',
                'Remove download'
              ),
              image: 'trash',
              titleColor: '#FF3B30',
            }
          : {
              id: 'remove_download_chapter',
              title: i18n.t(
                'downloads.removeDownloadedChapter',
                'Remove download'
              ),
            }
      );
    } else if (downloadState === 'downloading') {
      const disabledAttrs = { disabled: true } as const;
      actions.push(
        withIcons
          ? {
              id: 'downloading',
              title: i18n.t('downloads.downloading', 'Downloading...'),
              image: 'arrow.down.circle',
              attributes: disabledAttrs,
            }
          : {
              id: 'downloading',
              title: i18n.t('downloads.downloading', 'Downloading...'),
              attributes: disabledAttrs,
            }
      );
    } else {
      actions.push(
        withIcons
          ? {
              id: 'download_chapter',
              title: i18n.t('downloads.downloadChapter', 'Download chapter'),
              image: 'arrow.down.circle',
            }
          : {
              id: 'download_chapter',
              title: i18n.t('downloads.downloadChapter', 'Download chapter'),
            }
      );
    }
  }
  if (includeShareText) {
    actions.push(
      withIcons
        ? {
            id: 'share_text',
            title: i18n.t('sharing.shareText', 'Share Text'),
            image: 'square.and.arrow.up',
          }
        : {
            id: 'share_text',
            title: i18n.t('sharing.shareText', 'Share Text'),
          }
    );
  }
  if (includeAudioShare) {
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
  if (includePlaylistActions && hasMediaFiles) {
    actions.push(
      withIcons
        ? {
            id: 'add_to_playlist',
            title: i18n.t('playlists.addToPlaylist', 'Add to Playlist'),
            image: 'music.note.list',
          }
        : {
            id: 'add_to_playlist',
            title: i18n.t('playlists.addToPlaylist', 'Add to Playlist'),
          }
    );
  }
  return actions;
};

export interface HandleMenuActionParams extends ChapterMenuHandlers {
  chapter: ChapterWithMetadata;
  bookName?: string;
  currentAudioVersionId?: string;
  currentTextVersionId?: string;
}

export const handleChapterMenuAction = async (
  actionId: string,
  params: HandleMenuActionParams
): Promise<void> => {
  const { chapter, shareChapter, addToQueue, openAddToPlaylist } = params;

  if (actionId === 'queue') {
    if (!chapter.hasMediaFiles) return;
    try {
      if (addToQueue) {
        const opts = {
          preferOffline: true,
          ...(params.currentAudioVersionId
            ? { audioVersionId: params.currentAudioVersionId }
            : {}),
          ...(params.currentTextVersionId
            ? { textVersionId: params.currentTextVersionId }
            : {}),
        };
        await addToQueue(chapter.id, opts);
      } else {
        // Fallback to queue store if handler not supplied
        const { getQueueStore } = await import(
          '@/features/media/store/QueueStore'
        );
        const { addToQueue: add } = getQueueStore();
        const opts = {
          preferOffline: true,
          ...(params.currentAudioVersionId
            ? { audioVersionId: params.currentAudioVersionId }
            : {}),
          ...(params.currentTextVersionId
            ? { textVersionId: params.currentTextVersionId }
            : {}),
        };
        await add(chapter.id, opts);
      }
    } catch {
      // swallow - UI can show toast externally
    }
    return;
  }

  if (actionId === 'download_chapter') {
    try {
      const { chapterDownloadService } = await import(
        '@/features/downloads/services/ChapterDownloadService'
      );
      await chapterDownloadService.prioritizeChapterDownloads(chapter.id);
    } catch {
      // swallow; UI can show toast elsewhere
    }
    return;
  }

  if (actionId === 'remove_download_chapter') {
    try {
      const { chapterDownloadService } = await import(
        '@/features/downloads/services/ChapterDownloadService'
      );
      await chapterDownloadService.removeChapterDownloads(chapter.id);
    } catch {
      // swallow
    }
    return;
  }

  if (actionId === 'share_text') {
    try {
      const shareOptions = buildChapterShareOptions(chapter, {
        ...(params.bookName ? { bookName: params.bookName } : {}),
        ...(params.currentAudioVersionId
          ? { currentAudioVersionId: params.currentAudioVersionId }
          : {}),
        ...(params.currentTextVersionId
          ? { currentTextVersionId: params.currentTextVersionId }
          : {}),
      });
      await shareChapter(chapter.id, shareOptions);
    } catch {
      // swallow - UI can show toast externally
    }
    return;
  }

  if (actionId === 'share_audio') {
    try {
      const shareOptions = buildChapterShareOptions(chapter, {
        ...(params.bookName ? { bookName: params.bookName } : {}),
        ...(params.currentAudioVersionId
          ? { currentAudioVersionId: params.currentAudioVersionId }
          : {}),
        ...(params.currentTextVersionId
          ? { currentTextVersionId: params.currentTextVersionId }
          : {}),
      });
      await shareChapter(chapter.id, { ...shareOptions, shareType: 'audio' });
    } catch {
      // swallow - UI can show toast externally
    }
    return;
  }

  if (actionId === 'add_to_playlist') {
    openAddToPlaylist?.(chapter);

    return;
  }

  // Reserved for future actions
};

// ============================
// Track menu helpers (queue list rows)
// ============================

export interface TrackMenuHandlers extends ChapterMenuHandlers {
  removeFromManualQueue?: (trackId: string) => void;
}

export interface TrackMenuParams extends TrackMenuHandlers, ChapterShareParams {
  chapterId: string;
  trackId: string;
  isManual: boolean;
  chapterNumber?: number;
}

export const getTrackMenuActions = (opts: {
  isManual: boolean;
  hasMediaFiles: boolean;
  withIcons?: boolean;
  includeAudioShare?: boolean;
  includeQueue?: boolean; // default true
  includeShare?: boolean; // default true
}): MenuAction[] => {
  const withIcons = opts.withIcons ?? true;
  const actions: MenuAction[] = [];
  if (opts.isManual) {
    actions.push(
      withIcons
        ? {
            id: 'remove',
            title: i18n.t('queue.removeFromQueue'),
            image: 'trash',
            titleColor: '#FF3B30',
          }
        : { id: 'remove', title: i18n.t('queue.removeFromQueue') }
    );
  }
  const includeQueue = opts.includeQueue ?? true;
  if (opts.hasMediaFiles && includeQueue) {
    actions.push(
      withIcons
        ? { id: 'queue', title: i18n.t('queue.addToQueue'), image: 'plus' }
        : { id: 'queue', title: i18n.t('queue.addToQueue') }
    );
  }
  const includeShare = opts.includeShare ?? true;
  if (includeShare) {
    actions.push(
      withIcons
        ? {
            id: 'share',
            title: i18n.t('sharing.share'),
            image: 'square.and.arrow.up',
          }
        : { id: 'share', title: i18n.t('sharing.share') }
    );
  }
  if (opts.includeAudioShare) {
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

export const handleTrackMenuAction = async (
  actionId: string,
  params: TrackMenuParams
): Promise<void> => {
  const {
    trackId,
    isManual,
    chapterId,
    removeFromManualQueue,
    shareChapter,
    addToQueue,
  } = params;

  const parseChapterNumber = (id: string): number => {
    const match = id.match(/-(\d+)$/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      return Number.isFinite(num) && num > 0 ? num : 0;
    }
    return 0;
  };

  if (actionId === 'remove') {
    if (isManual && removeFromManualQueue) {
      removeFromManualQueue(trackId);
    }
    return;
  }

  if (
    actionId === 'queue' ||
    actionId === 'share_text' ||
    actionId === 'share_audio'
  ) {
    // Delegate to chapter handlers using a minimal chapter object stub
    const fakeChapter = {
      id: chapterId,
      chapter_number:
        typeof params.chapterNumber === 'number' && params.chapterNumber > 0
          ? params.chapterNumber
          : parseChapterNumber(chapterId),
      total_verses: 0,
      hasMediaFiles: true,
    } as ChapterWithMetadata;

    await handleChapterMenuAction(actionId, {
      chapter: fakeChapter,
      ...(params.bookName ? { bookName: params.bookName } : {}),
      ...(params.currentAudioVersionId
        ? { currentAudioVersionId: params.currentAudioVersionId }
        : {}),
      ...(params.currentTextVersionId
        ? { currentTextVersionId: params.currentTextVersionId }
        : {}),
      shareChapter,
      ...(addToQueue ? { addToQueue } : {}),
    });
    return;
  }
};
