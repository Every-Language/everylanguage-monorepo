'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { useLangQuestTableParams } from '@/features/langquest/hooks/useLangQuestTableParams';

export interface LangQuestProject extends Record<string, unknown> {
  id: string;
  name: string;
  target_language_id: string | null;
  private: boolean | null;
  visible: boolean | null;
  template: string | null;
  versification_template: string | null;
  active: boolean | null;
  audio_files: number;
}

const columns: Column<LangQuestProject>[] = [
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
  },
  {
    key: 'target_language_id',
    header: 'Target Language ID',
    sortable: true,
    render: (value: unknown) =>
      value ? (
        <span className='font-mono text-xs truncate max-w-[200px] block'>
          {String(value)}
        </span>
      ) : (
        <span className='text-neutral-400'>—</span>
      ),
  },
  {
    key: 'template',
    header: 'Template',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { value: 'unstructured', label: 'unstructured' },
      { value: 'bible', label: 'bible' },
      { value: 'fia', label: 'fia' },
      { value: '__null__', label: '(empty)' },
    ],
    render: (value: unknown) =>
      value != null && String(value) ? (
        <span className='font-mono text-xs'>{String(value)}</span>
      ) : (
        <span className='text-neutral-400'>—</span>
      ),
  },
  {
    key: 'versification_template',
    header: 'Versification template',
    sortable: true,
    filterable: true,
    filterType: 'text',
    render: (value: unknown) =>
      value != null && String(value) ? (
        <span className='font-mono text-xs truncate max-w-[120px] block'>
          {String(value)}
        </span>
      ) : (
        <span className='text-neutral-400'>—</span>
      ),
  },
  {
    key: 'private',
    header: 'Private',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ],
    render: (value: unknown) => (
      <span
        className={
          value ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-500'
        }>
        {value ? 'Yes' : 'No'}
      </span>
    ),
  },
  {
    key: 'visible',
    header: 'Visible',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ],
    render: (value: unknown) => (
      <span
        className={
          value ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500'
        }>
        {value ? 'Yes' : 'No'}
      </span>
    ),
  },
  {
    key: 'active',
    header: 'Active',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ],
    render: (value: unknown) => (
      <span
        className={
          value ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500'
        }>
        {value ? 'Yes' : 'No'}
      </span>
    ),
  },
  {
    key: 'audio_files',
    header: 'Audio files',
    sortable: true,
    render: (value: unknown) => (
      <span className='tabular-nums text-neutral-700 dark:text-neutral-300'>
        {typeof value === 'number' ? value : 0}
      </span>
    ),
  },
];

interface LangQuestProjectsTableProps {
  projects: LangQuestProject[];
}

export function LangQuestProjectsTable({
  projects,
}: LangQuestProjectsTableProps): React.ReactElement {
  const router = useRouter();
  const {
    searchTerm,
    filters,
    page,
    pageSize,
    onSearchTermChange,
    onFilterChange,
    onClearFilters,
    onPageChange,
    onPageSizeChange,
  } = useLangQuestTableParams();

  return (
    <DataTable
      data={projects}
      columns={columns}
      searchable
      searchPlaceholder='Search projects...'
      emptyMessage='No projects found'
      paginate
      pageSize={pageSize}
      searchTerm={searchTerm}
      onSearchTermChange={onSearchTermChange}
      filters={filters}
      onFilterChange={onFilterChange}
      onClearFilters={onClearFilters}
      page={page}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onRowClick={row =>
        router.push(`/langquest/projects/${(row as LangQuestProject).id}`)
      }
    />
  );
}
