import { supabase } from '@/shared/services/supabase';
import type { LanguageEntityWithRegions, LanguageFundingStatus } from '@/types';

export const languageAvailabilityApi = {
  /**
   * Fetch all languages from language_funding table
   */
  async fetchAvailableLanguages(params?: {
    searchQuery?: string;
    page?: number;
    pageSize?: number;
    statusFilter?: LanguageFundingStatus;
    sortField?: 'name' | 'budget';
    sortDirection?: 'asc' | 'desc';
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

    // Apply external_id filter
    if (entityIdsFromExternalId && entityIdsFromExternalId.length > 0) {
      query = query.in('language_entity_id', entityIdsFromExternalId);
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
    const transformedData: LanguageEntityWithRegions[] = (data || []).map(
      (item: {
        id: string;
        language_entity_id: string;
        funding_status: string;
        budget_cents: number | null;
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
          created_at: item.created_at,
          updated_at: item.updated_at,
          created_by: item.created_by,
          deleted_at: item.deleted_at,
        },
      })
    );

    const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1;

    return {
      data: transformedData,
      count: totalCount || 0,
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
        let query = supabase
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

        const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1;

        return {
          data: transformedData,
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

    return {
      data: transformedData,
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
};
