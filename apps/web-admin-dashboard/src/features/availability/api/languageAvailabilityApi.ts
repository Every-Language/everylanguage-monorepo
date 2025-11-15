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

    // Apply search if provided
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      query = query.ilike(
        'language_entities.name',
        `%${params.searchQuery.trim()}%`
      );
    }

    const { data, error, count: totalCount } = await query;

    if (error) throw error;

    // Sort by language name in JavaScript
    const sortedData = (data || []).sort((a: any, b: any) => {
      const nameA = a.language_entities?.name || '';
      const nameB = b.language_entities?.name || '';
      return nameA.localeCompare(nameB);
    });

    const totalPages = Math.ceil((totalCount || sortedData.length) / pageSize);
    const paginatedData = sortedData.slice(from, to + 1);

    // Transform data to match LanguageEntityWithRegions
    const transformedData: LanguageEntityWithRegions[] = paginatedData.map(
      (item: any) => ({
        ...item.language_entities,
        language_funding: {
          id: item.id,
          language_entity_id: item.language_entity_id,
          funding_status: item.funding_status,
          budget_cents: item.budget_cents,
          created_at: item.created_at,
          updated_at: item.updated_at,
          created_by: item.created_by,
          deleted_at: item.deleted_at,
        },
      })
    );

    return {
      data: transformedData,
      count: totalCount || sortedData.length,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Fetch languages with funding_status 'draft' or no funding record
   */
  async fetchDraftLanguages(params?: {
    searchQuery?: string;
    page?: number;
    pageSize?: number;
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

    // Get languages that either have no funding record or have draft status
    // We'll filter in JavaScript after fetching
    let query = supabase
      .from('language_entities')
      .select(
        `
        *,
        language_funding(*)
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .order('name');

    // Apply search if provided
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      // Use search function for better results
      try {
        const { data: searchResults, error: searchError } = await supabase.rpc(
          'search_language_aliases',
          {
            search_query: params.searchQuery,
            max_results: 1000,
            min_similarity: 0.1,
            include_regions: false,
          }
        );

        if (searchError) {
          console.error('Search RPC error:', searchError);
          // Fallback to simple ilike search
          query = query.ilike('name', `%${params.searchQuery.trim()}%`);
        } else {
          // Filter search results
          const entityIds = new Set(
            (searchResults || [])
              .map((r: { entity_id: string }) => r.entity_id)
              .filter(Boolean)
          );

          if (entityIds.size > 0) {
            query = query.in('id', Array.from(entityIds));
          } else {
            // No matches, return empty
            return {
              data: [],
              count: 0,
              page,
              pageSize,
              totalPages: 0,
            };
          }
        }
      } catch (err) {
        // Fallback to simple ilike search
        query = query.ilike('name', `%${params.searchQuery.trim()}%`);
      }
    }

    const { data, error } = await query.range(from, to);

    if (error) throw error;

    // Filter for languages with no funding record OR draft status
    const filteredData = (data || []).filter((item: any) => {
      const funding =
        item.language_funding && item.language_funding.length > 0
          ? item.language_funding[0]
          : null;
      return !funding || funding.funding_status === 'draft';
    });

    const totalCount = filteredData.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const paginatedData = filteredData.slice(from, to + 1);

    // Transform data
    const transformedData: LanguageEntityWithRegions[] = paginatedData.map(
      (item: any) => ({
        ...item,
        language_funding:
          item.language_funding && item.language_funding.length > 0
            ? item.language_funding[0]
            : null,
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
