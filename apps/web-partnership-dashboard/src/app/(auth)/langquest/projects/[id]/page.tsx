import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createLangQuestClient } from '@/lib/supabase/langquest';
import {
  LangQuestQuestsTable,
  type LangQuestQuest,
} from '@/features/langquest/components/LangQuestQuestsTable';
import { parseTagsFromQuest } from '@/features/langquest/utils/parseQuestTags';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LangQuestProjectPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const client = createLangQuestClient();

  // Fetch project to verify it exists and get name
  const { data: project, error: projectError } = await client
    .from('project')
    .select('id, name')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  // Fetch quests with tags via quest_tag_link
  const { data: questsRaw, error: questsError } = await client
    .from('quest')
    .select(
      `
      id,
      name,
      quest_tag_link (
        tag (
          key,
          value
        )
      )
    `
    )
    .eq('project_id', id)
    .order('name');

  if (questsError) {
    return (
      <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-6 lg:p-8'>
        <div className='mx-auto max-w-7xl'>
          <Link
            href='/langquest'
            className='inline-flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 mb-4'>
            <ChevronLeftIcon className='h-4 w-4' />
            Back to projects
          </Link>
          <h1 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
            {(project as { name: string }).name}
          </h1>
          <div className='rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-red-800 dark:text-red-200'>
            Failed to load quests: {questsError.message}
          </div>
        </div>
      </div>
    );
  }

  const quests: LangQuestQuest[] = (questsRaw ?? []).map(q => {
    const tags = parseTagsFromQuest(q as { quest_tag_link?: unknown });
    return {
      id: (q as { id: string }).id,
      name: (q as { name: string | null }).name,
      tags,
      tagsText: tags.map(t => `${t.key}: ${t.value}`).join(', '),
    };
  });

  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-6 lg:p-8'>
      <div className='mx-auto max-w-7xl space-y-6'>
        <Link
          href='/langquest'
          className='inline-flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'>
          <ChevronLeftIcon className='h-4 w-4' />
          Back to projects
        </Link>
        <h1 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
          {(project as { name: string }).name} — Quests
        </h1>
        <LangQuestQuestsTable quests={quests} />
      </div>
    </div>
  );
}
