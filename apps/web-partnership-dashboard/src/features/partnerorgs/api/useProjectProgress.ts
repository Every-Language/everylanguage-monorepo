import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import type {
  ProjectVersion,
  ProgressSummary,
  ProgressStats,
  ProjectProgressResult,
} from '../types';

function calculateProgressStats(versions: ProjectVersion[]): ProgressStats {
  let totalBooksDone = 0;
  let totalBooks = 66; // Default Bible book count
  let totalChaptersDone = 0;
  let totalChapters = 1189; // Default Bible chapter count

  for (const version of versions) {
    const summary = version.progress_summary?.[0] as
      | ProgressSummary
      | undefined;

    if (summary) {
      if (version.version_type === 'audio') {
        totalBooksDone = Math.max(totalBooksDone, summary.books_complete || 0);
        totalBooks = Math.max(totalBooks, summary.total_books || 66);
        totalChaptersDone = Math.max(
          totalChaptersDone,
          summary.chapters_with_audio || 0
        );
        totalChapters = Math.max(totalChapters, summary.total_chapters || 1189);
      } else if (version.version_type === 'text') {
        totalBooksDone = Math.max(totalBooksDone, summary.books_complete || 0);
        totalBooks = Math.max(totalBooks, summary.total_books || 66);
        totalChaptersDone = Math.max(
          totalChaptersDone,
          summary.complete_chapters || 0
        );
        totalChapters = Math.max(totalChapters, summary.total_chapters || 1189);
      }
    }
  }

  const progressPercentage =
    totalChapters > 0
      ? Math.round((totalChaptersDone / totalChapters) * 100)
      : 0;

  return {
    totalBooksDone,
    totalBooks,
    totalChaptersDone,
    totalChapters,
    progressPercentage,
  };
}

async function fetchVersions(projectIds: string[]): Promise<ProjectVersion[]> {
  const [audioVersionsResult, textVersionsResult] = await Promise.all([
    supabase
      .from('audio_versions')
      .select('id, name, language_entity_id, project_id')
      .in('project_id', projectIds)
      .is('deleted_at', null),
    supabase
      .from('text_versions')
      .select('id, name, language_entity_id, project_id')
      .in('project_id', projectIds)
      .is('deleted_at', null),
  ]);

  const { data: audioVersions, error: versionsError } = audioVersionsResult as {
    data: Array<{
      id: string;
      name: string;
      language_entity_id: string | null;
      project_id: string | null;
    }> | null;
    error: { message: string } | null;
  };

  if (versionsError) {
    console.error('Error fetching audio versions:', versionsError);
    throw versionsError;
  }

  const { data: textVersions, error: textVersionsError } =
    textVersionsResult as {
      data: Array<{
        id: string;
        name: string;
        language_entity_id: string | null;
        project_id: string | null;
      }> | null;
      error: { message: string } | null;
    };

  if (textVersionsError) {
    console.error('Error fetching text versions:', textVersionsError);
  }

  const audioVersionIds = (audioVersions || [])
    .map(av => av.id)
    .filter((id): id is string => !!id);
  const textVersionIds = (textVersions || [])
    .map((tv: any) => tv.id)
    .filter((id: any): id is string => !!id);

  const summaryPromises: Promise<any>[] = [];
  if (audioVersionIds.length > 0) {
    summaryPromises.push(
      (supabase as any)
        .from('audio_version_progress')
        .select(
          'audio_version_id, chapters_with_audio, total_chapters, books_complete, total_books, covered_verses, total_verses'
        )
        .in('audio_version_id', audioVersionIds)
    );
  } else {
    summaryPromises.push(Promise.resolve({ data: null, error: null }));
  }

  if (textVersionIds.length > 0) {
    summaryPromises.push(
      (supabase as any)
        .from('text_version_progress')
        .select(
          'text_version_id, complete_chapters, total_chapters, books_complete, total_books, covered_verses, total_verses'
        )
        .in('text_version_id', textVersionIds)
    );
  } else {
    summaryPromises.push(Promise.resolve({ data: null, error: null }));
  }

  const [audioSummariesResult, textSummariesResult] =
    await Promise.all(summaryPromises);

  let audioSummaries: any[] | null = null;
  if (audioSummariesResult.error) {
    console.error(
      'Error fetching audio progress summaries:',
      audioSummariesResult.error
    );
  } else {
    audioSummaries = audioSummariesResult.data;
  }

  let textSummaries: any[] | null = null;
  if (textSummariesResult.error) {
    console.error(
      'Error fetching text progress summaries:',
      textSummariesResult.error
    );
  } else {
    textSummaries = textSummariesResult.data;
  }

  const allVersions: ProjectVersion[] = [];

  if (audioVersions && audioVersions.length > 0) {
    const audioSummaryMap = new Map<string, ProgressSummary>();
    if (audioSummaries) {
      for (const summary of audioSummaries) {
        audioSummaryMap.set(summary.audio_version_id as string, summary);
      }
    }
    for (const av of audioVersions) {
      allVersions.push({
        ...av,
        version_type: 'audio' as const,
        progress_summary:
          av.id && audioSummaryMap.has(av.id)
            ? [audioSummaryMap.get(av.id)!]
            : [],
      });
    }
  }

  if (textVersions && textVersions.length > 0) {
    const textSummaryMap = new Map<string, ProgressSummary>();
    if (textSummaries) {
      for (const summary of textSummaries) {
        textSummaryMap.set(summary.text_version_id as string, summary);
      }
    }
    for (const tv of textVersions) {
      allVersions.push({
        ...tv,
        version_type: 'text' as const,
        progress_summary:
          tv.id && textSummaryMap.has(tv.id)
            ? [textSummaryMap.get(tv.id)!]
            : [],
      });
    }
  }

  return allVersions;
}

export function useProjectProgress(
  projectId: string | 'all',
  partnerOrgId?: string
) {
  return useQuery({
    queryKey: ['project-progress', projectId, partnerOrgId],
    queryFn: async () => {
      let projectIds: string[];

      if (projectId === 'all') {
        const { data: projects, error: projectsError } = await (supabase as any)
          .from('partner_orgs_projects')
          .select('project_id')
          .eq('partner_org_id', partnerOrgId!)
          .is('unassigned_at', null);

        if (projectsError) {
          console.error('Error fetching partner org projects:', projectsError);
          throw projectsError;
        }

        projectIds =
          projects
            ?.map((p: any) => p.project_id)
            .filter((id: any): id is string => {
              return !!id && typeof id === 'string' && id.length > 0;
            }) || [];

        const uniqueProjectIds = Array.from(new Set(projectIds));

        const validProjectIds = uniqueProjectIds.filter((id): id is string => {
          if (typeof id !== 'string') return false;
          return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id
          );
        });

        if (validProjectIds.length === 0) {
          return {
            versions: [],
            stats: {
              totalBooksDone: 0,
              totalBooks: 66,
              totalChaptersDone: 0,
              totalChapters: 1189,
              progressPercentage: 0,
            },
          } as ProjectProgressResult;
        }

        projectIds = validProjectIds;
      } else {
        projectIds = [projectId];
      }

      const versions = await fetchVersions(projectIds);
      const stats = calculateProgressStats(versions);

      return {
        versions,
        stats,
      } as ProjectProgressResult;
    },
    enabled: !!(projectId && (projectId !== 'all' || partnerOrgId)),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
    select: (data: ProjectProgressResult) => data, // Return as-is since we already computed stats
  });
}
