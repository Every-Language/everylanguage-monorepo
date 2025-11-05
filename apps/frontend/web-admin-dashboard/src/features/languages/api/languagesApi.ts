import { supabase } from '@/shared/services/supabase';
import type {
  LanguageEntity,
  LanguageEntityWithRegions,
  LanguageProperty,
  LanguageAlias,
  LanguageHierarchyNode,
  Region,
} from '@/types';

export const languagesApi = {
  /**
   * Fetch language entities with pagination and region counts
   */
  async fetchLanguageEntities(params?: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
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
        const results: LanguageEntityWithRegions[] = (searchResults || []).map(
          (result: {
            entity_id: string;
            entity_name: string;
            entity_level: string;
            entity_parent_id: string | null;
            alias_name: string;
            alias_similarity_score: number;
            region_count?: number;
          }) => ({
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
          })
        );

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

    // Otherwise, fetch with pagination
    const query = supabase
      .from('language_entities')
      .select(
        `
        *,
        language_entities_regions(count)
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .order('name')
      .range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    const transformedData = (data || []).map(item => ({
      ...item,
      region_count: item.language_entities_regions?.[0]?.count || 0,
    }));

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
      .select('*')
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
      };
    }

    const regions = (regionLinks?.map(ler => ler.regions) as Region[]) || [];

    return {
      ...entityData,
      regions,
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
   * Fetch regions with search
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
};
