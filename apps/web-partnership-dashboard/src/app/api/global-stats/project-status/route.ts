import { NextResponse } from 'next/server';
import type { Database } from '@everylanguage/shared-types';
import { createClient } from '@/lib/supabase/server';

type GlobalStatsRow = Pick<
  Database['public']['Views']['global_translation_statistics']['Row'],
  | 'active_projects_total'
  | 'completed_projects_total'
  | 'total_chapters_completed'
>;

type ActiveProject =
  Database['public']['Functions']['get_active_projects_with_progress']['Returns'];

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const [summaryResult, projectsResult] = await Promise.all([
      supabase
        .from('global_translation_statistics')
        .select(
          'active_projects_total, completed_projects_total, total_chapters_completed'
        )
        .single<GlobalStatsRow>(),
      supabase.rpc('get_active_projects_with_progress'),
    ]);

    if (summaryResult.error) {
      throw summaryResult.error;
    }

    if (projectsResult.error) {
      throw projectsResult.error;
    }

    return NextResponse.json({
      summary: summaryResult.data,
      projects: (projectsResult.data ?? []) as ActiveProject[],
    });
  } catch (error) {
    console.error('[global-stats:project-status] Failed to load', error);
    return NextResponse.json(
      { error: 'Unable to load project status summary' },
      { status: 500 }
    );
  }
}
