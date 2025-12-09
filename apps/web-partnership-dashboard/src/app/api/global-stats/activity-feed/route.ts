import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const limitParam = Number(req.nextUrl.searchParams.get('limit'));
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(1, Math.floor(limitParam)), MAX_LIMIT)
      : DEFAULT_LIMIT;

    const supabase = await createClient();

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
      .limit(limit);

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
      .limit(limit);

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
      .slice(0, limit);

    return NextResponse.json({
      items: combined,
    });
  } catch (error) {
    // Extract error message from Supabase error objects (which have a 'message' property)
    // or from Error instances, or fall back to string representation
    let errorMessage: string;
    let errorDetails: Record<string, unknown> = {};

    if (error && typeof error === 'object' && 'message' in error) {
      // Supabase/PostgrestError object
      const supabaseError = error as {
        message: string;
        code?: string;
        details?: string;
        hint?: string;
      };
      errorMessage = supabaseError.message;
      errorDetails = {
        code: supabaseError.code,
        details: supabaseError.details,
        hint: supabaseError.hint,
      };
    } else if (error instanceof Error) {
      // Standard Error instance
      errorMessage = error.message;
      errorDetails = {
        stack: error.stack,
      };
    } else {
      // Fallback for unknown error types
      errorMessage = String(error);
      errorDetails = {
        rawError: error,
      };
    }

    console.error('[global-stats:activity-feed] Failed to load', {
      error: errorMessage,
      ...errorDetails,
    });

    // In development/preview, include more error details
    const isDev =
      process.env.NODE_ENV === 'development' ||
      process.env.VERCEL_ENV === 'preview';
    return NextResponse.json(
      {
        error: 'Unable to load recent activity feed',
        ...(isDev && { details: errorMessage, ...errorDetails }),
      },
      { status: 500 }
    );
  }
}
