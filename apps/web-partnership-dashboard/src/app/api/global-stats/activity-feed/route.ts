import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@everylanguage/shared-types';
import { createClient } from '@/lib/supabase/server';

type RecentUpload =
  Database['public']['Functions']['get_recent_bible_audio_uploads']['Returns'][number];

type RecentUpdate =
  Database['public']['Functions']['get_recent_public_updates']['Returns'][number];

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
    type RpcError = {
      message: string;
      code?: string;
      details?: string;
      hint?: string;
    };

    type RpcClient = {
      rpc<T extends keyof Database['public']['Functions']>(
        fn: T,
        args?: Database['public']['Functions'][T]['Args']
      ): Promise<{
        data: Database['public']['Functions'][T]['Returns'] | null;
        error: RpcError | null;
      }>;
    };
    const rpcClient = supabase as unknown as RpcClient;

    const [uploadsResult, updatesResult] = await Promise.all([
      rpcClient.rpc('get_recent_bible_audio_uploads', {
        limit_count: limit,
      }),
      rpcClient.rpc('get_recent_public_updates', {
        limit_count: limit,
      }),
    ]);

    if (uploadsResult.error) {
      throw uploadsResult.error;
    }

    if (updatesResult.error) {
      throw updatesResult.error;
    }

    const uploads: RecentUpload[] = uploadsResult.data ?? [];
    const updates: RecentUpdate[] = updatesResult.data ?? [];

    const combined: ActivityFeedItem[] = [
      ...uploads.map(upload => ({
        id: upload.media_file_id,
        type: 'bible_audio' as const,
        timestamp: upload.uploaded_at,
        language_name: upload.language_name,
        book_name: upload.book_name,
        chapter_number:
          typeof upload.chapter_number === 'number'
            ? upload.chapter_number
            : null,
      })),
      ...updates.map(update => ({
        id: update.update_id,
        type: 'project_update' as const,
        timestamp: update.created_at,
        project_name: update.project_name,
        language_name: update.language_name,
        title: update.title,
        body: update.body,
        media_keys: update.media_keys ?? [],
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);

    return NextResponse.json({
      items: combined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[global-stats:activity-feed] Failed to load', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // In development/preview, include more error details
    const isDev =
      process.env.NODE_ENV === 'development' ||
      process.env.VERCEL_ENV === 'preview';
    return NextResponse.json(
      {
        error: 'Unable to load recent activity feed',
        ...(isDev && { details: errorMessage }),
      },
      { status: 500 }
    );
  }
}
