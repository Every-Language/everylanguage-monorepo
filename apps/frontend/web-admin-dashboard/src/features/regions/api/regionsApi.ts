import { supabase } from '@/shared/services/supabase';
import type {
  Region,
  RegionWithLanguages,
  RegionHierarchyNode,
  RegionProperty,
  RegionAlias,
  LanguageEntity,
} from '@/types';

interface FetchRegionsParams {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  levelFilter?: string;
  languageFilters?: string[]; // Changed to array for multi-select
}

export const regionsApi = {
  /**
   * Fetch regions with pagination and search
   */
  async fetchRegions(
    params?: FetchRegionsParams
  ): Promise<{ data: RegionWithLanguages[]; total: number }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // If there's a search query, use the search function (same as partnership dashboard)
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      try {
        const { data: searchResults, error: searchError } = await supabase.rpc(
          'search_region_aliases',
          {
            search_query: params.searchQuery,
            max_results: 100,
            min_similarity: 0.1,
            include_languages: true,
          }
        );

        if (searchError) {
          console.error('Search error:', searchError);
          throw searchError;
        }

        // Transform search results to match our interface
        let results: RegionWithLanguages[] = (searchResults || []).map(
          (result: {
            region_id: string;
            region_name: string;
            region_level: string;
            region_parent_id: string | null;
            alias_name: string;
            alias_similarity_score: number;
            language_count?: number;
          }) => ({
            id: result.region_id,
            name: result.region_name,
            level: result.region_level as
              | 'continent'
              | 'world_region'
              | 'country'
              | 'state'
              | 'province'
              | 'district'
              | 'town'
              | 'village',
            parent_id: result.region_parent_id,
            language_count: result.language_count || 0,
            created_at: '',
            updated_at: '',
            deleted_at: null,
            bbox_max_lat: null,
            bbox_max_lon: null,
            bbox_min_lat: null,
            bbox_min_lon: null,
            boundary: null,
            boundary_simplified: null,
            center_lat: null,
            center_lon: null,
          })
        );

        // Apply level filter to search results (AND logic)
        if (params?.levelFilter) {
          results = results.filter(
            region => region.level === params.levelFilter
          );
        }

        // Apply language filters to search results (AND logic)
        if (params?.languageFilters && params.languageFilters.length > 0) {
          if (params.languageFilters.includes('none')) {
            // Filter for regions with NO languages
            const { data: regionsWithLanguages } = await supabase
              .from('language_entities_regions')
              .select('region_id');

            const regionIdsWithLanguages = new Set(
              regionsWithLanguages?.map(r => r.region_id) || []
            );
            results = results.filter(
              region => !regionIdsWithLanguages.has(region.id)
            );
          } else {
            // Filter for regions with ANY selected language (OR within language filter, AND with search)
            const { data: languageLinks } = await supabase
              .from('language_entities_regions')
              .select('language_entity_id, region_id')
              .in('language_entity_id', params.languageFilters);

            const regionIdsWithLanguages = new Set(
              languageLinks?.map(link => link.region_id) || []
            );
            results = results.filter(region =>
              regionIdsWithLanguages.has(region.id)
            );
          }
        }

        return {
          data: results,
          total: results.length,
        };
      } catch (err) {
        console.error('Search failed:', err);
        throw err;
      }
    }

    // Normal pagination query with filters
    let query = supabase
      .from('regions')
      .select('*, language_entities_regions(language_entity_id)', {
        count: 'exact',
      })
      .is('deleted_at', null);

    // Apply level filter
    if (params?.levelFilter) {
      query = query.eq('level', params.levelFilter as any);
    }

    // Apply language filters (OR logic for multiple languages, AND with level filter)
    if (params?.languageFilters && params.languageFilters.length > 0) {
      if (params.languageFilters.includes('none')) {
        // Filter for regions with NO languages - fetch and filter in JS to avoid URL length issues
        query = query.order('name');

        const { data: allData, error: allError } = await query;

        if (allError) throw allError;

        // Get all regions that have languages
        const { data: regionsWithLanguages } = await supabase
          .from('language_entities_regions')
          .select('region_id');

        const regionIdsWithLanguages = new Set(
          regionsWithLanguages?.map(r => r.region_id) || []
        );

        // Filter out regions that have languages
        const filteredData = (allData || []).filter(
          region => !regionIdsWithLanguages.has(region.id)
        );

        // Apply pagination to filtered results
        const paginatedData = filteredData.slice(from, to + 1);

        const results = paginatedData.map(item => ({
          ...item,
          language_count: 0, // By definition, these have no languages
        }));

        return {
          data: results,
          total: filteredData.length,
        };
      } else {
        // Filter for regions with ANY selected language (OR logic - union)
        const unionIds = new Set<string>();

        for (const languageId of params.languageFilters) {
          const { data: regionsWithLanguage } = await supabase
            .from('language_entities_regions')
            .select('region_id')
            .eq('language_entity_id', languageId);

          const regionIds = regionsWithLanguage?.map(r => r.region_id) || [];
          regionIds.forEach(id => unionIds.add(id));
        }

        if (unionIds.size > 0) {
          query = query.in('id', Array.from(unionIds));
        } else {
          return {
            data: [],
            total: 0,
          };
        }
      }
    }

    query = query.order('name').range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    const results = (data || []).map(item => ({
      ...item,
      language_count: Array.isArray(item.language_entities_regions)
        ? item.language_entities_regions.length
        : 0,
    }));

    return {
      data: results,
      total: count || 0,
    };
  },

  /**
   * Fetch a single region with its language entities
   */
  async fetchRegionById(id: string): Promise<RegionWithLanguages | null> {
    // Fetch region first
    const { data: regionData, error: regionError } = await supabase
      .from('regions')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (regionError) {
      if (regionError.code === 'PGRST116') return null;
      throw regionError;
    }

    // Fetch language entities separately to avoid 406 errors
    const { data: languageLinks, error: languageError } = await supabase
      .from('language_entities_regions')
      .select('language_entity_id, language_entities(*)')
      .eq('region_id', id);

    if (languageError) {
      console.error('Error fetching language entities:', languageError);
      // Don't throw, just return region without languages
      return {
        ...regionData,
        language_entities: [],
      };
    }

    const language_entities =
      (languageLinks?.map(ler => ler.language_entities) as LanguageEntity[]) ||
      [];

    return {
      ...regionData,
      language_entities,
    };
  },

  /**
   * Update a region
   */
  async updateRegion(id: string, updates: Partial<Region>): Promise<void> {
    const { error: updateError } = await supabase
      .from('regions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;
  },

  /**
   * Update region language entities
   */
  async updateRegionLanguageEntities(
    regionId: string,
    languageEntityIds: string[]
  ): Promise<void> {
    // Fetch existing language entity IDs
    const { data: existingLinks } = await supabase
      .from('language_entities_regions')
      .select('language_entity_id')
      .eq('region_id', regionId);

    const existingLanguageIds =
      existingLinks?.map(l => l.language_entity_id) || [];

    // Find language entities to add and remove
    const toAdd = languageEntityIds.filter(
      id => !existingLanguageIds.includes(id)
    );
    const toRemove = existingLanguageIds.filter(
      id => !languageEntityIds.includes(id)
    );

    // Remove language entities
    if (toRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('language_entities_regions')
        .delete()
        .eq('region_id', regionId)
        .in('language_entity_id', toRemove);

      if (deleteError) {
        console.error('Error removing language entities:', deleteError);
        throw new Error(
          'Failed to remove language entities. You may not have permission.'
        );
      }
    }

    // Add language entities
    if (toAdd.length > 0) {
      const { error: insertError } = await supabase
        .from('language_entities_regions')
        .insert(
          toAdd.map(languageEntityId => ({
            language_entity_id: languageEntityId,
            region_id: regionId,
          }))
        );

      if (insertError) {
        console.error('Error adding language entities:', insertError);
        throw new Error(
          'Failed to add language entities. You may not have permission.'
        );
      }
    }
  },

  /**
   * Fetch region hierarchy (parent and children)
   */
  async fetchRegionHierarchy(regionId: string): Promise<RegionHierarchyNode[]> {
    const { data, error } = await supabase.rpc('get_region_hierarchy', {
      region_id: regionId,
      generations_up: 3,
      generations_down: 3,
    });

    if (error) throw error;
    return (data || []) as RegionHierarchyNode[];
  },

  /**
   * Fetch region properties
   */
  async fetchRegionProperties(regionId: string): Promise<RegionProperty[]> {
    const { data, error } = await supabase
      .from('region_properties')
      .select('*')
      .eq('region_id', regionId)
      .is('deleted_at', null)
      .order('key');

    if (error) throw error;
    return data || [];
  },

  /**
   * Update region properties
   */
  async updateRegionProperties(
    regionId: string,
    properties: Array<{ key: string; value: string }>
  ): Promise<void> {
    // Delete existing properties
    const { error: deleteError } = await supabase
      .from('region_properties')
      .delete()
      .eq('region_id', regionId);

    if (deleteError) throw deleteError;

    // Insert new properties if any
    if (properties.length > 0) {
      const { error: insertError } = await supabase
        .from('region_properties')
        .insert(
          properties.map(prop => ({
            region_id: regionId,
            key: prop.key,
            value: prop.value,
          }))
        );

      if (insertError) throw insertError;
    }
  },

  /**
   * Fetch region aliases
   */
  async fetchRegionAliases(regionId: string): Promise<RegionAlias[]> {
    const { data, error } = await supabase
      .from('region_aliases')
      .select('*')
      .eq('region_id', regionId)
      .is('deleted_at', null)
      .order('alias_name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Update region aliases
   */
  async updateRegionAliases(
    regionId: string,
    aliases: Array<{ alias_name: string }>
  ): Promise<void> {
    // Delete existing aliases
    const { error: deleteError } = await supabase
      .from('region_aliases')
      .delete()
      .eq('region_id', regionId);

    if (deleteError) throw deleteError;

    // Insert new aliases if any
    if (aliases.length > 0) {
      const { error: insertError } = await supabase
        .from('region_aliases')
        .insert(
          aliases.map(alias => ({
            region_id: regionId,
            alias_name: alias.alias_name,
          }))
        );

      if (insertError) throw insertError;
    }
  },

  /**
   * Search for language entities (for the linked languages section)
   */
  async searchLanguageEntities(query: string): Promise<LanguageEntity[]> {
    if (!query || query.trim().length < 2) return [];

    const { data, error } = await supabase.rpc('search_language_aliases', {
      search_query: query,
      max_results: 20,
      min_similarity: 0.1,
      include_regions: false,
    });

    if (error) {
      console.error('Language search error:', error);
      throw error;
    }

    // Transform search results
    return (data || []).map(
      (result: {
        entity_id: string;
        entity_name: string;
        entity_level: string;
        entity_parent_id: string | null;
      }) => ({
        id: result.entity_id,
        name: result.entity_name,
        level: result.entity_level as
          | 'family'
          | 'language'
          | 'dialect'
          | 'mother_tongue',
        parent_id: result.entity_parent_id,
        created_at: '',
        updated_at: '',
        deleted_at: null,
      })
    );
  },

  /**
   * Fetch all regions (simple list for dropdowns)
   */
  async fetchRegionsList(): Promise<Partial<Region>[]> {
    const { data, error } = await supabase
      .from('regions')
      .select('id, name, level, parent_id')
      .is('deleted_at', null)
      .order('name');

    if (error) throw error;
    return data || [];
  },
};
