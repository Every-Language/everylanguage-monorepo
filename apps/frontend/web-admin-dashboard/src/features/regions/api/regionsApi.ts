import { supabase } from '@/shared/services/supabase';
import type { Region, RegionWithLanguages } from '@/types';

export const regionsApi = {
  /**
   * Fetch all regions with their language entity counts
   */
  async fetchRegions(): Promise<RegionWithLanguages[]> {
    const { data, error } = await supabase
      .from('regions')
      .select(
        `
        *,
        language_entities_regions(count)
      `
      )
      .is('deleted_at', null)
      .order('name');

    if (error) throw error;

    return (data || []).map(item => ({
      ...item,
      language_count: item.language_entities_regions?.[0]?.count || 0,
    }));
  },

  /**
   * Fetch a single region with its language entities
   */
  async fetchRegionById(id: string): Promise<RegionWithLanguages | null> {
    const { data, error } = await supabase
      .from('regions')
      .select(
        `
        *,
        language_entities_regions!inner(
          language_entity_id,
          language_entities(*)
        )
      `
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    // Extract language entities from the nested structure
    const language_entities =
      data.language_entities_regions?.map(
        (ler: any) => ler.language_entities
      ) || [];

    return {
      ...data,
      language_entities,
    } as RegionWithLanguages;
  },

  /**
   * Update a region
   */
  async updateRegion(id: string, updates: Partial<Region>): Promise<void> {
    // Update the region
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
    // Delete existing relationships
    const { error: deleteError } = await supabase
      .from('language_entities_regions')
      .delete()
      .eq('region_id', regionId);

    if (deleteError) throw deleteError;

    // Insert new relationships if any
    if (languageEntityIds.length > 0) {
      const { error: insertError } = await supabase
        .from('language_entities_regions')
        .insert(
          languageEntityIds.map(languageEntityId => ({
            language_entity_id: languageEntityId,
            region_id: regionId,
          }))
        );

      if (insertError) throw insertError;
    }
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
