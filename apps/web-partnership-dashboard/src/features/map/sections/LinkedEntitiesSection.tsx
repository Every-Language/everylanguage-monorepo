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
  parentType?: 'language_entity' | 'region' | 'people_group';
  scrollRef?: React.RefObject<HTMLDivElement | null>;
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
  parentType,
  scrollRef,
}) => {
  // Infer parentType from type if not provided (backward compatibility)
  const inferredParentType =
    parentType || (type === 'languages' ? 'region' : 'language_entity');
  const [query, setQuery] = React.useState('');
  const router = useRouter();
  const selection = useSelection();
  const virtualContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [scrollMargin, setScrollMargin] = React.useState(0);

  const entitiesQuery = useQuery({
    queryKey: [
      type === 'languages'
        ? inferredParentType === 'people_group'
          ? 'people-group-linked-languages'
          : 'region-linked-languages'
        : inferredParentType === 'people_group'
          ? 'people-group-linked-regions'
          : 'language-linked-regions',
      parentId,
    ],
    queryFn: async () => {
      if (type === 'languages') {
        if (inferredParentType === 'people_group') {
          // Fetch languages for a people group
          // First get people_group_region_ids for this people_group_id
          const { data: pgrData, error: pgrError } = await supabase
            .from('people_groups_regions')
            .select('id')
            .eq('people_group_id', parentId)
            .is('deleted_at', null);
          if (pgrError) throw pgrError;
          const pgrIds = (pgrData ?? []).map((r: { id: string }) => r.id);
          if (pgrIds.length === 0) return [];

          // Then query language_entities_people_groups_regions joined with language_entities
          const { data, error } = await supabase
            .from('language_entities_people_groups_regions')
            .select(
              'language_entity_id, language_entities!inner(id, name, level)'
            )
            .in('people_group_region_id', pgrIds);
          if (error) throw error;
          const items = (data ?? []).map(
            (r: {
              language_entity_id: string;
              language_entities: { id: string; name: string; level: string };
            }) => ({
              id: r.language_entities.id,
              name: r.language_entities.name,
              level: r.language_entities.level,
            })
          );
          // Deduplicate by id
          const dedup = new Map<string, EntityItem>();
          for (const it of items) if (!dedup.has(it.id)) dedup.set(it.id, it);
          return Array.from(dedup.values());
        } else {
          // Fetch languages for a region
          const { data, error } = await (supabase as any).rpc(
            'list_languages_for_region',
            {
              p_region_id: parentId,
              p_include_descendants: true,
            }
          );
          if (error) throw error;
          const items = (data ?? []) as EntityItem[];
          // Deduplicate by id to prevent duplicate key errors
          const dedup = new Map<string, EntityItem>();
          for (const it of items) if (!dedup.has(it.id)) dedup.set(it.id, it);
          return Array.from(dedup.values());
        }
      } else {
        // type === 'regions'
        if (inferredParentType === 'people_group') {
          // Fetch regions for a people group using vw_people_groups_in_region
          const { data, error } = await supabase
            .from('vw_people_groups_in_region')
            .select('region_id, region_name')
            .eq('people_group_id', parentId);
          if (error) throw error;
          // Get region level from regions table
          const regionIds = Array.from(
            new Set((data ?? []).map((r: any) => r.region_id))
          );
          if (regionIds.length === 0) return [];
          const { data: regionsData, error: regionsError } = await supabase
            .from('regions')
            .select('id, name, level')
            .in('id', regionIds);
          if (regionsError) throw regionsError;
          return (regionsData ?? []).map((r: any) => ({
            id: r.id,
            name: r.name,
            level: r.level,
          })) as EntityItem[];
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

  // Measure the offset from scroll container to virtualized list
  React.useEffect(() => {
    if (!scrollRef?.current || !virtualContainerRef.current) return;

    const updateScrollMargin = (): void => {
      const scrollElement = scrollRef.current;
      const containerElement = virtualContainerRef.current;
      if (!scrollElement || !containerElement) return;

      // Get bounding rects relative to viewport
      const scrollRect = scrollElement.getBoundingClientRect();
      const containerRect = containerElement.getBoundingClientRect();

      // Calculate offset from scroll container's content top to virtual container top
      // When scrollTop = 0, containerRect.top - scrollRect.top is the offset
      // When scrolled, we need to add scrollTop to get the offset in scroll coordinates
      const viewportOffset = containerRect.top - scrollRect.top;
      const scrollOffset = scrollElement.scrollTop;
      const totalOffset = viewportOffset + scrollOffset;

      setScrollMargin(Math.max(0, totalOffset));
    };

    // Initial measurement
    const rafId = requestAnimationFrame(() => {
      updateScrollMargin();
    });

    // Re-measure when content changes or scrolls
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateScrollMargin);
    });

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      resizeObserver.observe(scrollElement);
      // Also listen to scroll events to remeasure
      scrollElement.addEventListener('scroll', updateScrollMargin, {
        passive: true,
      });
    }
    if (virtualContainerRef.current) {
      resizeObserver.observe(virtualContainerRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      if (scrollElement) {
        scrollElement.removeEventListener('scroll', updateScrollMargin);
      }
    };
  }, [scrollRef, filtered.length, query]);

  const useVirtual = filtered.length > 50;
  const gapSize = 8; // gap-2 = 0.5rem = 8px
  const baseSize = type === 'languages' ? 72 : 92;
  const rowVirtualizer = useVirtualizer({
    count: useVirtual ? filtered.length : 0,
    getScrollElement: () => scrollRef?.current ?? null,
    estimateSize: index => {
      // Include gap after each item except the last one
      return baseSize + (index < filtered.length - 1 ? gapSize : 0);
    },
    overscan: 10,
    scrollMargin,
  });

  const sectionTitle = type === 'languages' ? 'Languages' : 'Countries';
  const searchPlaceholder =
    type === 'languages' ? 'Search languages…' : 'Search countries…';

  return (
    <div className='space-y-2'>
      <Input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
        leftIcon={<SearchIcon className='w-4 h-4' />}
        size='sm'
      />
      {useVirtual ? (
        <div
          ref={virtualContainerRef}
          className='relative'
          style={{
            height: rowVirtualizer.getTotalSize(),
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map(v => {
            const item = filtered[v.index];
            const isLast = v.index === filtered.length - 1;
            return (
              <div
                key={item.id}
                className='absolute top-0 left-0 w-full'
                style={{
                  transform: `translateY(${v.start - scrollMargin}px)`,
                  paddingBottom: isLast ? 0 : `${gapSize}px`,
                }}
              >
                {type === 'languages' ? (
                  <LanguageCard
                    languageEntityId={item.id}
                    contextualRegionId={
                      inferredParentType === 'region' ? parentId : undefined
                    }
                    showName={true}
                    showPopulation={true}
                    showBibleStatus={true}
                    showCountryCount={false}
                    showPeopleGroupCount={false}
                    showAudioRecordings={false}
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
                    regionId={item.id}
                    contextualLanguageId={
                      inferredParentType === 'language_entity'
                        ? parentId
                        : undefined
                    }
                    showName={true}
                    showPopulation={true}
                    showBibleStatusBreakdown={true}
                    showPeopleGroupCount={false}
                    showLanguageCount={false}
                    showReligiousComposition={false}
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
                languageEntityId={item.id}
                contextualRegionId={
                  inferredParentType === 'region' ? parentId : undefined
                }
                showName={true}
                showPopulation={true}
                showBibleStatus={true}
                showCountryCount={false}
                showPeopleGroupCount={false}
                showAudioRecordings={false}
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
                regionId={item.id}
                contextualLanguageId={
                  inferredParentType === 'language_entity'
                    ? parentId
                    : undefined
                }
                showName={true}
                showPopulation={true}
                showBibleStatusBreakdown={true}
                showPeopleGroupCount={false}
                showLanguageCount={false}
                showReligiousComposition={false}
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
