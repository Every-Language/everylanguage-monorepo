import { useState, useEffect } from 'react';
import { supabase } from '@/shared/infrastructure/supabase';
import { logger } from '@/shared/utils/logger';

export interface RegionHierarchyNode {
  hierarchy_region_id: string;
  hierarchy_region_name: string;
  hierarchy_region_level: string;
  hierarchy_parent_id: string | null;
  relationship_type: 'self' | 'ancestor' | 'descendant' | 'sibling';
  generation_distance: number;
}

export interface RegionStats {
  region_id: string;
  region_name: string;
  population: number;
  language_count: number;
  people_group_count: number;
}

export interface RegionDetails {
  id: string;
  name: string;
  level: string;
  parent_id: string | null;
}

interface UseRegionDetailsResult {
  data: RegionDetails | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching region basic details
 */
export const useRegionDetails = (
  regionId: string | null
): UseRegionDetailsResult => {
  const [data, setData] = useState<RegionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!regionId) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const fetchDetails = async (): Promise<void> => {
      try {
        const { data: result, error: fetchError } = await supabase
          .from('regions')
          .select('id, name, level, parent_id')
          .eq('id', regionId)
          .is('deleted_at', null)
          .single();

        if (cancelled) return;

        if (fetchError) {
          logger.error('Error fetching region details:', fetchError);
          throw fetchError;
        }

        if (!result) {
          setData(null);
        } else {
          setData({
            id: result.id,
            name: result.name,
            level: result.level,
            parent_id: result.parent_id,
          });
        }
      } catch (err) {
        if (cancelled) return;
        const error =
          err instanceof Error
            ? err
            : new Error('Failed to fetch region details');
        logger.error('Failed to fetch region details:', error);
        setError(error);
        setData(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [regionId]);

  return { data, isLoading, error };
};

interface UseRegionHierarchyResult {
  data: RegionHierarchyNode[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching region hierarchy
 */
export const useRegionHierarchy = (
  regionId: string | null
): UseRegionHierarchyResult => {
  const [data, setData] = useState<RegionHierarchyNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!regionId) {
      setData([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const fetchHierarchy = async (): Promise<void> => {
      try {
        const { data: result, error: fetchError } = await supabase.rpc(
          'get_region_hierarchy',
          {
            region_id: regionId,
            generations_up: 3,
            generations_down: 3,
          }
        );

        if (cancelled) return;

        if (fetchError) {
          logger.error('Error fetching region hierarchy:', fetchError);
          throw fetchError;
        }

        setData((result || []) as RegionHierarchyNode[]);
      } catch (err) {
        if (cancelled) return;
        const error =
          err instanceof Error
            ? err
            : new Error('Failed to fetch region hierarchy');
        logger.error('Failed to fetch region hierarchy:', error);
        setError(error);
        setData([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchHierarchy();

    return () => {
      cancelled = true;
    };
  }, [regionId]);

  return { data, isLoading, error };
};

interface UseRegionStatsResult {
  data: RegionStats | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching region statistics
 */
export const useRegionStats = (
  regionId: string | null
): UseRegionStatsResult => {
  const [data, setData] = useState<RegionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!regionId) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const fetchStats = async (): Promise<void> => {
      try {
        const { data: result, error: fetchError } = await supabase
          .from('region_stats')
          .select(
            'region_id, region_name, population, language_count, people_group_count'
          )
          .eq('region_id', regionId)
          .single();

        if (cancelled) return;

        if (fetchError) {
          // If stats don't exist, return null (not an error)
          if (fetchError.code === 'PGRST116') {
            setData(null);
            setIsLoading(false);
            return;
          }
          logger.error('Error fetching region stats:', fetchError);
          throw fetchError;
        }

        if (!result) {
          setData(null);
        } else {
          setData({
            region_id: result.region_id ?? '',
            region_name: result.region_name ?? '',
            population: result.population || 0,
            language_count: result.language_count || 0,
            people_group_count: result.people_group_count || 0,
          });
        }
      } catch (err) {
        if (cancelled) return;
        const error =
          err instanceof Error
            ? err
            : new Error('Failed to fetch region stats');
        logger.error('Failed to fetch region stats:', error);
        setError(error);
        setData(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchStats();

    return () => {
      cancelled = true;
    };
  }, [regionId]);

  return { data, isLoading, error };
};
