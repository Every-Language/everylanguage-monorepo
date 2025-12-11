import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import type { Database } from '@everylanguage/shared-types';

type GlobalTranslationStats =
  Database['public']['Views']['global_translation_statistics']['Row'];

type GlobalStatisticsResponse = {
  data: {
    total_languages: number;
    full_audio_bible_count: number;
    full_audio_bible_percentage: number;
    audio_portions_count: number;
    audio_portions_percentage: number;
    text_portions_count: number;
    text_portions_percentage: number;
  };
};

type ActiveProject =
  Database['public']['Functions']['get_active_projects_with_progress']['Returns'];

type ProjectStatusResponse = {
  summary: {
    active_projects_total: number;
    completed_projects_total: number;
    total_chapters_completed: number;
  };
  projects: ActiveProject[];
};

type MediaFileWithRelations = {
  id: string;
  created_at: string;
  language_entity_id: string;
  chapter_id: string | null;
  start_verse_id: string | null;
  language_entity: {
    id: string;
    name: string;
  } | null;
  chapter: {
    id: string;
    chapter_number: number;
    book: {
      id: string;
      name: string;
    } | null;
  } | null;
  start_verse: {
    id: string;
    verse_number: number;
    chapter: {
      id: string;
      chapter_number: number;
      book: {
        id: string;
        name: string;
      } | null;
    } | null;
  } | null;
};

type ProjectUpdateWithRelations = {
  id: string;
  created_at: string;
  title: string;
  body: string;
  project_id: string;
  project: {
    id: string;
    name: string;
    target_language_entity_id: string;
    target_language: {
      id: string;
      name: string;
    } | null;
  } | null;
  media: Array<{
    id: string;
    object_key: string;
    display_order: number;
    deleted_at: string | null;
  }> | null;
};

type ActivityFeedItem =
  | {
      id: string;
      type: 'bible_audio';
      timestamp: string;
      language_name: string;
      book_name: string;
      chapter_number: number | null;
    }
  | {
      id: string;
      type: 'project_update';
      timestamp: string;
      project_name: string;
      language_name: string;
      title: string;
      body: string;
      media_keys: string[];
    };

type ActivityFeedResponse = {
  items: ActivityFeedItem[];
};

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

