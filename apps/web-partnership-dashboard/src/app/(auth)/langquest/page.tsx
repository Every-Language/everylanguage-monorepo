import React from 'react';
import { createLangQuestClient } from '@/lib/supabase/langquest';
import {
  LangQuestProjectsTable,
  type LangQuestProject,
} from '@/features/langquest/components/LangQuestProjectsTable';

export const dynamic = 'force-dynamic';

export default async function LangQuestPage(): Promise<React.ReactElement> {
  const client = createLangQuestClient();

  const { data: projects, error } = await client
    .from('project')
    .select('id, name, target_language_id, private, visible')
    .order('name');

  if (error) {
    return (
      <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-6 lg:p-8'>
        <div className='mx-auto max-w-7xl'>
          <h1 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
            LangQuest Projects
          </h1>
          <div className='rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-red-800 dark:text-red-200'>
            Failed to load projects: {error.message}
          </div>
        </div>
      </div>
    );
  }

  // Fetch quest counts (aggregates disabled in LangQuest project)
  const { data: quests } = await client
    .from('quest')
    .select('project_id')
    .not('project_id', 'is', null);

  const questCountByProjectId = (quests ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      const pid = (row as { project_id: string }).project_id;
      acc[pid] = (acc[pid] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const projectsWithCounts: LangQuestProject[] = (projects ?? []).map(
    p =>
      ({
        ...p,
        audio_files: questCountByProjectId[p.id] ?? 0,
      }) as LangQuestProject
  );

  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-6 lg:p-8'>
      <div className='mx-auto max-w-7xl space-y-6'>
        <h1 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
          LangQuest Projects
        </h1>
        <LangQuestProjectsTable projects={projectsWithCounts} />
      </div>
    </div>
  );
}
