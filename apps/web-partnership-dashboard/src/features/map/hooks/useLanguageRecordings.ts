/**
 * Hook to fetch audio recordings for a language (combines local and GRN recordings)
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { useGRNLanguageDataCache } from './useGRNLanguageDataCache';
import { getTrackUrl, fetchSetFeed } from '../services/grnApi';
import type { LanguageRecording } from '../types/stats';
import type { GRNProgram } from '../services/grnApi';

export type LanguageRecordingsResult = {
  // First available recording (for LANGUAGE SAMPLE section)
  firstRecording: LanguageRecording | null;
  // Separated arrays (for GOSPEL RECORDINGS section)
  localRecordings: LanguageRecording[];
  grnPrograms: GRNProgram[]; // GRN programs (set feeds fetched on demand in components)
};

/**
 * Fetches all audio recordings for a language (local + GRN)
 * @param languageEntityId - The language entity ID
 * @returns LanguageRecordingsResult
 */
export function useLanguageRecordings(
  languageEntityId: string | null
): UseQueryResult<LanguageRecordingsResult> {
  // Fetch GRN data
  const { data: grnLanguageFeed } = useGRNLanguageDataCache(languageEntityId);

  return useQuery({
    queryKey: ['language-recordings', languageEntityId, grnLanguageFeed?.id],
    queryFn: async () => {
      if (!languageEntityId) {
        return {
          firstRecording: null,
          localRecordings: [],
          grnPrograms: [],
        };
      }

      // Fetch local recordings
      const localRecordings: LanguageRecording[] = [];
      type AudioVersion = {
        id: string;
        name: string;
      };
      const { data: audioVersions, error: avError } = await supabase
        .from('audio_versions')
        .select('id, name')
        .eq('language_entity_id', languageEntityId)
        .is('deleted_at', null)
        .returns<AudioVersion[]>();

      if (!avError && audioVersions && audioVersions.length > 0) {
        const audioVersionIds = audioVersions.map(av => av.id);

        // Fetch media files with book/chapter info
        type MediaFileWithChapter = {
          id: string;
          duration_seconds: number | null;
          object_key: string | null;
          storage_provider: string | null;
          audio_version_id: string;
          chapter_id: string | null;
          start_verse_id: string | null;
          end_verse_id: string | null;
          chapter: {
            chapter_number: number;
            book: {
              id: string;
              name: string;
              global_order: number;
            } | null;
          } | null;
        };

        const { data: mediaFiles, error: mfError } = await supabase
          .from('media_files')
          .select(
            `
            id,
            duration_seconds,
            object_key,
            storage_provider,
            audio_version_id,
            chapter_id,
            start_verse_id,
            end_verse_id,
            chapter:chapters!chapter_id(
              chapter_number,
              book:books!book_id(
                id,
                name,
                global_order
              )
            )
          `
          )
          .in('audio_version_id', audioVersionIds)
          .is('deleted_at', null)
          .eq('is_bible_audio', true)
          .eq('upload_status', 'completed')
          .order('created_at', { ascending: false })
          .returns<MediaFileWithChapter[]>();

        if (!mfError && mediaFiles) {
          for (const mf of mediaFiles) {
            const audioVersion = audioVersions.find(
              av => av.id === mf.audio_version_id
            );
            const bookName =
              mf.chapter &&
              typeof mf.chapter === 'object' &&
              'book' in mf.chapter
                ? (mf.chapter.book as { name: string })?.name
                : null;
            const chapterNumber =
              mf.chapter && typeof mf.chapter === 'object'
                ? (mf.chapter as { chapter_number: number })?.chapter_number
                : null;

            // Store mediaFileId for on-demand URL fetching
            // URLs will be fetched via edge function when needed (requires authentication)
            localRecordings.push({
              id: mf.id,
              source: 'local',
              title: bookName
                ? `${bookName}${chapterNumber ? ` ${chapterNumber}` : ''}`
                : audioVersion?.name || 'Recording',
              url: '', // Will be fetched on demand via mediaFileId
              duration: mf.duration_seconds,
              bookName,
              chapterNumber,
              audioVersionId: mf.audio_version_id,
              mediaFileId: mf.id,
            });
          }
        }
      }

      // Get GRN programs (set feeds fetched on demand)
      const grnPrograms: GRNProgram[] = [];
      if (grnLanguageFeed?.programs?.program) {
        const programs = Array.isArray(grnLanguageFeed.programs.program)
          ? grnLanguageFeed.programs.program
          : [];
        grnPrograms.push(...programs);
      }

      // Find first available recording (prefer local, then GRN)
      // For GRN, fetch first program's first track
      let firstRecording: LanguageRecording | null = null;

      if (localRecordings.length > 0) {
        firstRecording = localRecordings[0];
      } else if (grnPrograms.length > 0) {
        // Fetch first track from first program for sample
        try {
          const firstProgram = grnPrograms[0];
          const setFeed = await fetchSetFeed(firstProgram.id.toString());
          if (setFeed?.tracks && setFeed.tracks.length > 0) {
            const firstTrack = setFeed.tracks[0];
            const trackUrl = getTrackUrl(firstProgram.id, firstTrack.id);
            if (trackUrl) {
              firstRecording = {
                id: `grn-${firstProgram.id}-${firstTrack.id}`,
                source: 'grn',
                title:
                  firstTrack.title ||
                  `${setFeed.title} - Track ${firstTrack.id}`,
                url: trackUrl,
                duration: firstTrack.trackFormats?.[0]?.duration
                  ? parseInt(firstTrack.trackFormats[0].duration, 10)
                  : null,
                grnSetId: firstProgram.id,
                grnTrackId: firstTrack.id,
                grnProgramTitle: setFeed.title,
                grnVernacularTitle: setFeed.vernacular_title,
                bibleReferences: firstTrack.bible || null,
              };
            }
          }
        } catch (error) {
          // Silently fail - firstRecording will remain null
          console.warn('Failed to fetch GRN first track:', error);
        }
      }

      return {
        firstRecording,
        localRecordings,
        grnPrograms,
      };
    },
    enabled: !!languageEntityId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    // Note: Query will re-run when grnLanguageFeed changes due to queryKey dependency
  });
}
