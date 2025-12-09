import { supabase } from '@/shared/services/supabase';
import type {
  LanguageEntity,
  LanguageEntityWithRegions,
  LanguageProperty,
  LanguageAlias,
  LanguageHierarchyNode,
  Region,
} from '@/types';
import type { Database } from '@everylanguage/shared-types';
import { locationToPostGIS } from '@/shared/utils/locationUtils';

type LanguageEntityLevel = Database['public']['Enums']['language_entity_level'];

export const languagesApi = {
  /**
   * Fetch language entities with pagination and region counts
   */
  async fetchLanguageEntities(params?: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    levelFilter?: string;
    regionFilters?: string[]; // Changed to array for multi-select
    externalIdSearch?: string; // Search by external_id in language_entity_sources
  }): Promise<{
    data: LanguageEntityWithRegions[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // If there's a search query, use the search function (same as partnership dashboard)
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      try {
        const { data: searchResults, error: searchError } = await supabase.rpc(
          'search_language_aliases',
          {
            search_query: params.searchQuery,
            max_results: 100,
            min_similarity: 0.1,
            include_regions: true,
          }
        );

        if (searchError) {
          console.error('Search RPC error:', searchError);
          throw searchError;
        }

        // Transform search results to match our interface
        let results: LanguageEntityWithRegions[] = (searchResults || []).map(
          (result: {
            entity_id: string;
            entity_name: string;
            entity_level: string;
            entity_parent_id: string | null;
            alias_name: string;
            alias_similarity_score: number;
            region_count?: number;
          }) =>
            ({
              id: result.entity_id,
              name: result.entity_name,
              level: result.entity_level as
                | 'family'
                | 'language'
                | 'dialect'
                | 'mother_tongue',
              parent_id: result.entity_parent_id,
              region_count: result.region_count || 0,
              created_at: '',
              updated_at: '',
              deleted_at: null,
              funding_status: null,
            }) as LanguageEntityWithRegions
        );

        // Apply external_id search filter if provided
        if (
          params?.externalIdSearch &&
          params.externalIdSearch.trim().length > 0
        ) {
          const { data: sourcesData, error: sourcesError } = await supabase
            .from('language_entity_sources')
            .select('language_entity_id')
            .ilike('external_id', `%${params.externalIdSearch.trim()}%`)
            .is('deleted_at', null);

          if (sourcesError) {
            console.error('Error searching by external_id:', sourcesError);
            throw sourcesError;
          }

          const entityIdsFromExternalId = new Set(
            sourcesData?.map(s => s.language_entity_id) || []
          );
          results = results.filter(entity =>
            entityIdsFromExternalId.has(entity.id)
          );
        }

        // Apply level filter to search results (AND logic)
        if (params?.levelFilter) {
          results = results.filter(
            entity => entity.level === params.levelFilter
          );
        }

        // Apply region filters to search results (AND logic)
        if (params?.regionFilters && params.regionFilters.length > 0) {
          if (params.regionFilters.includes('none')) {
            // Filter for entities with NO regions
            const { data: entitiesWithRegions } = await supabase
              .from('language_entities_regions')
              .select('language_entity_id');

            const entityIdsWithRegions = new Set(
              entitiesWithRegions?.map(e => e.language_entity_id) || []
            );
            results = results.filter(
              entity => !entityIdsWithRegions.has(entity.id)
            );
          } else {
            // Filter for entities in ANY selected region (OR within region filter, AND with search)
            const { data: regionLinks } = await supabase
              .from('language_entities_regions')
              .select('language_entity_id, region_id')
              .in('region_id', params.regionFilters);

            const entityIdsInRegions = new Set(
              regionLinks?.map(link => link.language_entity_id) || []
            );
            results = results.filter(entity =>
              entityIdsInRegions.has(entity.id)
            );
          }
        }

        return {
          data: results.slice(from, to + 1),
          count: results.length,
          page,
          pageSize,
          totalPages: Math.ceil(results.length / pageSize),
        };
      } catch (error) {
        console.error('Search error:', error);
        throw error;
      }
    }

    // Apply external_id search filter if provided
    let entityIdsFromExternalId: string[] | undefined;
    if (params?.externalIdSearch && params.externalIdSearch.trim().length > 0) {
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('language_entity_sources')
        .select('language_entity_id')
        .ilike('external_id', `%${params.externalIdSearch.trim()}%`)
        .is('deleted_at', null);

      if (sourcesError) {
        console.error('Error searching by external_id:', sourcesError);
        throw sourcesError;
      }

      entityIdsFromExternalId = [
        ...new Set(sourcesData?.map(s => s.language_entity_id) || []),
      ];

      // If no matches, return empty result
      if (entityIdsFromExternalId.length === 0) {
        return {
          data: [],
          count: 0,
          page,
          pageSize,
          totalPages: 0,
        };
      }
    }

    // Otherwise, fetch with pagination and filters
    let query = supabase
      .from('language_entities')
      .select(
        `
        *,
        language_entities_regions(region_id),
        language_funding(*)
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null);

    // Apply external_id filter
    if (entityIdsFromExternalId && entityIdsFromExternalId.length > 0) {
      query = query.in('id', entityIdsFromExternalId);
    }

    // Apply level filter
    if (params?.levelFilter) {
      query = query.eq('level', params.levelFilter as LanguageEntityLevel);
    }

    // Apply region filters (OR logic for multiple regions, AND with level filter)
    if (params?.regionFilters && params.regionFilters.length > 0) {
      if (params.regionFilters.includes('none')) {
        // Filter for languages with NO regions - fetch and filter in JS to avoid URL length issues
        // First, complete the query to get base results
        query = query.order('name');

        const { data: allData, error: allError } = await query;

        if (allError) throw allError;

        // Get all entities that have regions
        const { data: entitiesWithRegions } = await supabase
          .from('language_entities_regions')
          .select('language_entity_id');

        const entityIdsWithRegions = new Set(
          entitiesWithRegions?.map(e => e.language_entity_id) || []
        );

        // Filter out entities that have regions
        const filteredData = (allData || []).filter(
          entity => !entityIdsWithRegions.has(entity.id)
        );

        // Apply pagination to filtered results
        const paginatedData = filteredData.slice(from, to + 1);

        const transformedData = paginatedData.map(item => ({
          ...item,
          region_count: 0, // By definition, these have no regions
          language_funding:
            Array.isArray(item.language_funding) &&
            item.language_funding.length > 0
              ? item.language_funding[0]
              : null,
        })) as LanguageEntityWithRegions[];

        return {
          data: transformedData,
          count: filteredData.length,
          page,
          pageSize,
          totalPages: Math.ceil(filteredData.length / pageSize),
        };
      } else {
        // Filter for languages in ANY selected region (OR logic - union)
        const unionIds = new Set<string>();

        for (const regionId of params.regionFilters) {
          const { data: entitiesInRegion } = await supabase
            .from('language_entities_regions')
            .select('language_entity_id')
            .eq('region_id', regionId);

          const entityIds =
            entitiesInRegion?.map(r => r.language_entity_id) || [];
          entityIds.forEach(id => unionIds.add(id));
        }

        if (unionIds.size > 0) {
          query = query.in('id', Array.from(unionIds));
        } else {
          return {
            data: [],
            count: 0,
            page,
            pageSize,
            totalPages: 0,
          };
        }
      }
    }

    query = query.order('name').range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    const transformedData = (data || []).map(item => ({
      ...item,
      region_count: Array.isArray(item.language_entities_regions)
        ? item.language_entities_regions.length
        : 0,
      language_funding:
        Array.isArray(item.language_funding) && item.language_funding.length > 0
          ? item.language_funding[0]
          : null,
    })) as LanguageEntityWithRegions[];

    return {
      data: transformedData,
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  /**
   * Fetch a single language entity with its regions
   */
  async fetchLanguageEntityById(
    id: string
  ): Promise<LanguageEntityWithRegions | null> {
    // Fetch entity first
    const { data: entityData, error: entityError } = await supabase
      .from('language_entities')
      .select(
        `
        *,
        language_funding(*)
      `
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (entityError) {
      if (entityError.code === 'PGRST116') return null;
      throw entityError;
    }

    // Fetch regions separately to avoid 406 errors
    const { data: regionLinks, error: regionError } = await supabase
      .from('language_entities_regions')
      .select('region_id, regions(*)')
      .eq('language_entity_id', id);

    if (regionError) {
      console.error('Error fetching regions:', regionError);
      // Don't throw, just return entity without regions
      return {
        ...entityData,
        regions: [],
        language_funding:
          Array.isArray(entityData.language_funding) &&
          entityData.language_funding.length > 0
            ? entityData.language_funding[0]
            : null,
      };
    }

    const regions = (regionLinks?.map(ler => ler.regions) as Region[]) || [];

    return {
      ...entityData,
      regions,
      language_funding:
        Array.isArray(entityData.language_funding) &&
        entityData.language_funding.length > 0
          ? entityData.language_funding[0]
          : null,
    };
  },

  /**
   * Update a language entity
   */
  async updateLanguageEntity(
    id: string,
    updates: Partial<LanguageEntity>
  ): Promise<void> {
    // Update the language entity
    const { error: updateError } = await supabase
      .from('language_entities')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;
  },

  /**
   * Update language entity regions
   * Uses service role to bypass RLS
   */
  async updateLanguageEntityRegions(
    languageEntityId: string,
    regionIds: string[]
  ): Promise<void> {
    // Fetch existing region IDs
    const { data: existingLinks } = await supabase
      .from('language_entities_regions')
      .select('region_id')
      .eq('language_entity_id', languageEntityId);

    const existingRegionIds = existingLinks?.map(l => l.region_id) || [];

    // Find regions to add and remove
    const toAdd = regionIds.filter(id => !existingRegionIds.includes(id));
    const toRemove = existingRegionIds.filter(id => !regionIds.includes(id));

    // Remove regions
    if (toRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('language_entities_regions')
        .delete()
        .eq('language_entity_id', languageEntityId)
        .in('region_id', toRemove);

      if (deleteError) {
        console.error('Error removing regions:', deleteError);
        throw new Error(
          'Failed to remove regions. You may not have permission.'
        );
      }
    }

    // Add regions
    if (toAdd.length > 0) {
      const { error: insertError } = await supabase
        .from('language_entities_regions')
        .insert(
          toAdd.map(regionId => ({
            language_entity_id: languageEntityId,
            region_id: regionId,
          }))
        );

      if (insertError) {
        console.error('Error adding regions:', insertError);
        throw new Error('Failed to add regions. You may not have permission.');
      }
    }
  },

  /**
   * Fetch all language entities (simple list for dropdowns)
   */
  async fetchLanguageEntitiesList(): Promise<LanguageEntity[]> {
    const { data, error } = await supabase
      .from('language_entities')
      .select('*')
      .is('deleted_at', null)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetch language hierarchy (parent and children)
   */
  async fetchLanguageHierarchy(
    entityId: string
  ): Promise<LanguageHierarchyNode[]> {
    const { data, error } = await supabase.rpc(
      'get_language_entity_hierarchy',
      {
        entity_id: entityId,
        generations_up: 3,
        generations_down: 3,
      }
    );

    if (error) throw error;
    return (data || []) as LanguageHierarchyNode[];
  },

  /**
   * Fetch language properties
   */
  async fetchLanguageProperties(entityId: string): Promise<LanguageProperty[]> {
    const { data, error } = await supabase
      .from('language_properties')
      .select('*')
      .eq('language_entity_id', entityId)
      .is('deleted_at', null)
      .order('key');

    if (error) throw error;
    return data || [];
  },

  /**
   * Update language properties (delete all and re-insert)
   */
  async updateLanguageProperties(
    entityId: string,
    properties: Array<{ key: string; value: string }>
  ): Promise<void> {
    // Delete existing properties
    const { error: deleteError } = await supabase
      .from('language_properties')
      .delete()
      .eq('language_entity_id', entityId);

    if (deleteError) throw deleteError;

    // Insert new properties if any
    if (properties.length > 0) {
      const { error: insertError } = await supabase
        .from('language_properties')
        .insert(
          properties.map(prop => ({
            language_entity_id: entityId,
            key: prop.key,
            value: prop.value,
          }))
        );

      if (insertError) throw insertError;
    }
  },

  /**
   * Fetch language aliases
   */
  async fetchLanguageAliases(entityId: string): Promise<LanguageAlias[]> {
    const { data, error } = await supabase
      .from('language_aliases')
      .select('*')
      .eq('language_entity_id', entityId)
      .is('deleted_at', null)
      .order('alias_name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Update language aliases (delete all and re-insert)
   */
  async updateLanguageAliases(
    entityId: string,
    aliases: Array<{ alias_name: string }>
  ): Promise<void> {
    // Delete existing aliases
    const { error: deleteError } = await supabase
      .from('language_aliases')
      .delete()
      .eq('language_entity_id', entityId);

    if (deleteError) throw deleteError;

    // Insert new aliases if any
    if (aliases.length > 0) {
      const { error: insertError } = await supabase
        .from('language_aliases')
        .insert(
          aliases.map(alias => ({
            language_entity_id: entityId,
            alias_name: alias.alias_name,
          }))
        );

      if (insertError) throw insertError;
    }
  },

  /**
   * Search for language entities
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
    ) as LanguageEntity[];
  },

  /**
   * Search for regions (used in modals)
   */
  async searchRegions(searchQuery: string): Promise<Region[]> {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return [];
    }

    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .ilike('name', `%${searchQuery}%`)
      .is('deleted_at', null)
      .order('name')
      .limit(20);

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetch language entity sources
   */
  async fetchLanguageEntitySources(entityId: string): Promise<
    Array<{
      id: string;
      language_entity_id: string;
      source: string;
      version: string | null;
      is_external: boolean;
      external_id: string | null;
      external_id_type: string | null;
      created_at: string | null;
      created_by: string | null;
      deleted_at: string | null;
    }>
  > {
    const { data, error } = await supabase
      .from('language_entity_sources')
      .select('*')
      .eq('language_entity_id', entityId)
      .is('deleted_at', null)
      .order('source');

    if (error) throw error;
    return data || [];
  },

  /**
   * Create language entity source
   */
  async createLanguageEntitySource(
    entityId: string,
    sourceData: {
      source: string;
      version?: string | null;
      is_external: boolean;
      external_id?: string | null;
      external_id_type?: string | null;
    }
  ): Promise<void> {
    const { error } = await supabase.from('language_entity_sources').insert({
      language_entity_id: entityId,
      ...sourceData,
    });

    if (error) throw error;
  },

  /**
   * Update language entity source
   */
  async updateLanguageEntitySource(
    sourceId: string,
    updates: {
      source?: string;
      version?: string | null;
      is_external?: boolean;
      external_id?: string | null;
      external_id_type?: string | null;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('language_entity_sources')
      .update(updates)
      .eq('id', sourceId);

    if (error) throw error;
  },

  /**
   * Delete language entity source
   */
  async deleteLanguageEntitySource(sourceId: string): Promise<void> {
    const { error } = await supabase
      .from('language_entity_sources')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', sourceId);

    if (error) throw error;
  },

  /**
   * Fetch language entity regions (with full junction table data)
   */
  async fetchLanguageEntityRegions(entityId: string): Promise<
    Array<{
      id: string;
      language_entity_id: string;
      region_id: string;
      dominance_level: number | null;
      location: unknown | null;
      location_source: string | null;
      created_at: string | null;
      updated_at: string | null;
      deleted_at: string | null;
      region: Region;
    }>
  > {
    const { data, error } = await supabase
      .from('language_entities_regions')
      .select('*, regions(*)')
      .eq('language_entity_id', entityId)
      .is('deleted_at', null);

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      region: item.regions as Region,
    }));
  },

  /**
   * Create language entity region link
   */
  async createLanguageEntityRegion(
    entityId: string,
    regionId: string,
    data?: {
      dominance_level?: number | null;
      location?: unknown | null;
      location_source?: string | null;
    }
  ): Promise<void> {
    const { error } = await supabase.from('language_entities_regions').insert({
      language_entity_id: entityId,
      region_id: regionId,
      ...data,
    });

    if (error) throw error;
  },

  /**
   * Update language entity region link
   */
  async updateLanguageEntityRegion(
    linkId: string,
    updates: {
      dominance_level?: number | null;
      location?: unknown | null;
      location_source?: string | null;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('language_entities_regions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', linkId);

    if (error) throw error;
  },

  /**
   * Delete language entity region link
   */
  async deleteLanguageEntityRegion(linkId: string): Promise<void> {
    const { error } = await supabase
      .from('language_entities_regions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', linkId);

    if (error) throw error;
  },

  /**
   * Create a new language entity with all related data
   */
  async createLanguageEntity(data: {
    name: string;
    level: 'family' | 'language' | 'dialect' | 'mother_tongue';
    parent_id?: string | null;
    sources?: Array<{
      source: string;
      version?: string | null;
      is_external: boolean;
      external_id?: string | null;
      external_id_type?: string | null;
    }>;
    aliases?: Array<{ alias_name: string }>;
    properties?: Array<{ key: string; value: string }>;
    regions?: Array<{
      region_id: string;
      dominance_level?: number | null;
      location?: { lat: number; lng: number } | null;
      location_source?: string | null;
    }>;
  }): Promise<LanguageEntity> {
    // Create the main language entity
    const { data: entity, error: entityError } = await supabase
      .from('language_entities')
      .insert({
        name: data.name,
        level: data.level,
        parent_id: data.parent_id || null,
      })
      .select()
      .single();

    if (entityError) throw entityError;
    if (!entity) throw new Error('Failed to create language entity');

    const entityId = entity.id;

    // Create sources
    if (data.sources && data.sources.length > 0) {
      const sourcesToInsert = data.sources
        .filter(s => s.source.trim())
        .map(source => ({
          language_entity_id: entityId,
          source: source.source.trim(),
          version: source.version?.trim() || null,
          is_external: source.is_external,
          external_id: source.is_external
            ? source.external_id?.trim() || null
            : null,
          external_id_type: source.is_external
            ? source.external_id_type?.trim() || null
            : null,
        }));

      if (sourcesToInsert.length > 0) {
        const { error: sourcesError } = await supabase
          .from('language_entity_sources')
          .insert(sourcesToInsert);

        if (sourcesError) {
          console.error('Error creating sources:', sourcesError);
          throw new Error(
            `Failed to create language sources: ${sourcesError.message}`
          );
        }
      }
    }

    // Create aliases
    if (data.aliases && data.aliases.length > 0) {
      const aliasesToInsert = data.aliases
        .filter(a => a.alias_name.trim())
        .map(alias => ({
          language_entity_id: entityId,
          alias_name: alias.alias_name.trim(),
        }));

      if (aliasesToInsert.length > 0) {
        const { error: aliasesError } = await supabase
          .from('language_aliases')
          .insert(aliasesToInsert);

        if (aliasesError) {
          console.error('Error creating aliases:', aliasesError);
          throw new Error(
            `Failed to create language aliases: ${aliasesError.message}`
          );
        }
      }
    }

    // Create properties
    if (data.properties && data.properties.length > 0) {
      const propertiesToInsert = data.properties
        .filter(p => p.key.trim() && p.value.trim())
        .map(property => ({
          language_entity_id: entityId,
          key: property.key.trim(),
          value: property.value.trim(),
        }));

      if (propertiesToInsert.length > 0) {
        const { error: propertiesError } = await supabase
          .from('language_properties')
          .insert(propertiesToInsert);

        if (propertiesError) {
          console.error('Error creating properties:', propertiesError);
          throw new Error(
            `Failed to create language properties: ${propertiesError.message}`
          );
        }
      }
    }

    // Create region links
    if (data.regions && data.regions.length > 0) {
      const regionsToInsert = data.regions.map(region => ({
        language_entity_id: entityId,
        region_id: region.region_id,
        dominance_level: region.dominance_level ?? null,
        location: region.location ? locationToPostGIS(region.location) : null,
        location_source: region.location_source?.trim() || null,
      }));

      const { error: regionsError } = await supabase
        .from('language_entities_regions')
        .insert(regionsToInsert);

      if (regionsError) {
        console.error('Error creating region links:', regionsError);
        throw new Error(
          `Failed to create language region links: ${regionsError.message}`
        );
      }
    }

    return entity;
  },
};
