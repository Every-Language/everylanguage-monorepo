import type { ChapterWithMetadata, BookWithMetadata } from '../types';
import type { ChapterMediaOptions } from '@/features/media/types';

export interface ResolveParams {
  incomingBook?: BookWithMetadata | null;
  incomingBookId?: string | null;
  incomingChapterId?: string | null;
  incomingVerseId?: string | null;
}

export interface ResolvedLocation {
  resolvedBook: BookWithMetadata | null;
  resolvedBookId: string | null;
  resolvedChapterId: string | null;
  resolvedChapterNumber: number | null;
}

export interface ChapterVersesContext {
  chapter: ChapterWithMetadata | null;
  book: BookWithMetadata | null;
  currentAudioVersionId?: string;
  currentTextVersionId?: string;
}

/**
 * Service class for Chapter Verses business logic
 * Encapsulates complex operations and data transformations
 */
export class ChapterVersesService {
  /**
   * Resolves chapter location from various input parameters
   */
  static async resolveChapterLocation(
    params: ResolveParams
  ): Promise<ResolvedLocation> {
    // This would contain the complex resolution logic
    // For now, returning a basic structure
    return {
      resolvedBook: params.incomingBook || null,
      resolvedBookId: params.incomingBookId || null,
      resolvedChapterId: params.incomingChapterId || null,
      resolvedChapterNumber: null,
    };
  }

  /**
   * Builds chapter share options
   */
  static buildChapterShareOptions(
    chapter: ChapterWithMetadata,
    context: {
      bookName: string;
      currentAudioVersionId?: string;
      currentTextVersionId?: string;
    }
  ) {
    return {
      chapterId: chapter.id,
      bookName: context.bookName,
      chapterNumber: chapter.chapter_number,
      ...(context.currentAudioVersionId && {
        audioVersionId: context.currentAudioVersionId,
      }),
      ...(context.currentTextVersionId && {
        textVersionId: context.currentTextVersionId,
      }),
    };
  }

  /**
   * Validates if chapter has media files
   */
  static hasMediaFiles(chapter: ChapterWithMetadata | null): boolean {
    return Boolean(chapter?.hasMediaFiles);
  }

  /**
   * Builds play button props for chapter
   */
  static buildPlayButtonProps(
    chapter: ChapterWithMetadata | null,
    bookId?: string
  ) {
    if (!this.hasMediaFiles(chapter)) {
      return undefined;
    }

    return {
      type: 'chapter' as const,
      id: `${bookId ?? ''}-${chapter?.id ?? ''}`,
    };
  }

  /**
   * Builds chapter header title
   */
  static buildHeaderTitle(
    book: BookWithMetadata | null,
    chapter: ChapterWithMetadata | null,
    resolvedChapterNumber?: number | null
  ): string {
    return `${book?.name ?? 'Unknown Book'} ${
      (chapter?.chapter_number ?? resolvedChapterNumber ?? '') || ''
    }`.trim();
  }

  /**
   * Creates media options for playback
   */
  static createMediaOptions(
    currentAudioVersionId?: string,
    currentTextVersionId?: string
  ): ChapterMediaOptions {
    const options: ChapterMediaOptions = { preferOffline: true };

    if (currentAudioVersionId) {
      options.audioVersionId = currentAudioVersionId;
    }

    if (currentTextVersionId) {
      options.textVersionId = currentTextVersionId;
    }

    return options;
  }
}
