import { supabase } from '@/shared/services/supabase';
import type { Database } from '@everylanguage/shared-types';
import type { LanguageEntity } from '@/types';

type ExternalProjectOverrideRow =
  Database['public']['Tables']['external_projects_overrides']['Row'];
type ExternalProjectOverrideInsert =
  Database['public']['Tables']['external_projects_overrides']['Insert'];
type ExternalProjectOverrideUpdate =
  Database['public']['Tables']['external_projects_overrides']['Update'];

export interface ExternalProjectOverrideWithLanguage
  extends ExternalProjectOverrideRow {
  language_entity?: LanguageEntity | null;
}

interface FetchExternalProjectsOverridesParams {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  languageFilters?: string[];
}

export const externalProjectsOverridesApi = {
  /**
   * Fetch external projects overrides with pagination, search, and language filter
   */
  async fetchExternalProjectsOverrides(
    params?: FetchExternalProjectsOverridesParams
  ): Promise<{
    data: ExternalProjectOverrideWithLanguage[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('external_projects_overrides')
      .select(
        `
        *,
        language_entity:language_entities(*)
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    // Apply language filters
    if (params?.languageFilters && params.languageFilters.length > 0) {
      query = query.in('language_entity_id', params.languageFilters);
    }

    // Apply search query
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      const searchTerm = params.searchQuery.trim();
      // Search in project_name, partner_organization, and language name
      query = query.or(
        `project_name.ilike.%${searchTerm}%,partner_organization.ilike.%${searchTerm}%`
      );
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    const transformedData = (data || []).map(item => ({
      ...item,
      language_entity: Array.isArray(item.language_entity)
        ? item.language_entity[0]
        : item.language_entity || null,
    })) as ExternalProjectOverrideWithLanguage[];

    return {
      data: transformedData,
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  /**
   * Fetch a single external project override by ID
   */
  async fetchExternalProjectOverrideById(
    id: string
  ): Promise<ExternalProjectOverrideWithLanguage | null> {
    const { data, error } = await supabase
      .from('external_projects_overrides')
      .select(
        `
        *,
        language_entity:language_entities(*)
      `
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      ...data,
      language_entity: Array.isArray(data.language_entity)
        ? data.language_entity[0]
        : data.language_entity || null,
    } as ExternalProjectOverrideWithLanguage;
  },

  /**
   * Create a new external project override
   */
  async createExternalProjectOverride(
    data: Omit<
      ExternalProjectOverrideInsert,
      'id' | 'created_at' | 'updated_at' | 'created_by' | 'deleted_at'
    >
  ): Promise<ExternalProjectOverrideWithLanguage> {
    const { data: result, error } = await supabase
      .from('external_projects_overrides')
      .insert({
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(
        `
        *,
        language_entity:language_entities(*)
      `
      )
      .single();

    if (error) throw error;

    return {
      ...result,
      language_entity: Array.isArray(result.language_entity)
        ? result.language_entity[0]
        : result.language_entity || null,
    } as ExternalProjectOverrideWithLanguage;
  },

  /**
   * Update an external project override
   */
  async updateExternalProjectOverride(
    id: string,
    updates: ExternalProjectOverrideUpdate
  ): Promise<void> {
    const { error } = await supabase
      .from('external_projects_overrides')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Soft delete an external project override
   */
  async deleteExternalProjectOverride(id: string): Promise<void> {
    const { error } = await supabase
      .from('external_projects_overrides')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },
};
