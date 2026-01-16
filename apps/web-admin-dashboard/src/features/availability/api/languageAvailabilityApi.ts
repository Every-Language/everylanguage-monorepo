import { supabase } from '@/shared/services/supabase';
import type {
  LanguageEntityWithRegions,
  LanguageFundingStatus,
  Region,
} from '@/types';

export const languageAvailabilityApi = {
  /**
   * Fetch all languages from language_funding table
   */
  async fetchAvailableLanguages(params?: {
    searchQuery?: string;
    page?: number;
    pageSize?: number;
    statusFilter?: LanguageFundingStatus;
    sortField?: 'name' | 'budget' | 'priority';
    sortDirection?: 'asc' | 'desc';
    externalIdSearch?: string; // Search by external_id in language_entity_sources
    regionFilters?: string[]; // Array of region IDs to filter by (OR logic)
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
    const sortField = params?.sortField ?? 'name';
    const sortDirection = params?.sortDirection ?? 'asc';
    const sortAscending = sortDirection === 'asc';

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

    // Fetch all language_funding records (no status filter)
    let query = supabase
      .from('language_funding')
      .select(
        `
        *,
        language_entities!inner(*)
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .is('language_entities.deleted_at', null);

    // Apply region filters if provided
    let entityIdsFromRegions: string[] | undefined;
    if (params?.regionFilters && params.regionFilters.length > 0) {
      if (params.regionFilters.includes('none')) {
        // Filter for languages with NO regions
        // Get all language_entity_ids that have regions
        // If "none" is the only filter, we'll filter in JS after fetching
        // Otherwise, we need to combine with other region filters
        if (params.regionFilters.length === 1) {
          // Only "none" filter - we'll handle this after fetching all data
          entityIdsFromRegions = [];
        } else {
          // "none" plus other regions - get languages with selected regions
          const otherRegionIds = params.regionFilters.filter(
            id => id !== 'none'
          );
          const { data: regionsData } = await supabase
            .from('language_entities_regions')
            .select('language_entity_id')
            .in('region_id', otherRegionIds)
            .is('deleted_at', null);

          const languageIdsWithSelectedRegions = new Set(
            regionsData?.map(r => r.language_entity_id) || []
          );

          // Languages with selected regions OR languages with no regions
          // We'll handle this after fetching
          entityIdsFromRegions = Array.from(languageIdsWithSelectedRegions);
        }
      } else {
        // Filter for languages with ANY of the selected regions (OR logic)
        const { data: regionsData, error: regionsError } = await supabase
          .from('language_entities_regions')
          .select('language_entity_id')
          .in('region_id', params.regionFilters)
          .is('deleted_at', null);

        if (regionsError) {
          console.error('Error fetching languages by regions:', regionsError);
          throw regionsError;
        }

        entityIdsFromRegions = [
          ...new Set(regionsData?.map(r => r.language_entity_id) || []),
        ];

        // If no matches, return empty result
        if (entityIdsFromRegions.length === 0) {
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

    // Apply external_id filter
    if (entityIdsFromExternalId && entityIdsFromExternalId.length > 0) {
      query = query.in('language_entity_id', entityIdsFromExternalId);
    }

    // Apply region filter
    if (entityIdsFromRegions !== undefined) {
      if (entityIdsFromRegions.length === 0) {
        // This means "none" filter only - we'll handle after fetching
        // For now, fetch all and filter in JS
      } else {
        query = query.in('language_entity_id', entityIdsFromRegions);
      }
    }

    // Apply search if provided
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      query = query.ilike(
        'language_entities.name',
        `%${params.searchQuery.trim()}%`
      );
    }

    if (params?.statusFilter) {
      query = query.eq('funding_status', params.statusFilter);
    }

    switch (sortField) {
      case 'budget':
        query = query.order('budget_cents', {
          ascending: sortAscending,
          nullsFirst: sortAscending,
        });
        break;
      case 'priority':
        query = query.order('priority', {
          ascending: sortAscending,
          nullsFirst: !sortAscending,
        });
        break;
      case 'name':
      default:
        query = query.order('name', {
          ascending: sortAscending,
          referencedTable: 'language_entities',
        });
        break;
    }

    const { data, error, count: totalCount } = await query.range(from, to);

    if (error) throw error;

    // Transform data to match LanguageEntityWithRegions
    let transformedData: LanguageEntityWithRegions[] = (data || []).map(
      (item: {
        id: string;
        language_entity_id: string;
        funding_status: string;
        budget_cents: number | null;
        priority: number | null;
        created_at: string;
        updated_at: string;
        created_by: string | null;
        deleted_at: string | null;
        language_entities: LanguageEntityWithRegions;
      }) => ({
        ...item.language_entities,
        language_funding: {
          id: item.id,
          language_entity_id: item.language_entity_id,
          funding_status: item.funding_status as LanguageFundingStatus,
          budget_cents: item.budget_cents,
          priority: item.priority ?? null,
          created_at: item.created_at,
          updated_at: item.updated_at,
          created_by: item.created_by,
          deleted_at: item.deleted_at,
        },
      })
    );

    // Apply "none" region filter if needed (filter languages with no regions)
    if (
      params?.regionFilters &&
      params.regionFilters.includes('none') &&
      (!entityIdsFromRegions || entityIdsFromRegions.length === 0)
    ) {
      // Get all language_entity_ids that have regions
      const { data: languagesWithRegions } = await supabase
        .from('language_entities_regions')
        .select('language_entity_id')
        .is('deleted_at', null);

      const languageIdsWithRegions = new Set(
        languagesWithRegions?.map(r => r.language_entity_id) || []
      );

      // Filter out languages that have regions
      transformedData = transformedData.filter(
        lang => !languageIdsWithRegions.has(lang.id)
      );
    } else if (
      params?.regionFilters &&
      params.regionFilters.includes('none') &&
      params.regionFilters.length > 1
    ) {
      // "none" plus other regions - include languages with no regions OR with selected regions
      const { data: languagesWithRegions } = await supabase
        .from('language_entities_regions')
        .select('language_entity_id')
        .is('deleted_at', null);

      const languageIdsWithRegions = new Set(
        languagesWithRegions?.map(r => r.language_entity_id) || []
      );

      // Keep languages that either have no regions OR are in the selected regions list
      transformedData = transformedData.filter(
        lang =>
          !languageIdsWithRegions.has(lang.id) ||
          entityIdsFromRegions?.includes(lang.id)
      );
    }

    // Fetch regions and population data for all languages in parallel
    const enrichedData = await Promise.all(
      transformedData.map(async language => {
        // Fetch regions for this language
        const { data: regionsData, error: regionsError } = await supabase
          .from('language_entities_regions')
          .select('regions(*)')
          .eq('language_entity_id', language.id)
          .is('deleted_at', null);

        if (regionsError) {
          console.error(
            `Error fetching regions for language ${language.id}:`,
            regionsError
          );
        }

        const regions: Region[] =
          regionsData
            ?.map(item => item.regions as Region)
            .filter((r): r is Region => r !== null && r.deleted_at === null) ||
          [];

        // Fetch population from language_stats
        // Note: Using type assertion because types haven't been regenerated after migration rename
        // TODO: Regenerate types after migration 20251226000090_rename_stats_materialized_views.sql
        type LanguageStatsRow = { population?: number };
        const { data: statsDataRaw, error: statsError } = await (
          supabase as unknown as {
            from: (table: string) => {
              select: (columns: string) => {
                eq: (
                  column: string,
                  value: string
                ) => {
                  maybeSingle: () => Promise<{
                    data: LanguageStatsRow | null;
                    error: unknown;
                  }>;
                };
              };
            };
          }
        )
          .from('language_stats')
          .select('population')
          .eq('language_entity_id', language.id)
          .maybeSingle();

        if (statsError) {
          console.error(
            `Error fetching population for language ${language.id}:`,
            statsError
          );
        }

        const statsData = statsDataRaw as LanguageStatsRow | null;
        const population: number | null =
          statsData?.population !== undefined ? statsData.population : null;

        return {
          ...language,
          regions,
          population,
        };
      })
    );

    // Adjust count if we filtered in JS
    let finalCount = totalCount || 0;
    if (
      params?.regionFilters &&
      params.regionFilters.includes('none') &&
      (!entityIdsFromRegions || entityIdsFromRegions.length === 0)
    ) {
      // We filtered in JS, so count is the filtered array length
      finalCount = enrichedData.length;
    } else if (
      params?.regionFilters &&
      params.regionFilters.includes('none') &&
      params.regionFilters.length > 1
    ) {
      // We filtered in JS, so count is the filtered array length
      finalCount = enrichedData.length;
    }

    const totalPages = finalCount ? Math.ceil(finalCount / pageSize) : 1;

    return {
      data: enrichedData,
      count: finalCount,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Fetch all languages that have no funding record (language_funding IS NULL)
   * Used for the "Add Language" modal to show languages available to add to funding
   */
  async fetchAllLanguages(params?: {
    searchQuery?: string;
    page?: number;
    pageSize?: number;
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

    // If there's a search query, use the search function (same as languagesApi.fetchLanguageEntities)
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      try {
        const { data: searchResults, error: searchError } = await supabase.rpc(
          'search_language_aliases',
          {
            search_query: params.searchQuery,
            max_results: 100,
            min_similarity: 0.1,
            include_regions: false,
          }
        );

        if (searchError) {
          console.error('Search RPC error:', searchError);
          throw searchError;
        }

        // Get entity IDs from search results
        const searchEntityIds = new Set(
          (searchResults || [])
            .map((r: { entity_id: string }) => r.entity_id)
            .filter(Boolean)
        );

        if (searchEntityIds.size === 0) {
          return {
            data: [],
            count: 0,
            page,
            pageSize,
            totalPages: 0,
          };
        }

        // Combine with external_id filter if provided
        let finalEntityIds = Array.from(searchEntityIds);
        if (entityIdsFromExternalId && entityIdsFromExternalId.length > 0) {
          finalEntityIds = finalEntityIds.filter(id =>
            entityIdsFromExternalId!.includes(id)
          );
        }

        if (finalEntityIds.length === 0) {
          return {
            data: [],
            count: 0,
            page,
            pageSize,
            totalPages: 0,
          };
        }

        // Get all language_entity_ids that have funding records (to exclude them)
        const { data: fundedEntityIds } = await supabase
          .from('language_funding')
          .select('language_entity_id')
          .is('deleted_at', null);

        const fundedIdsSet = new Set(
          fundedEntityIds?.map(f => f.language_entity_id) || []
        );

        // Filter out languages that have funding records
        const unfundedEntityIds = finalEntityIds.filter(
          id => !fundedIdsSet.has(id)
        );

        if (unfundedEntityIds.length === 0) {
          return {
            data: [],
            count: 0,
            page,
            pageSize,
            totalPages: 0,
          };
        }

        // Fetch languages with no funding record, filtered by search results
        const query = supabase
          .from('language_entities')
          .select('*', { count: 'exact' })
          .in('id', unfundedEntityIds)
          .is('deleted_at', null)
          .order('name')
          .range(from, to);

        const { data, error, count: totalCount } = await query;

        if (error) throw error;

        // Transform data
        const transformedData: LanguageEntityWithRegions[] = (data || []).map(
          (item: {
            id: string;
            name: string;
            level: string;
            parent_id: string | null;
            created_at: string | null;
            updated_at: string | null;
            deleted_at: string | null;
            language_funding?: {
              id: string;
              language_entity_id: string;
              funding_status: string;
              budget_cents: number | null;
              created_at: string;
              updated_at: string;
              created_by: string | null;
              deleted_at: string | null;
            } | null;
          }) => ({
            id: item.id,
            name: item.name,
            level: item.level as LanguageEntityWithRegions['level'],
            parent_id: item.parent_id,
            created_at: item.created_at,
            updated_at: item.updated_at,
            deleted_at: item.deleted_at,
            language_funding: null, // Always null since we filtered for no funding
          })
        );

        // Fetch regions for all languages in parallel
        const enrichedData = await Promise.all(
          transformedData.map(async language => {
            // Fetch regions for this language
            const { data: regionsData, error: regionsError } = await supabase
              .from('language_entities_regions')
              .select('regions(*)')
              .eq('language_entity_id', language.id)
              .is('deleted_at', null);

            if (regionsError) {
              console.error(
                `Error fetching regions for language ${language.id}:`,
                regionsError
              );
            }

            const regions: Region[] =
              regionsData
                ?.map(item => item.regions as Region)
                .filter(
                  (r): r is Region => r !== null && r.deleted_at === null
                ) || [];

            return {
              ...language,
              regions,
            };
          })
        );

        const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1;

        return {
          data: enrichedData,
          count: totalCount || 0,
          page,
          pageSize,
          totalPages,
        };
      } catch (error) {
        console.error('Search error:', error);
        throw error;
      }
    }

    // Otherwise, fetch with pagination and filters (no search query)
    // First, get all language_entity_ids that have funding records (to exclude them)
    const { data: fundedEntityIds } = await supabase
      .from('language_funding')
      .select('language_entity_id')
      .is('deleted_at', null);

    const fundedIdsSet = new Set(
      fundedEntityIds?.map(f => f.language_entity_id) || []
    );

    // Build base query
    let query = supabase
      .from('language_entities')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('name');

    // Apply external_id filter
    if (entityIdsFromExternalId && entityIdsFromExternalId.length > 0) {
      query = query.in('id', entityIdsFromExternalId);
    }

    const { data: allData, error: allError } = await query;

    if (allError) throw allError;

    // Filter out languages that have funding records
    const unfundedData = (allData || []).filter(
      entity => !fundedIdsSet.has(entity.id)
    );

    // Apply pagination after filtering
    const totalCount = unfundedData.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const paginatedData = unfundedData.slice(from, to + 1);

    // Transform data
    const transformedData: LanguageEntityWithRegions[] = paginatedData.map(
      (item: {
        id: string;
        name: string;
        level: string;
        parent_id: string | null;
        created_at: string | null;
        updated_at: string | null;
        deleted_at: string | null;
        language_funding?: {
          id: string;
          language_entity_id: string;
          funding_status: string;
          budget_cents: number | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          deleted_at: string | null;
        } | null;
      }) => ({
        id: item.id,
        name: item.name,
        level: item.level as LanguageEntityWithRegions['level'],
        parent_id: item.parent_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        deleted_at: item.deleted_at,
        language_funding: null, // Always null since we filtered for no funding
      })
    );

    // Fetch regions for all languages in parallel
    const enrichedData = await Promise.all(
      transformedData.map(async language => {
        // Fetch regions for this language
        const { data: regionsData, error: regionsError } = await supabase
          .from('language_entities_regions')
          .select('regions(*)')
          .eq('language_entity_id', language.id)
          .is('deleted_at', null);

        if (regionsError) {
          console.error(
            `Error fetching regions for language ${language.id}:`,
            regionsError
          );
        }

        const regions: Region[] =
          regionsData
            ?.map(item => item.regions as Region)
            .filter((r): r is Region => r !== null && r.deleted_at === null) ||
          [];

        return {
          ...language,
          regions,
        };
      })
    );

    return {
      data: enrichedData,
      count: totalCount,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Update language funding status
   */
  async updateLanguageFundingStatus(
    languageId: string,
    status: LanguageFundingStatus
  ): Promise<void> {
    // Check if funding record exists
    const { data: existing, error: checkError } = await supabase
      .from('language_funding')
      .select('id')
      .eq('language_entity_id', languageId)
      .is('deleted_at', null)
      .maybeSingle();

    // If error and it's not a "not found" error, throw it
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing funding record:', checkError);
      throw checkError;
    }

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('language_funding')
        .update({ funding_status: status })
        .eq('language_entity_id', languageId)
        .is('deleted_at', null);

      if (error) {
        console.error('Error updating funding status:', error);
        throw error;
      }
    } else {
      // Create new record
      const { error } = await supabase.from('language_funding').insert({
        language_entity_id: languageId,
        funding_status: status,
        budget_cents: null,
      });

      if (error) {
        console.error('Error creating funding record:', error);
        throw error;
      }
    }
  },

  /**
   * Set language status to 'draft' (creates language_funding row if it doesn't exist)
   */
  async setLanguageAvailable(languageId: string): Promise<void> {
    console.log('setLanguageAvailable called with languageId:', languageId);

    // Check if funding record already exists
    const { data: existing, error: checkError } = await supabase
      .from('language_funding')
      .select('id')
      .eq('language_entity_id', languageId)
      .is('deleted_at', null)
      .maybeSingle();

    // If error and it's not a "not found" error, throw it
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing funding record:', checkError);
      throw checkError;
    }

    console.log('Existing record:', existing);

    if (existing) {
      // Record already exists, update it to draft
      console.log('Updating existing record to draft');
      const { error } = await supabase
        .from('language_funding')
        .update({ funding_status: 'draft' })
        .eq('language_entity_id', languageId)
        .is('deleted_at', null);

      if (error) {
        console.error('Error updating funding status:', error);
        throw error;
      }
      console.log('Successfully updated existing record');
    } else {
      // Create new record
      console.log('Creating new funding record');
      const insertData = {
        language_entity_id: languageId,
        funding_status: 'draft' as const,
        budget_cents: null,
      };
      console.log('Insert data:', insertData);

      const { data: insertedData, error } = await supabase
        .from('language_funding')
        .insert(insertData)
        .select();

      if (error) {
        console.error('Error creating funding record:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      console.log('Successfully created new record:', insertedData);
    }
  },

  /**
   * Update language budget (and set status to 'available' if currently 'draft')
   */
  async updateLanguageBudget(
    languageId: string,
    budgetCents: number | null
  ): Promise<void> {
    // Check if funding record exists
    const { data: existing } = await supabase
      .from('language_funding')
      .select('id, funding_status')
      .eq('language_entity_id', languageId)
      .is('deleted_at', null)
      .single();

    const updateData: {
      budget_cents: number | null;
      funding_status?: LanguageFundingStatus;
    } = {
      budget_cents: budgetCents,
    };

    // If status is draft and budget is being set, change to available
    if (
      existing &&
      existing.funding_status === 'draft' &&
      budgetCents !== null
    ) {
      updateData.funding_status = 'available';
    }

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('language_funding')
        .update(updateData)
        .eq('language_entity_id', languageId)
        .is('deleted_at', null);

      if (error) throw error;
    } else {
      // Create new record
      const { error } = await supabase.from('language_funding').insert({
        language_entity_id: languageId,
        funding_status: budgetCents !== null ? 'available' : 'draft',
        budget_cents: budgetCents,
      });

      if (error) throw error;
    }
  },

  /**
   * Update language funding priority (creates record if it doesn't exist)
   */
  async updateLanguagePriority(
    languageId: string,
    priority: number | null
  ): Promise<void> {
    const { data: existing } = await supabase
      .from('language_funding')
      .select('id')
      .eq('language_entity_id', languageId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('language_funding')
        .update({ priority })
        .eq('language_entity_id', languageId)
        .is('deleted_at', null);

      if (error) throw error;
    } else {
      const { error } = await supabase.from('language_funding').insert({
        language_entity_id: languageId,
        funding_status: 'draft',
        budget_cents: null,
        priority,
      });

      if (error) throw error;
    }
  },

  /**
   * Delete language funding record (soft delete)
   */
  async deleteLanguageFunding(languageId: string): Promise<void> {
    const { error } = await supabase
      .from('language_funding')
      .update({ deleted_at: new Date().toISOString() })
      .eq('language_entity_id', languageId)
      .is('deleted_at', null);

    if (error) {
      console.error('Error deleting language funding:', error);
      throw error;
    }
  },
};
