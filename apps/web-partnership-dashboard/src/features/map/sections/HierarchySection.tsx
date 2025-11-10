'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { useSelection } from '../inspector/state/inspectorStore';
import { TreeSkeleton } from '../components/shared/Skeletons';

type HierarchySectionProps = {
  type: 'language' | 'region';
  entityId: string;
  bare?: boolean;
};

type TreeNode = {
  id: string;
  name: string;
  level: string;
  parentId: string | null;
  children: string[];
};

/**
 * Unified Hierarchy Section that displays language or region hierarchy trees
 */
export const HierarchySection: React.FC<HierarchySectionProps> = ({
  type,
  entityId,
  bare,
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [`${type}-hier`, entityId],
    queryFn: async () => {
      if (type === 'language') {
        const { data, error } = await (supabase as any).rpc(
          'get_language_entity_hierarchy',
          {
            entity_id: entityId,
            generations_up: 3,
            generations_down: 3,
          }
        );
        if (error) throw error;
        return (data ?? []) as Array<{
          hierarchy_entity_id: string;
          hierarchy_entity_name: string;
          hierarchy_entity_level: string;
          hierarchy_parent_id: string | null;
          relationship_type: 'self' | 'ancestor' | 'descendant' | 'sibling';
          generation_distance: number;
        }>;
      } else {
        const { data, error } = await (supabase as any).rpc(
          'get_region_hierarchy',
          {
            region_id: entityId,
            generations_up: 3,
            generations_down: 3,
          }
        );
        if (error) throw error;
        return (data ?? []) as Array<{
          hierarchy_region_id: string;
          hierarchy_region_name: string;
          hierarchy_region_level: string;
          hierarchy_parent_id: string | null;
          relationship_type: 'self' | 'ancestor' | 'descendant' | 'sibling';
          generation_distance: number;
        }>;
      }
    },
    enabled: !!entityId && entityId.trim() !== '',
  });

  const nodesById = React.useMemo(() => {
    const map = new Map<string, TreeNode>();
    if (!data) return map;

    for (const r of data) {
      const id =
        type === 'language'
          ? (r as { hierarchy_entity_id: string }).hierarchy_entity_id
          : (r as { hierarchy_region_id: string }).hierarchy_region_id;
      const name =
        type === 'language'
          ? (r as { hierarchy_entity_name: string }).hierarchy_entity_name
          : (r as { hierarchy_region_name: string }).hierarchy_region_name;
      const level =
        type === 'language'
          ? (r as { hierarchy_entity_level: string }).hierarchy_entity_level
          : (r as { hierarchy_region_level: string }).hierarchy_region_level;
      const parentId =
        type === 'language'
          ? (r as { hierarchy_parent_id: string | null }).hierarchy_parent_id
          : (r as { hierarchy_parent_id: string | null }).hierarchy_parent_id;

      if (!map.has(id)) {
        map.set(id, { id, name, level, parentId, children: [] });
      }
    }

    // Build parent-child relationships
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node.id);
      }
    }

    return map;
  }, [data, type]);

  if (isLoading) return <TreeSkeleton bare={bare} />;
  if (error) return null;

  // Find root node (top-most ancestor or self if no ancestors)
  const self = data!.find(r => r.relationship_type === 'self');
  const ancestors = data!.filter(r => r.relationship_type === 'ancestor');
  const rootId =
    ancestors.length > 0
      ? type === 'language'
        ? (
            ancestors.reduce((min, r) =>
              r.generation_distance < min.generation_distance ? r : min
            ) as { hierarchy_entity_id: string }
          ).hierarchy_entity_id
        : (
            ancestors.reduce((min, r) =>
              r.generation_distance < min.generation_distance ? r : min
            ) as { hierarchy_region_id: string }
          ).hierarchy_region_id
      : self
        ? type === 'language'
          ? (self as { hierarchy_entity_id: string }).hierarchy_entity_id
          : (self as { hierarchy_region_id: string }).hierarchy_region_id
        : null;

  if (!rootId) return null;

  if (bare) {
    return (
      <div>
        <Tree id={rootId} nodesById={nodesById} type={type} />
      </div>
    );
  }

  return (
    <div className='mb-2'>
      <div className='sticky top-0 z-10 bg-white dark:bg-neutral-900 -mx-3 -mt-3 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800'>
        <div className='text-xs font-semibold tracking-wide text-neutral-500'>
          {type === 'language'
            ? 'Language relationships'
            : 'Region relationships'}
        </div>
      </div>
      <div className='pt-2'>
        <Tree id={rootId} nodesById={nodesById} type={type} />
      </div>
    </div>
  );
};

const Tree: React.FC<{
  id: string;
  nodesById: Map<string, TreeNode>;
  type: 'language' | 'region';
}> = ({ id, nodesById, type }) => {
  const [open, setOpen] = React.useState<Record<string, boolean>>({
    [id]: true,
  });
  const router = useRouter();
  const selection = useSelection();

  // Expand all nodes once when nodes change
  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    initializedRef.current = false;
  }, [nodesById]);
  React.useEffect(() => {
    if (initializedRef.current) return;
    const openAll: Record<string, boolean> = {};
    for (const key of nodesById.keys()) openAll[key] = true;
    setOpen(openAll);
    initializedRef.current = true;
  }, [nodesById]);

  const toggle = (nid: string) => setOpen(o => ({ ...o, [nid]: !o[nid] }));

  const renderNode = (nid: string): React.ReactNode => {
    const node = nodesById.get(nid);
    if (!node) return null;

    const hasChildren = node.children.length > 0;
    const isSelected =
      !!selection &&
      ((type === 'language' &&
        selection.kind === 'language_entity' &&
        selection.id === nid) ||
        (type === 'region' &&
          selection.kind === 'region' &&
          selection.id === nid));

    return (
      <div key={nid} className='ml-2'>
        <div className='flex items-center gap-2 py-0.5'>
          {hasChildren ? (
            <button
              className='w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-800'
              onClick={() => toggle(nid)}
              aria-label={open[nid] ? 'Collapse' : 'Expand'}
            >
              {open[nid] ? '▾' : '▸'}
            </button>
          ) : (
            <span className='w-5 h-5' />
          )}
          <button
            className={`text-sm underline-offset-2 hover:underline ${
              isSelected ? 'text-accent-600 font-semibold' : ''
            }`}
            onClick={() =>
              router.push(
                type === 'language'
                  ? `/map/language/${encodeURIComponent(nid)}`
                  : `/map/region/${encodeURIComponent(nid)}`
              )
            }
          >
            {node.name}
          </button>
          <span
            className={`text-xs ${isSelected ? 'text-accent-600' : 'text-neutral-500'}`}
          >
            {node.level}
          </span>
        </div>
        {hasChildren && open[nid] && (
          <div className='ml-4 border-l border-neutral-200 dark:border-neutral-800 pl-2'>
            {node.children.map(cid => renderNode(cid))}
          </div>
        )}
      </div>
    );
  };

  return <div>{renderNode(id)}</div>;
};
