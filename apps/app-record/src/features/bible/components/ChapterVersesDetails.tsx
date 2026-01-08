import React from 'react';
import { Details } from '@/shared/components';
import { getBookImageByNumber } from '../assets/bookArtRegistry';
import { useLocalization } from '@/shared/hooks';
import { useChapterVersesLogic } from '../hooks/useChapterVersesLogic';
import { useChapterMediaActions } from '../hooks/useChapterMediaActions';
import { useChapterMenuActions } from '../hooks/useChapterMenuActions';
import { useCurrentVersions } from '../../languages/hooks';

export const ChapterVersesDetails: React.FC = () => {
  const { t } = useLocalization();

  // Get all data directly from hooks - no props needed!
  const {
    chapterTitle,
    versesWithTexts,
    book,
    chapter,
    downloadStatus,
    rootNavigation,
  } = useChapterVersesLogic();
  const { currentAudioVersion, currentTextVersion } = useCurrentVersions();
  const { handlePlayPress, handleAvailabilityPress } =
    useChapterMediaActions(chapter);
  const { menuActions, handleMenuAction, handleShare } = useChapterMenuActions({
    chapter,
    book,
    ...(currentAudioVersion?.id && {
      currentAudioVersionId: currentAudioVersion.id,
    }),
    ...(currentTextVersion?.id && {
      currentTextVersionId: currentTextVersion.id,
    }),
    downloadState: downloadStatus?.state,
    rootNavigation,
  });

  return (
    <Details
      title={chapterTitle || t('bible.unknownChapter')}
      subtitle={t('verses.subtitle', { count: versesWithTexts.length })}
      albumArt={book ? getBookImageByNumber(book.book_number) : undefined}
      onSharePress={handleShare}
      availability={{
        state: downloadStatus?.state as
          | 'streaming'
          | 'downloading'
          | 'downloaded',
        progress: downloadStatus?.progress,
      }}
      onPressAvailability={handleAvailabilityPress}
      playButtonProps={
        chapter?.hasMediaFiles
          ? {
              type: 'chapter',
              id: `${chapter?.book_id ?? ''}-${chapter?.id ?? ''}`,
              onPress: () =>
                handlePlayPress(
                  currentAudioVersion?.id,
                  currentTextVersion?.id
                ),
            }
          : undefined
      }
      menuActions={menuActions}
      onMenuAction={handleMenuAction}
      testID='verses-screen-details'
    />
  );
};
