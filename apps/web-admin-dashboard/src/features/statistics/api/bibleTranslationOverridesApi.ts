import { supabase } from '@/shared/services/supabase';
import type { Database } from '@everylanguage/shared-types';
import type { LanguageEntity } from '@/types';

type BibleTranslationOverrideRow =
  Database['public']['Tables']['bible_translation_overrides']['Row'];
type BibleTranslationOverrideInsert =
  Database['public']['Tables']['bible_translation_overrides']['Insert'];
type BibleTranslationOverrideUpdate =
  Database['public']['Tables']['bible_translation_overrides']['Update'];

export interface BibleTranslationOverrideWithLanguage
  extends BibleTranslationOverrideRow {
  language_entity?: LanguageEntity | null;
}

interface FetchBibleTranslationOverridesParams {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  languageFilters?: string[];
}

export const bibleTranslationOverridesApi = {
  /**
   * Fetch bible translation overrides with pagination, search, and language filter
   */
  async fetchBibleTranslationOverrides(
    params?: FetchBibleTranslationOverridesParams
  ): Promise<{
    data: BibleTranslationOverrideWithLanguage[];
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
      .from('bible_translation_overrides')
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
      // Search in version_name, source, and language name
      query = query.or(
        `version_name.ilike.%${searchTerm}%,source.ilike.%${searchTerm}%`
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
    })) as BibleTranslationOverrideWithLanguage[];

    return {
      data: transformedData,
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  /**
   * Fetch a single bible translation override by ID
   */
  async fetchBibleTranslationOverrideById(
    id: string
  ): Promise<BibleTranslationOverrideWithLanguage | null> {
    const { data, error } = await supabase
      .from('bible_translation_overrides')
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
    } as BibleTranslationOverrideWithLanguage;
  },

  /**
   * Create a new bible translation override
   */
  async createBibleTranslationOverride(
    data: Omit<
      BibleTranslationOverrideInsert,
      'id' | 'created_at' | 'updated_at' | 'created_by' | 'deleted_at'
    >
  ): Promise<BibleTranslationOverrideWithLanguage> {
    const { data: result, error } = await supabase
      .from('bible_translation_overrides')
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
    } as BibleTranslationOverrideWithLanguage;
  },

  /**
   * Update a bible translation override
   */
  async updateBibleTranslationOverride(
    id: string,
    updates: BibleTranslationOverrideUpdate
  ): Promise<void> {
    const { error } = await supabase
      .from('bible_translation_overrides')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Soft delete a bible translation override
   */
  async deleteBibleTranslationOverride(id: string): Promise<void> {
    const { error } = await supabase
      .from('bible_translation_overrides')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },
};
