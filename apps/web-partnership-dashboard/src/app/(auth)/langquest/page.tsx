import React from 'react';
import {
  createLangQuestClient,
  isLangQuestConfigured,
} from '@/lib/supabase/langquest';
import {
  LangQuestProjectsTable,
  type LangQuestProject,
} from '@/features/langquest/components/LangQuestProjectsTable';

export const dynamic = 'force-dynamic';

export default async function LangQuestPage(): Promise<React.ReactElement> {
  if (!isLangQuestConfigured()) {
    return (
      <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-6 lg:p-8'>
        <div className='mx-auto max-w-7xl'>
          <h1 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
            LangQuest Projects
          </h1>
          <div className='rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-800 dark:text-amber-200'>
            LangQuest is not configured for this environment.
          </div>
        </div>
      </div>
    );
  }

  const client = createLangQuestClient();

  const { data: projectsRaw, error } = await client
    .from('project')
    .select(
      'id, name, target_language_id, private, visible, template, versification_template, active, project_closure(total_quests)'
    )
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

  const projectsWithCounts: LangQuestProject[] = (projectsRaw ?? []).map(
    (p: Record<string, unknown>) => {
      const raw = p.project_closure;
      const closure = Array.isArray(raw)
        ? (raw[0] as { total_quests: number } | undefined)
        : (raw as { total_quests: number } | null | undefined);
      const { project_closure: _, ...rest } = p;
      return {
        ...rest,
        audio_files:
          closure != null && typeof closure.total_quests === 'number'
            ? closure.total_quests
            : 0,
      } as LangQuestProject;
    }
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
