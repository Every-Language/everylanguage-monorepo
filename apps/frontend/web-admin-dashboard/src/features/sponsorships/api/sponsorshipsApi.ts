import { supabase } from '@/shared/services/supabase';
import type {
  Sponsorship,
  SponsorshipWithDetails,
  SponsorshipAllocation,
} from '@/types';

export const sponsorshipsApi = {
  /**
   * Fetch all sponsorships with related data
   */
  async fetchSponsorships(filters?: {
    status?: string;
    partnerOrgId?: string;
  }): Promise<SponsorshipWithDetails[]> {
    let query = supabase
      .from('sponsorships')
      .select(
        `
        *,
        partner_org:partner_orgs!partner_org_id(id, name),
        language_adoption:language_adoptions(id, language_entity_id),
        project:projects(id, name)
      `
      )
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.partnerOrgId) {
      query = query.eq('partner_org_id', filters.partnerOrgId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetch sponsorship allocations for a sponsorship
   */
  async fetchSponsorshipAllocations(
    sponsorshipId: string
  ): Promise<SponsorshipAllocation[]> {
    const { data, error } = await supabase
      .from('sponsorship_allocations')
      .select(
        `
        *,
        project:projects(id, name)
      `
      )
      .eq('sponsorship_id', sponsorshipId)
      .order('effective_from', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Create a new sponsorship allocation
   */
  async createAllocation(
    sponsorshipId: string,
    projectId: string,
    allocationPercent: number,
    effectiveFrom: string,
    userId: string
  ): Promise<void> {
    const { error } = await supabase.from('sponsorship_allocations').insert({
      sponsorship_id: sponsorshipId,
      project_id: projectId,
      allocation_percent: allocationPercent,
      effective_from: effectiveFrom,
      created_by: userId,
    });

    if (error) throw error;
  },

  /**
   * Fetch projects for a language entity (for allocation)
   */
  async fetchProjectsForLanguageEntity(
    languageEntityId: string
  ): Promise<Array<{ id: string; name: string; language_entity_id: string }>> {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, language_entity_id')
      .eq('language_entity_id', languageEntityId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetch active sponsorships for a language entity
   */
  async fetchActiveSponsorshipsForLanguage(
    languageEntityId: string
  ): Promise<SponsorshipWithDetails[]> {
    const { data, error } = await supabase
      .from('sponsorships')
      .select(
        `
        *,
        partner_org:partner_orgs!partner_org_id(id, name),
        language_adoption:language_adoptions!inner(id, language_entity_id)
      `
      )
      .eq('language_adoptions.language_entity_id', languageEntityId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