export function useGlobalStatistics() {
  return useQuery({
    queryKey: ['global-bible-stats'],
    queryFn: async (): Promise<GlobalStatisticsResponse> => {
      const { data, error } = await supabase
        .from('global_translation_statistics')
        .select('*')
        .single<GlobalTranslationStats>();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from global_translation_statistics');
      }

      // Return in same format as API route for compatibility
      // Handle null values by defaulting to 0
      return {
        data: {
          total_languages: data.total_languages ?? 0,
          full_audio_bible_count: data.full_audio_bible_count ?? 0,
          full_audio_bible_percentage: data.full_audio_bible_percentage ?? 0,
          audio_portions_count: data.audio_portions_count ?? 0,
          audio_portions_percentage: data.audio_portions_percentage ?? 0,
          text_portions_count: data.text_portions_count ?? 0,
          text_portions_percentage: data.text_portions_percentage ?? 0,
        },
      };
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useActiveProjectsWithProgress(
  options?: Omit<UseQueryOptions<ProjectStatusResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['global-project-status'],
    queryFn: async (): Promise<ProjectStatusResponse> => {
      const [summaryResult, projectsResult] = await Promise.all([
        supabase
          .from('global_translation_statistics')
          .select(
            'active_projects_total, completed_projects_total, total_chapters_completed'
          )
          .single<
            Pick<
              GlobalTranslationStats,
              | 'active_projects_total'
              | 'completed_projects_total'
              | 'total_chapters_completed'
            >
          >(),
        (supabase as any).rpc('get_active_projects_with_progress'),
      ]);

      if (summaryResult.error) {
        throw summaryResult.error;
      }

      if (projectsResult.error) {
        throw projectsResult.error;
      }

      if (!summaryResult.data) {
        throw new Error(
          'No summary data returned from global_translation_statistics'
        );
      }

      const summary: ProjectStatusResponse['summary'] = {
        active_projects_total: summaryResult.data.active_projects_total ?? 0,
        completed_projects_total:
          summaryResult.data.completed_projects_total ?? 0,
        total_chapters_completed:
          summaryResult.data.total_chapters_completed ?? 0,
      };

      return {
        summary,
        projects: (projectsResult.data ?? []) as ActiveProject[],
      };
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

export function useRecentActivityFeed(
  limit: number = 10,
  options?: Omit<UseQueryOptions<ActivityFeedResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['global-activity-feed', limit],
    queryFn: async (): Promise<ActivityFeedResponse> => {
      // Clamp limit between 1 and MAX_LIMIT
      const clampedLimit = Number.isFinite(limit)
        ? Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT)
        : DEFAULT_LIMIT;

      // Fetch recent bible audio uploads
      const { data: uploadsData, error: uploadsError } = await supabase
        .from('media_files')
        .select(
          `
          id,
          created_at,
          language_entity_id,
          chapter_id,
          start_verse_id,
          language_entity:language_entities!language_entity_id (
            id,
            name
          ),
          chapter:chapters!chapter_id (
            id,
            chapter_number,
            book:books!book_id (
              id,
              name
            )
          ),
          start_verse:verses!start_verse_id (
            id,
            verse_number,
            chapter:chapters!chapter_id (
              id,
              chapter_number,
              book:books!book_id (
                id,
                name
              )
            )
          )
        `
        )
        .is('deleted_at', null)
        .eq('media_type', 'audio')
        .eq('is_bible_audio', true)
        .eq('upload_status', 'completed')
        .eq('publish_status', 'published')
        .order('created_at', { ascending: false })
        .limit(clampedLimit);

      if (uploadsError) {
        console.error(
          '[global-stats:activity-feed] Error fetching bible audio uploads:',
          uploadsError
        );
        throw uploadsError;
      }

      // Fetch recent public project updates
      const { data: updatesData, error: updatesError } = await supabase
        .from('project_updates')
        .select(
          `
          id,
          created_at,
          title,
          body,
          project_id,
          project:projects!project_id (
            id,
            name,
            target_language_entity_id,
            target_language:language_entities!target_language_entity_id (
              id,
              name
            )
          ),
          media:project_updates_media (
            id,
            object_key,
            display_order,
            deleted_at
          )
        `
        )
        .is('deleted_at', null)
        .eq('publish_status', 'published')
        .order('created_at', { ascending: false })
        .limit(clampedLimit);

      if (updatesError) {
        console.error(
          '[global-stats:activity-feed] Error fetching project updates:',
          updatesError
        );
        throw updatesError;
      }

      // Transform bible audio uploads
      const uploads: ActivityFeedItem[] = (uploadsData ?? []).map(
        (upload: MediaFileWithRelations) => {
          // Determine book name and chapter number with fallback logic
          // Priority matches RPC: start_verse.chapter.book > chapter.book (direct chapter_id)
          let bookName = 'Unknown';
          let chapterNumber: number | null = null;

          // Try verse path first (start_verse -> chapter -> book)
          if (upload.start_verse?.chapter?.book?.name) {
            bookName = upload.start_verse.chapter.book.name;
            chapterNumber = upload.start_verse.chapter.chapter_number;
          }
          // Fallback to direct chapter_id path
          else if (upload.chapter?.book?.name) {
            bookName = upload.chapter.book.name;
            chapterNumber = upload.chapter.chapter_number;
          }
          // If we have chapter number but no book name
          else if (upload.start_verse?.chapter) {
            chapterNumber = upload.start_verse.chapter.chapter_number;
          } else if (upload.chapter) {
            chapterNumber = upload.chapter.chapter_number;
          }

          return {
            id: upload.id,
            type: 'bible_audio' as const,
            timestamp: upload.created_at,
            language_name: upload.language_entity?.name ?? 'Unknown',
            book_name: bookName,
            chapter_number: chapterNumber,
          };
        }
      );

      // Transform project updates
      const updates: ActivityFeedItem[] = (updatesData ?? []).map(
        (update: ProjectUpdateWithRelations) => {
          // Aggregate media_keys from nested media array (excluding deleted media)
          const mediaKeys =
            update.media
              ?.filter(m => m.object_key && !m.deleted_at)
              .sort((a, b) => a.display_order - b.display_order)
              .map(m => m.object_key) ?? [];

          return {
            id: update.id,
            type: 'project_update' as const,
            timestamp: update.created_at,
            project_name: update.project?.name ?? 'Unknown',
            language_name: update.project?.target_language?.name ?? 'Unknown',
            title: update.title,
            body: update.body,
            media_keys: mediaKeys,
          };
        }
      );

      // Combine and sort by timestamp
      const combined: ActivityFeedItem[] = [...uploads, ...updates]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, clampedLimit);

      return {
        items: combined,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}
