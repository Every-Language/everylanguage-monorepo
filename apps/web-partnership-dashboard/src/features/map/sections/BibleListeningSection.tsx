'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { useSetSelection } from '../inspector/state/inspectorStore';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import {
  fetchLanguageUsageByRegionMV,
  fetchRegionUsageByLanguageMV,
  fetchLanguageNames,
} from '../analytics/api';

type BibleListeningSectionProps = {
  type: 'language' | 'region';
  entityId: string;
  descendantIds?: string[];
  includeDescendants?: boolean;
};

/**
 * Bible Listening Section displays analytics data (downloads, listen time)
 * for both languages and regions
 */
export const BibleListeningSection: React.FC<BibleListeningSectionProps> = ({
  type,
  entityId,
  descendantIds = [entityId],
  includeDescendants = true,
}) => {
  const router = useRouter();
  const setSelection = useSetSelection();
  const [showDescendants, setShowDescendants] =
    React.useState(includeDescendants);
  const langIds = React.useMemo(
    () => (showDescendants ? descendantIds : [entityId]),
    [showDescendants, descendantIds, entityId]
  );

  // Language type: show usage by region
  const languageUsage = useQuery({
    enabled: type === 'language' && langIds.length > 0,
    queryKey: [
      'analytics-language-usage-by-region-mv',
      entityId,
      showDescendants,
      langIds.join(','),
    ],
    queryFn: () => fetchLanguageUsageByRegionMV(langIds),
    staleTime: 5 * 60 * 1000,
  });

  // Region type: show usage by language
  const regionUsage = useQuery({
    enabled: type === 'region',
    queryKey: ['region-usage-mv', entityId],
    queryFn: () => fetchRegionUsageByLanguageMV(entityId),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch display names
  const regionIds = React.useMemo(() => {
    if (type !== 'language') return [];
    const ids = new Set<string>();
    for (const r of languageUsage.data ?? []) {
      if (r.region_id) ids.add(r.region_id);
    }
    return Array.from(ids);
  }, [type, languageUsage.data]);

  const regionNames = useQuery({
    enabled: regionIds.length > 0,
    queryKey: ['region-names', regionIds.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('id,name')
        .in('id', regionIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of (data ?? []) as Array<{
        id?: string | null;
        name?: string | null;
      }>) {
        if (row.id) map[row.id] = row.name ?? row.id;
      }
      return map;
    },
    staleTime: 60 * 60 * 1000,
  });

  const languageIds = React.useMemo(() => {
    if (type !== 'region') return [];
    const ids = new Set<string>();
    for (const r of regionUsage.data ?? []) {
      ids.add(r.language_entity_id);
    }
    return Array.from(ids);
  }, [type, regionUsage.data]);

  const languageNames = useQuery({
    enabled: languageIds.length > 0,
    queryKey: ['language-names', languageIds.join(',')],
    queryFn: () => fetchLanguageNames(languageIds),
    staleTime: 60 * 60 * 1000,
  });

  // Prepare table data
  type CombinedRow =
    | { region_id: string | null; downloads: number; listened_minutes: number }
    | {
        language_entity_id: string;
        language: string;
        downloads: number;
        listened_minutes: number;
      };

  const tableData = React.useMemo(() => {
    if (type === 'language') {
      const rows = (languageUsage.data ?? []).map(r => ({
        region_id: r.region_id ?? null,
        downloads: Number(r.downloads_total ?? 0),
        listened_minutes: Math.round(
          Number(r.listened_total_seconds ?? 0) / 60
        ),
      }));
      rows.sort((a, b) => b.downloads - a.downloads);
      return rows.slice(0, 5);
    } else {
      const rows = (regionUsage.data ?? []).map(r => ({
        language_entity_id: r.language_entity_id,
        language:
          languageNames.data?.[r.language_entity_id] ?? r.language_entity_id,
        downloads: Number(r.downloads_total ?? 0),
        listened_minutes: Math.round(
          Number(r.listened_total_seconds ?? 0) / 60
        ),
      }));
      rows.sort((a, b) => b.downloads - a.downloads);
      return rows.slice(0, 5);
    }
  }, [type, languageUsage.data, regionUsage.data, languageNames.data]);

  const columns: Column<CombinedRow>[] = React.useMemo(() => {
    if (type === 'language') {
      return [
        {
          key: 'region_id',
          header: 'Region',
          sortable: false,
          render: (_v, row) => {
            const id = (row as { region_id: string | null }).region_id ?? null;
            if (!id) return 'Unknown';
            const name = regionNames.data?.[id];
            return name ?? id;
          },
        },
        { key: 'downloads', header: 'Users', sortable: true },
        { key: 'listened_minutes', header: 'Listen Time', sortable: true },
      ];
    } else {
      return [
        { key: 'language', header: 'Language', sortable: true },
        { key: 'downloads', header: 'Users', sortable: true },
        { key: 'listened_minutes', header: 'Listen Time', sortable: true },
      ];
    }
  }, [type, regionNames.data]);

  const handleRowClick = (row: CombinedRow) => {
    if (type === 'language') {
      const regionId = (row as { region_id: string | null }).region_id ?? null;
      if (!regionId) return;
      setSelection({ kind: 'region', id: regionId });
      router.push(`/map/region/${encodeURIComponent(regionId)}`);
    } else {
      const languageId = (row as { language_entity_id: string })
        .language_entity_id;
      setSelection({ kind: 'language_entity', id: languageId });
      router.push(`/map/language/${encodeURIComponent(languageId)}`);
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='font-semibold'>Bible listening data</div>
        {type === 'language' && descendantIds.length > 1 && (
          <label className='text-xs flex items-center gap-2'>
            <input
              type='checkbox'
              checked={showDescendants}
              onChange={e => setShowDescendants(e.target.checked)}
            />
            Include descendant languages
          </label>
        )}
      </div>

      <div>
        <DataTable
          data={tableData}
          columns={columns}
          searchable={false}
          loading={
            type === 'language'
              ? languageUsage.isLoading
              : regionUsage.isLoading
          }
          emptyMessage='No usage data'
          onRowClick={handleRowClick}
        />
      </div>
    </div>
  );
};
