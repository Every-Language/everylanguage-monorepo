import { supabase } from '@/shared/services/supabase';
import type {
  Donation,
  DonationAllocation,
  DonationWithAllocations,
} from '@/types';

export const donationsApi = {
  /**
   * Fetch donations with pagination, filters, and allocation details
   */
  async fetchDonations(params?: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    statusFilter?: string;
    intentTypeFilter?: string;
    paymentMethodFilter?: string;
    onlyUnallocated?: boolean;
  }): Promise<{
    data: DonationWithAllocations[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query for donations
    let query = supabase
      .from('donations')
      .select(
        `
        *,
        donation_allocations (
          id,
          amount_cents,
          donation_id,
          operation_id,
          project_id,
          notes,
          created_at,
          created_by,
          effective_from,
          effective_to,
          currency_code
        ),
        intent_language:language_entities!donations_intent_language_entity_id_fkey (
          id,
          name,
          level
        ),
        intent_region:regions!donations_intent_region_id_fkey (
          id,
          name,
          level
        ),
        intent_operation:operations!donations_intent_operation_id_fkey (
          id,
          name,
          category
        ),
        partner_org:partner_orgs!donations_partner_org_id_fkey (
          id,
          name
        ),
        user:users!donations_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (params?.statusFilter) {
      query = query.eq('status', params.statusFilter);
    }

    // Apply intent type filter
    if (params?.intentTypeFilter) {
      query = query.eq('intent_type', params.intentTypeFilter);
    }

    // Apply payment method filter
    if (params?.paymentMethodFilter) {
      query = query.eq('payment_method', params.paymentMethodFilter);
    }

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    // Transform data to calculate allocated and remaining amounts
    let transformedData: DonationWithAllocations[] = (data || []).map(
      (donation: any) => {
        const allocations: DonationAllocation[] =
          donation.donation_allocations || [];
        const allocated_cents = allocations.reduce(
          (sum, alloc) => sum + alloc.amount_cents,
          0
        );
        const remaining_cents = donation.amount_cents - allocated_cents;

        return {
          ...donation,
          allocations,
          allocated_cents,
          remaining_cents,
          intent_language: donation.intent_language || null,
          intent_region: donation.intent_region || null,
          intent_operation: donation.intent_operation || null,
          partner_org: donation.partner_org || null,
          user: donation.user || null,
        };
      }
    );

    // Apply unallocated filter in-memory (after fetching)
    if (params?.onlyUnallocated) {
      transformedData = transformedData.filter(
        donation => donation.remaining_cents > 0
      );
    }

    // Apply search filter in-memory
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      const searchLower = params.searchQuery.toLowerCase();
      transformedData = transformedData.filter(donation => {
        const userName = donation.user
          ? `${donation.user.first_name} ${donation.user.last_name}`.toLowerCase()
          : '';
        const userEmail = donation.user?.email?.toLowerCase() || '';
        const partnerOrgName = donation.partner_org?.name?.toLowerCase() || '';
        const intentLanguageName =
          donation.intent_language?.name?.toLowerCase() || '';
        const intentRegionName =
          donation.intent_region?.name?.toLowerCase() || '';
        const intentOperationName =
          donation.intent_operation?.name?.toLowerCase() || '';

        return (
          userName.includes(searchLower) ||
          userEmail.includes(searchLower) ||
          partnerOrgName.includes(searchLower) ||
          intentLanguageName.includes(searchLower) ||
          intentRegionName.includes(searchLower) ||
          intentOperationName.includes(searchLower) ||
          donation.id.toLowerCase().includes(searchLower)
        );
      });
    }

    // Recalculate pagination after filters
    const filteredCount = transformedData.length;
    const paginatedData = transformedData.slice(0, pageSize);

    return {
      data: paginatedData,
      count:
        params?.onlyUnallocated || params?.searchQuery
          ? filteredCount
          : count || 0,
      page,
      pageSize,
      totalPages: Math.ceil(
        (params?.onlyUnallocated || params?.searchQuery
          ? filteredCount
          : count || 0) / pageSize
      ),
    };
  },

  /**
   * Fetch a single donation with all details
   */
  async fetchDonationById(id: string): Promise<DonationWithAllocations | null> {
    const { data, error } = await supabase
      .from('donations')
      .select(
        `
        *,
        donation_allocations (
          id,
          amount_cents,
          donation_id,
          operation_id,
          project_id,
          notes,
          created_at,
          created_by,
          effective_from,
          effective_to,
          currency_code
        ),
        intent_language:language_entities!donations_intent_language_entity_id_fkey (
          id,
          name,
          level
        ),
        intent_region:regions!donations_intent_region_id_fkey (
          id,
          name,
          level
        ),
        intent_operation:operations!donations_intent_operation_id_fkey (
          id,
          name,
          category
        ),
        partner_org:partner_orgs!donations_partner_org_id_fkey (
          id,
          name
        ),
        user:users!donations_user_id_fkey (
          id,
          first_name,
          last_name,
          email
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

    const allocations: DonationAllocation[] = data.donation_allocations || [];
    const allocated_cents = allocations.reduce(
      (sum, alloc) => sum + alloc.amount_cents,
      0
    );
    const remaining_cents = data.amount_cents - allocated_cents;

    return {
      ...data,
      allocations,
      allocated_cents,
      remaining_cents,
      intent_language: data.intent_language || null,
      intent_region: data.intent_region || null,
      intent_operation: data.intent_operation || null,
      partner_org: data.partner_org || null,
      user: data.user || null,
    };
  },

  /**
   * Create a new donation allocation
   */
  async createAllocation(allocation: {
    donation_id: string;
    operation_id?: string;
    project_id?: string;
    amount_cents: number;
    notes?: string;
    effective_from?: string;
    effective_to?: string;
  }): Promise<DonationAllocation> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('donation_allocations')
      .insert({
        ...allocation,
        created_by: userData.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetch all operations for allocation dropdown
   */
  async fetchOperations(): Promise<
    Array<{ id: string; name: string; category: string }>
  > {
    const { data, error } = await supabase
      .from('operations')
      .select('id, name, category')
      .is('deleted_at', null)
      .eq('status', 'active')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetch all projects for allocation dropdown
   */
  async fetchProjects(): Promise<
    Array<{ id: string; name: string; project_status: string }>
  > {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, project_status')
      .is('deleted_at', null)
      .order('name');

    if (error) throw error;
    return data || [];
  },
};
