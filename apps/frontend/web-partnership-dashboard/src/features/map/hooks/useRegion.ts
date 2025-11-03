import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

type RegionData = {
  id: string;
  name: string;
  level: string;
  aliases: string[];
};

type RegionProperty = {
  id: string;
  key: string;
  value: string;
};

type BBox = [number, number, number, number];

/**
 * Hook for fetching region data including region info, properties, and bbox.
 */
export function useRegion(id: string) {
  // Fetch region with aliases
  const region = useQuery({
    queryKey: ['region', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('id,name,level,region_aliases(alias_name)')
        .eq('id', id)
        .single();
      if (error) throw error;
      const row = data as unknown as {
        id: string;
        name: string;
        level: string;
        region_aliases?: Array<{ alias_name: string | null }>;
      };
      const aliases = (row.region_aliases ?? [])
        .map(a => a.alias_name)
        .filter((v): v is string => !!v);
      return {
        id: row.id,
        name: row.name,
        level: row.level,
        aliases,
      } as RegionData;
    },
  });

  // Fetch properties
  const properties = useQuery({
    queryKey: ['region_properties', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('region_properties')
        .select('id,key,value')
        .eq('region_id', id);
      if (error) throw error;
      return (data ?? []) as RegionProperty[];
    },
  });

  // Prefer lightweight bbox RPC
  const bbox = useQuery({
    queryKey: ['region_bbox', id],
    queryFn: async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc(
          'get_region_bbox_by_id',
          {
            p_region_id: id,
          }
        );
        if (error || !data) return null as BBox | null;
        const row =
          Array.isArray(data) && data.length > 0
            ? (data[0] as {
                min_lon?: number;
                min_lat?: number;
                max_lon?: number;
                max_lat?: number;
              })
            : null;
        if (!row) return null;
        const minx = Number(row.min_lon);
        const miny = Number(row.min_lat);
        const maxx = Number(row.max_lon);
        const maxy = Number(row.max_lat);
        if ([minx, miny, maxx, maxy].every(n => Number.isFinite(n)))
          return [minx, miny, maxx, maxy] as BBox;
        return null as BBox | null;
      } catch {
        return null as BBox | null;
      }
    },
    staleTime: 30 * 60 * 1000,
  });

  // Fallback: simplified boundary
  const boundary = useQuery({
    enabled: bbox.isFetched && !bbox.data,
    queryKey: ['region_boundary_simplified', id],
    queryFn: async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc(
          'get_region_boundary_simplified_by_id',
          {
            p_region_id: id,
            p_tolerance: null,
          }
        );
        if (error || !data) return null;
        const row =
          Array.isArray(data) && data.length > 0
            ? (data[0] as { boundary?: unknown })
            : null;
        return (row?.boundary ?? null) as unknown | null;
      } catch {
        return null as unknown | null;
      }
    },
    staleTime: 30 * 60 * 1000,
  });

  return {
    region,
    properties,
    bbox,
    boundary,
  };
}
