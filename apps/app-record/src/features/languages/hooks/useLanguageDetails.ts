import { useState, useEffect } from 'react';
import { supabase } from '@/shared/infrastructure/supabase';
import { logger } from '@/shared/utils/logger';

export interface LanguageHierarchyNode {
  hierarchy_entity_id: string;
  hierarchy_entity_name: string;
  hierarchy_entity_level: string;
  hierarchy_parent_id: string | null;
  relationship_type: 'self' | 'ancestor' | 'descendant' | 'sibling';
  generation_distance: number;
}

export interface LanguageStats {
  language_entity_id: string;
  language_name: string;
  population: number;
  country_count: number;
  people_group_count: number;
  has_whole_bible: boolean;
  has_new_testament: boolean;
  has_portions: boolean;
  has_jesus_film: boolean;
  has_audio_recordings: boolean;
  bible_year: string | null;
  nt_year: string | null;
  portions_year: string | null;
}

export interface LanguageDetails {
  id: string;
  name: string;
  level: string;
  parent_id: string | null;
}

interface UseLanguageDetailsResult {
  data: LanguageDetails | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching language entity basic details
 */
export const useLanguageDetails = (
  languageId: string | null
): UseLanguageDetailsResult => {
  const [data, setData] = useState<LanguageDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!languageId) {
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
          .from('language_entities')
          .select('id, name, level, parent_id')
          .eq('id', languageId)
          .is('deleted_at', null)
          .single();

        if (cancelled) return;

        if (fetchError) {
          logger.error('Error fetching language details:', fetchError);
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
            : new Error('Failed to fetch language details');
        logger.error('Failed to fetch language details:', error);
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
  }, [languageId]);

  return { data, isLoading, error };
};

interface UseLanguageHierarchyResult {
  data: LanguageHierarchyNode[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching language hierarchy
 */
export const useLanguageHierarchy = (
  languageId: string | null
): UseLanguageHierarchyResult => {
  const [data, setData] = useState<LanguageHierarchyNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!languageId) {
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
          'get_language_entity_hierarchy',
          {
            entity_id: languageId,
            generations_up: 3,
            generations_down: 3,
          }
        );

        if (cancelled) return;

        if (fetchError) {
          logger.error('Error fetching language hierarchy:', fetchError);
          throw fetchError;
        }

        setData((result || []) as LanguageHierarchyNode[]);
      } catch (err) {
        if (cancelled) return;
        const error =
          err instanceof Error
            ? err
            : new Error('Failed to fetch language hierarchy');
        logger.error('Failed to fetch language hierarchy:', error);
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
  }, [languageId]);

  return { data, isLoading, error };
};

interface UseLanguageStatsResult {
  data: LanguageStats | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching language statistics
 */
export const useLanguageStats = (
  languageId: string | null
): UseLanguageStatsResult => {
  const [data, setData] = useState<LanguageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!languageId) {
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
          .from('language_stats')
          .select(
            'language_entity_id, language_name, population, country_count, people_group_count, has_whole_bible, has_new_testament, has_portions, has_jesus_film, has_audio_recordings, bible_year, nt_year, portions_year'
          )
          .eq('language_entity_id', languageId)
          .single();

        if (cancelled) return;

        if (fetchError) {
          // If stats don't exist, return null (not an error)
          if (fetchError.code === 'PGRST116') {
            setData(null);
            setIsLoading(false);
            return;
          }
          logger.error('Error fetching language stats:', fetchError);
          throw fetchError;
        }

        if (!result) {
          setData(null);
        } else {
          setData({
            language_entity_id: result.language_entity_id || '',
            language_name: result.language_name || '',
            population: result.population || 0,
            country_count: result.country_count || 0,
            people_group_count: result.people_group_count || 0,
            has_whole_bible: result.has_whole_bible || false,
            has_new_testament: result.has_new_testament || false,
            has_portions: result.has_portions || false,
            has_jesus_film: result.has_jesus_film || false,
            has_audio_recordings: result.has_audio_recordings || false,
            bible_year: result.bible_year,
            nt_year: result.nt_year,
            portions_year: result.portions_year,
          });
        }
      } catch (err) {
        if (cancelled) return;
        const error =
          err instanceof Error
            ? err
            : new Error('Failed to fetch language stats');
        logger.error('Failed to fetch language stats:', error);
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
  }, [languageId]);

  return { data, isLoading, error };
};
