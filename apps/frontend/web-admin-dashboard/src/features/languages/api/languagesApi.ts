import { supabase } from '@/shared/services/supabase';
import type {
  LanguageEntity,
  LanguageEntityWithRegions,
  LanguageEntityVersion,
} from '@/types';

export const languagesApi = {
  /**
   * Fetch all language entities with their region counts
   */
  async fetchLanguageEntities(): Promise<LanguageEntityWithRegions[]> {
    const { data, error } = await supabase
      .from('language_entities')
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
      region_count: item.language_entities_regions?.[0]?.count || 0,
    }));
  },

  /**
   * Fetch a single language entity with its regions
   */
  async fetchLanguageEntityById(
    id: string
  ): Promise<LanguageEntityWithRegions | null> {
    const { data, error } = await supabase
      .from('language_entities')
      .select(
        `
        *,
        language_entities_regions!inner(
          region_id,
          regions(*)
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

    // Extract regions from the nested structure
    const regions =
      data.language_entities_regions?.map(
        (ler: { regions: unknown }) => ler.regions
      ) || [];

    return {
      ...data,
      regions,
    };
  },

  /**
   * Update a language entity
   * This creates a new version record for tracking
   */
  async updateLanguageEntity(
    id: string,
    updates: Partial<LanguageEntity>,
    userId: string
  ): Promise<void> {
    // Get current data before update
    const { data: current, error: fetchError } = await supabase
      .from('language_entities')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Update the language entity
    const { error: updateError } = await supabase
      .from('language_entities')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Create a version record
    const { error: versionError } = await supabase
      .from('language_entity_versions')
      .insert({
        language_entity_id: id,
        name: updates.name || current.name,
        level: updates.level || current.level,
        parent_id:
          updates.parent_id !== undefined
            ? updates.parent_id
            : current.parent_id,
        change_type: 'update',
        changed_by: userId,
        changed_at: new Date().toISOString(),
      });

    if (versionError) throw versionError;
  },

  /**
   * Fetch version history for a language entity
   */
  async fetchLanguageEntityVersions(
    id: string
  ): Promise<LanguageEntityVersion[]> {
    const { data, error } = await supabase
      .from('language_entity_versions')
      .select(
        `
        *,
        changed_by_user:users!changed_by(email, first_name, last_name)
      `
      )
      .eq('language_entity_id', id)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Update language entity regions
   */
  async updateLanguageEntityRegions(
    languageEntityId: string,
    regionIds: string[]
  ): Promise<void> {
    // Delete existing relationships
    const { error: deleteError } = await supabase
      .from('language_entities_regions')
      .delete()
      .eq('language_entity_id', languageEntityId);

    if (deleteError) throw deleteError;

    // Insert new relationships if any
    if (regionIds.length > 0) {
      const { error: insertError } = await supabase
        .from('language_entities_regions')
        .insert(
          regionIds.map(regionId => ({
            language_entity_id: languageEntityId,
            region_id: regionId,
          }))
        );

      if (insertError) throw insertError;
    }
  },

  /**
   * Fetch all language entities (simple list for dropdowns)
   */
  async fetchLanguageEntitiesList(): Promise<LanguageEntity[]> {
    const { data, error } = await supabase
      .from('language_entities')
      .select('id, name, level, parent_id')
      .is('deleted_at', null)
      .order('name');

    if (error) throw error;
    return data || [];
  },
};
