import { useEffect, useMemo, useRef, useState } from 'react';
import type { BookWithMetadata } from '../types';
import { useBooks } from './useBible';
import { BookResolutionService } from '../services/BookResolutionService';

export interface ResolveParams {
  incomingBook?: BookWithMetadata | null;
  incomingBookId?: string | null;
  incomingChapterId?: string | null;
  incomingVerseId?: string | null;
}

export interface ResolvedBibleLocation {
  resolvedBook: BookWithMetadata | null;
  resolvedBookId: string | null;
  resolvedChapterId: string | null;
  resolvedChapterNumber: number | null;
}

export const useResolvedBibleLocation = (
  params: ResolveParams
): ResolvedBibleLocation => {
  const { incomingBook, incomingBookId, incomingChapterId, incomingVerseId } =
    params;
  const { books } = useBooks();
  const [resolvedBookId, setResolvedBookId] = useState<string | null>(
    incomingBook?.id ?? incomingBookId ?? null
  );
  const [resolvedChapterId, setResolvedChapterId] = useState<string | null>(
    incomingChapterId ?? null
  );
  const [resolvedChapterNumber, setResolvedChapterNumber] = useState<
    number | null
  >(null);

  const prevChapterIdRef = useRef<string | null>(null);
  const prevVerseIdRef = useRef<string | null>(null);
  const prevBookIdRef = useRef<string | null>(null);

  // React to incomingBookId changes (e.g., book deep link while already on Chapters)
  useEffect(() => {
    if (!incomingBookId) return;
    if (prevBookIdRef.current === incomingBookId) return;
    prevBookIdRef.current = incomingBookId;
    if (incomingBookId !== resolvedBookId) {
      setResolvedBookId(incomingBookId);
      // Clear chapter-specific state when switching books via deep link
      setResolvedChapterId(null);
      setResolvedChapterNumber(null);
    }
  }, [incomingBookId, resolvedBookId]);

  // Derive book + chapter number from chapterId whenever it changes
  useEffect(() => {
    if (!incomingChapterId) return;
    if (prevChapterIdRef.current === incomingChapterId) return;
    prevChapterIdRef.current = incomingChapterId;
    (async () => {
      try {
        const { powerSyncSystem } =
          await import('@/shared/services/powersync/PowerSyncSystem');
        const row = await powerSyncSystem.get(
          'SELECT book_id, chapter_number FROM chapters WHERE id = ? LIMIT 1',
          [incomingChapterId]
        );
        const bId = (row?.book_id as string) ?? null;
        const chNo = (row?.chapter_number as number) ?? null;
        if (bId && bId !== resolvedBookId) setResolvedBookId(bId);
        if (typeof chNo === 'number') setResolvedChapterNumber(chNo);
        if (incomingChapterId !== resolvedChapterId)
          setResolvedChapterId(incomingChapterId);
      } catch {
        // ignore
      }
    })();
  }, [incomingChapterId, resolvedBookId, resolvedChapterId]);

  // Derive chapterId + bookId + chapter number from verseId whenever it changes
  useEffect(() => {
    if (!incomingVerseId) return;
    if (prevVerseIdRef.current === incomingVerseId) return;
    prevVerseIdRef.current = incomingVerseId;
    (async () => {
      try {
        const { powerSyncSystem } =
          await import('@/shared/services/powersync/PowerSyncSystem');
        const row = await powerSyncSystem.get(
          `SELECT v.chapter_id AS chapter_id, c.book_id AS book_id, c.chapter_number AS chapter_number
           FROM verses v
           JOIN chapters c ON c.id = v.chapter_id
           WHERE v.id = ?
           LIMIT 1`,
          [incomingVerseId]
        );
        const chId = (row?.chapter_id as string) ?? null;
        const bId = (row?.book_id as string) ?? null;
        const chNo = (row?.chapter_number as number) ?? null;
        if (chId && chId !== resolvedChapterId) setResolvedChapterId(chId);
        if (bId && bId !== resolvedBookId) setResolvedBookId(bId);
        if (typeof chNo === 'number') setResolvedChapterNumber(chNo);
      } catch {
        // ignore
      }
    })();
  }, [incomingVerseId, resolvedBookId, resolvedChapterId]);

  const resolvedBook = useMemo(() => {
    // Use the centralized book resolution service
    if (incomingBook) {
      return BookResolutionService.resolveBook(incomingBook, books);
    }
    if (resolvedBookId) {
      return BookResolutionService.resolveBookById(resolvedBookId, books);
    }
    return null;
  }, [incomingBook, resolvedBookId, books]);

  return {
    resolvedBook,
    resolvedBookId,
    resolvedChapterId,
    resolvedChapterNumber,
  };
};
