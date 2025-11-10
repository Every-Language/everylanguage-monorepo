'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { Input } from '@/shared/components/ui/Input';
import { Search as SearchIcon } from 'lucide-react';
import Fuse from 'fuse.js';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LanguageCard } from '@/shared/components/LanguageCard';
import { RegionCard } from '@/shared/components/RegionCard';
import { useSelection } from '../inspector/state/inspectorStore';

type LinkedEntitiesSectionProps = {
  type: 'languages' | 'regions';
  parentId: string;
  scrollRef?: React.RefObject<HTMLDivElement>;
};

type EntityItem = {
  id: string;
  name: string;
  level: string;
};

/**
 * Unified section for displaying linked languages (for regions) or linked regions (for languages)
 */
export const LinkedEntitiesSection: React.FC<LinkedEntitiesSectionProps> = ({
  type,
  parentId,
  scrollRef,
}) => {
  const [query, setQuery] = React.useState('');
  const router = useRouter();
  const selection = useSelection();

  const entitiesQuery = useQuery({
    queryKey: [
      type === 'languages'
        ? 'region-linked-languages'
        : 'language-linked-regions',
      parentId,
    ],
    queryFn: async () => {
      if (type === 'languages') {
        // Fetch languages for a region
        const { data, error } = await (supabase as any).rpc(
          'list_languages_for_region',
          {
            p_region_id: parentId,
            p_include_descendants: true,
          }
        );
        if (error) throw error;
        return (data ?? []) as EntityItem[];
      } else {
        // Fetch regions for a language
        const { data, error } = await supabase
          .from('language_entities_regions')
          .select('regions(id,name,level)')
          .eq('language_entity_id', parentId);
        if (error) throw error;
        const items = (data ?? []).map(
          (r: { regions: { id: string; name: string; level: string } }) => ({
            id: r.regions.id,
            name: r.regions.name,
            level: r.regions.level,
          })
        );
        // Deduplicate by id
        const dedup = new Map<string, EntityItem>();
        for (const it of items) if (!dedup.has(it.id)) dedup.set(it.id, it);
        return Array.from(dedup.values());
      }
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!parentId && parentId.trim() !== '',
  });

  const filtered = React.useMemo(() => {
    const items = entitiesQuery.data ?? [];
    const trimmed = query.trim();
    if (!trimmed) return items;
    const fuse = new Fuse(items, {
      keys: ['name'],
      threshold: 0.35,
      ignoreLocation: true,
    });
    return fuse.search(trimmed).map(r => r.item);
  }, [entitiesQuery.data, query]);

  const useVirtual = filtered.length > 50;
  const rowVirtualizer = useVirtualizer({
    count: useVirtual ? filtered.length : 0,
    getScrollElement: () => scrollRef?.current ?? null,
    estimateSize: () => (type === 'languages' ? 72 : 92),
    overscan: 10,
  });

  const sectionTitle = type === 'languages' ? 'Languages' : 'Countries';
  const searchPlaceholder =
    type === 'languages' ? 'Search languages…' : 'Search countries…';

  return (
    <div className='space-y-2'>
      <div className='font-semibold'>{sectionTitle}</div>
      <Input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
        leftIcon={<SearchIcon className='w-4 h-4' />}
        size='sm'
      />
      {useVirtual ? (
        <div
          className='relative'
          style={{
            height: rowVirtualizer.getTotalSize(),
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map(v => {
            const item = filtered[v.index];
            return (
              <div
                key={item.id}
                className='absolute top-0 left-0 w-full p-0.5'
                style={{ transform: `translateY(${v.start}px)` }}
              >
                {type === 'languages' ? (
                  <LanguageCard
                    language={{
                      id: item.id,
                      name: item.name,
                      level: item.level,
                    }}
                    isSelected={
                      selection?.kind === 'language_entity' &&
                      selection.id === item.id
                    }
                    onClick={lid =>
                      router.push(`/map/language/${encodeURIComponent(lid)}`)
                    }
                  />
                ) : (
                  <RegionCard
                    region={{ id: item.id, name: item.name, level: item.level }}
                    isSelected={
                      selection?.kind === 'region' && selection.id === item.id
                    }
                    onClick={rid =>
                      router.push(`/map/region/${encodeURIComponent(rid)}`)
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-2'>
          {filtered.map(item =>
            type === 'languages' ? (
              <LanguageCard
                key={item.id}
                language={{ id: item.id, name: item.name, level: item.level }}
                isSelected={
                  selection?.kind === 'language_entity' &&
                  selection.id === item.id
                }
                onClick={lid =>
                  router.push(`/map/language/${encodeURIComponent(lid)}`)
                }
              />
            ) : (
              <RegionCard
                key={item.id}
                region={{ id: item.id, name: item.name, level: item.level }}
                isSelected={
                  selection?.kind === 'region' && selection.id === item.id
                }
                onClick={rid =>
                  router.push(`/map/region/${encodeURIComponent(rid)}`)
                }
              />
            )
          )}
        </div>
      )}
      {(entitiesQuery.data?.length ?? 0) > 0 && filtered.length === 0 && (
        <div className='text-sm text-neutral-500'>
          No {sectionTitle.toLowerCase()} match "{query}"
        </div>
      )}
      {(entitiesQuery.data?.length ?? 0) === 0 && (
        <div className='text-sm text-neutral-500'>
          No linked {sectionTitle.toLowerCase()}
        </div>
      )}
    </div>
  );
};
