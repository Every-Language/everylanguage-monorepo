import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

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

type ProjectStatusResponse = {
  summary: {
    active_projects_total: number;
    completed_projects_total: number;
    total_chapters_completed: number;
  };
  projects: Array<{
    project_id: string;
    project_name: string;
    language_name: string;
    has_audio: boolean;
    has_text: boolean;
    completed_chapters: number;
    total_chapters: number;
    progress_percentage: number;
  }>;
};

type ActivityFeedResponse = {
  items: Array<
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
      }
  >;
};

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(
      (details as { error?: string })?.error ??
        `Request failed with status ${response.status}`
    );
  }

  return (await response.json()) as T;
}

export function useGlobalStatistics() {
  return useQuery({
    queryKey: ['global-bible-stats'],
    queryFn: () =>
      fetchJson<GlobalStatisticsResponse>(
        '/api/global-stats/bible-translation'
      ),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useActiveProjectsWithProgress(
  options?: Omit<UseQueryOptions<ProjectStatusResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['global-project-status'],
    queryFn: () =>
      fetchJson<ProjectStatusResponse>('/api/global-stats/project-status'),
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
    queryFn: () =>
      fetchJson<ActivityFeedResponse>(
        `/api/global-stats/activity-feed?limit=${limit}`
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}
