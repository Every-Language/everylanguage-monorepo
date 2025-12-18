import { supabase } from '@/shared/services/supabase';
import type {
  SubscriptionWithDonations,
  DonationWithAllocations,
} from '@/types';
import type { Database } from '@everylanguage/shared-types';

type SubscriptionStatus = Database['public']['Enums']['subscription_status'];
type DonationIntentType = Database['public']['Enums']['donation_intent_type'];

export const subscriptionsApi = {
  /**
   * Fetch subscriptions with pagination, filters, and sorting
   */
  async fetchSubscriptions(params?: {
    page?: number;
    pageSize?: number;
    statusFilter?: string;
    intentTypeFilter?: string;
    intentLanguageId?: string;
    intentOperationId?: string;
    intentRegionId?: string;
    sortField?: 'date' | 'amount' | 'next_payment';
    sortDirection?: 'asc' | 'desc';
  }): Promise<{
    data: SubscriptionWithDonations[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const sortField = params?.sortField ?? 'date';
    const sortDirection = params?.sortDirection ?? 'desc';
    const sortAscending = sortDirection === 'asc';

    // Build query for subscriptions
    let query = supabase.from('subscriptions').select(
      `
        *,
        intent_language:language_entities!subscriptions_intent_language_entity_id_fkey (
          id,
          name,
          level
        ),
        intent_region:regions!subscriptions_intent_region_id_fkey (
          id,
          name,
          level
        ),
        intent_operation:operations!subscriptions_intent_operation_id_fkey (
          id,
          name,
          category
        ),
        partner_org:partner_orgs!subscriptions_partner_org_id_fkey (
          id,
          name
        ),
        user:users!subscriptions_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `,
      { count: 'exact' }
    );

    // Apply status filter
    if (params?.statusFilter) {
      query = query.eq('status', params.statusFilter as SubscriptionStatus);
    }

    // Apply intent type filter
    if (params?.intentTypeFilter) {
      query = query.eq(
        'intent_type',
        params.intentTypeFilter as DonationIntentType
      );
    }

    if (params?.intentLanguageId) {
      query = query.eq('intent_language_entity_id', params.intentLanguageId);
    }

    if (params?.intentOperationId) {
      query = query.eq('intent_operation_id', params.intentOperationId);
    }

    if (params?.intentRegionId) {
      query = query.eq('intent_region_id', params.intentRegionId);
    }

    // Apply sorting
    switch (sortField) {
      case 'amount':
        query = query.order('amount_cents', { ascending: sortAscending });
        break;
      case 'next_payment':
        query = query.order('current_period_end', {
          ascending: sortAscending,
          nullsFirst: !sortAscending,
        });
        break;
      case 'date':
      default:
        query = query.order('created_at', { ascending: sortAscending });
        break;
    }

    if (sortField !== 'date') {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    // Transform data
    const transformedData: SubscriptionWithDonations[] = (data || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (subscription: any) => {
        return {
          ...subscription,
          donations: [], // Will be populated in fetchSubscriptionById
          intent_language: subscription.intent_language || null,
          intent_region: subscription.intent_region || null,
          intent_operation: subscription.intent_operation || null,
          partner_org: subscription.partner_org || null,
          user: subscription.user
            ? {
                id: subscription.user.id,
                first_name: subscription.user.first_name || '',
                last_name: subscription.user.last_name || '',
                email: subscription.user.email || '',
              }
            : null,
        } as SubscriptionWithDonations;
      }
    );

    return {
      data: transformedData,
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  /**
   * Fetch a single subscription with all details including linked donations
   */
  async fetchSubscriptionById(
    id: string
  ): Promise<SubscriptionWithDonations | null> {
    // Fetch subscription
    const { data: subscriptionData, error: subError } = await supabase
      .from('subscriptions')
      .select(
        `
        *,
        intent_language:language_entities!subscriptions_intent_language_entity_id_fkey (
          id,
          name,
          level
        ),
        intent_region:regions!subscriptions_intent_region_id_fkey (
          id,
          name,
          level
        ),
        intent_operation:operations!subscriptions_intent_operation_id_fkey (
          id,
          name,
          category
        ),
        partner_org:partner_orgs!subscriptions_partner_org_id_fkey (
          id,
          name
        ),
        user:users!subscriptions_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `
      )
      .eq('id', id)
      .single();

    if (subError) {
      if (subError.code === 'PGRST116') return null;
      throw subError;
    }

    // Fetch linked donations
    const { data: donationsData, error: donationsError } = await supabase
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
          currency_code,
          operation:operations!donation_allocations_operation_id_fkey (
            id,
            name,
            category
          ),
          project:projects!donation_allocations_project_id_fkey (
            id,
            name,
            target_language_entity_id,
            target_language:language_entities!projects_target_language_entity_id_fkey (
              id,
              name,
              level
            )
          )
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
      .eq('subscription_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (donationsError) throw donationsError;

    // Transform donations
    const donations: DonationWithAllocations[] = (donationsData || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (donation: any) => {
        const allocations = donation.donation_allocations || [];
        const allocated_cents = allocations.reduce(
          (sum: number, alloc: { amount_cents: number }) =>
            sum + alloc.amount_cents,
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
          user: donation.user
            ? {
                id: donation.user.id,
                first_name: donation.user.first_name || '',
                last_name: donation.user.last_name || '',
                email: donation.user.email || '',
              }
            : null,
          is_manual: (donation.is_manual as boolean | undefined) ?? false,
        } as DonationWithAllocations;
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = subscriptionData as any;

    return {
      ...sub,
      donations,
      intent_language: sub.intent_language || null,
      intent_region: sub.intent_region || null,
      intent_operation: sub.intent_operation || null,
      partner_org: sub.partner_org || null,
      user: sub.user
        ? {
            id: sub.user.id,
            first_name: sub.user.first_name || '',
            last_name: sub.user.last_name || '',
            email: sub.user.email || '',
          }
        : null,
    } as SubscriptionWithDonations;
  },

  /**
   * Search regions using search_region_aliases RPC function
   */
  async searchRegions(
    searchQuery: string,
    maxResults: number = 50
  ): Promise<Array<{ id: string; name: string; level: string }>> {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return [];
    }

    const { data, error } = await supabase.rpc('search_region_aliases', {
      search_query: searchQuery.trim(),
      max_results: maxResults,
      min_similarity: 0.1,
      include_languages: false,
    });

    if (error) throw error;

    const rows =
      (data as Array<{
        region_id: string;
        region_name: string;
        region_level: string;
      }>) || [];

    return rows.map(row => ({
      id: row.region_id,
      name: row.region_name,
      level: row.region_level,
    }));
  },
};
