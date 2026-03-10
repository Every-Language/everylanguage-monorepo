'use client';

import React from 'react';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import type { TagRow } from '@/features/langquest/utils/parseQuestTags';
import { useLangQuestQuestsTableParams } from '@/features/langquest/hooks/useLangQuestQuestsTableParams';

export interface LangQuestQuest extends Record<string, unknown> {
  id: string;
  name: string | null;
  tags: TagRow[];
  /** Stringified tags for table search (key: value, ...) */
  tagsText?: string;
}

interface LangQuestQuestsTableProps {
  quests: LangQuestQuest[];
}

const columns: Column<LangQuestQuest>[] = [
  {
    key: 'id',
    header: 'ID',
    sortable: true,
    render: (value: unknown) => (
      <span className='font-mono text-xs truncate max-w-[200px] block'>
        {String(value)}
      </span>
    ),
  },
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    render: (value: unknown) =>
      value != null && String(value).trim() ? (
        String(value)
      ) : (
        <span className='text-neutral-400'>—</span>
      ),
  },
  {
    key: 'tagsText',
    header: 'Tags',
    sortable: false,
    render: (_value: unknown, row: LangQuestQuest) => {
      const tags = row.tags ?? [];
      if (tags.length === 0) return <span className='text-neutral-400'>—</span>;
      return (
        <div className='flex flex-wrap gap-1.5'>
          {tags.map((t, i) => (
            <span
              key={i}
              className='inline-flex items-center rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-300'>
              {t.key}: {t.value}
            </span>
          ))}
        </div>
      );
    },
  },
];

export function LangQuestQuestsTable({
  quests,
}: LangQuestQuestsTableProps): React.ReactElement {
  const {
    searchTerm,
    page,
    pageSize,
    onSearchTermChange,
    onPageChange,
    onPageSizeChange,
  } = useLangQuestQuestsTableParams();

  return (
    <DataTable
      data={quests}
      columns={columns}
      searchable
      searchPlaceholder='Search quests...'
      emptyMessage='No quests found'
      paginate
      pageSize={pageSize}
      searchTerm={searchTerm}
      onSearchTermChange={onSearchTermChange}
      page={page}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  );
}
