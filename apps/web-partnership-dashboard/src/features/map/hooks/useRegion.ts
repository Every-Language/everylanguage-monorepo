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
  // Only enable queries if we have a valid ID
  const enabled = !!id && id.trim() !== '';

  // Fetch region (avoid .single() to prevent 406 errors)
  const region = useQuery({
    queryKey: ['region', id],
    queryFn: async () => {
      // Use array query without .single() to avoid 406 errors on missing regions
      const { data: regionData, error: regionError } = await supabase
        .from('regions')
        .select('id,name,level')
        .eq('id', id)
        .limit(1);

      if (regionError) throw regionError;
      if (!regionData || regionData.length === 0) {
        throw new Error(`Region not found: ${id}`);
      }

      const row = regionData[0] as any;

      // Fetch aliases separately
      const { data: aliasData, error: aliasError } = await (supabase as any)
        .from('region_aliases')
        .select('alias_name')
        .eq('region_id', id)
        .is('deleted_at', null);

      if (aliasError) throw aliasError;

      const aliases = (aliasData ?? [])
        .map((a: any) => a.alias_name)
        .filter((v: any): v is string => !!v);

      return {
        id: row.id,
        name: row.name,
        level: row.level,
        aliases,
      } as RegionData;
    },
    enabled,
    retry: false, // Don't retry on missing regions
  });

  // Fetch properties
  const properties = useQuery({
    queryKey: ['region_properties', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('region_properties')
        .select('id,key,value')
        .eq('region_id', id);
      if (error) throw error;
      return (data ?? []) as RegionProperty[];
    },
    enabled,
  });

  // Prefer lightweight bbox RPC
  const bbox = useQuery({
    queryKey: ['region_bbox', id],
    queryFn: async () => {
      try {
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
    enabled,
  });

  // Fallback: simplified boundary
  const boundary = useQuery({
    enabled: enabled && bbox.isFetched && !bbox.data,
    queryKey: ['region_boundary_simplified', id],
    queryFn: async () => {
      try {
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
