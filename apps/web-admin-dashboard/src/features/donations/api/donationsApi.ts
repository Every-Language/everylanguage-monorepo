import { supabase } from '@/shared/services/supabase';
import type {
  Donation,
  DonationAllocation,
  DonationWithAllocations,
} from '@/types';
import type { Database } from '@everylanguage/shared-types';

type DonationStatus = Database['public']['Enums']['donation_status'];
type DonationIntentType = Database['public']['Enums']['donation_intent_type'];
const isValidUuid = (value: string | undefined): boolean => {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
};

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
    intentLanguageId?: string;
    intentOperationId?: string;
    intentRegionId?: string;
    sortField?: 'date' | 'amount' | 'remaining' | 'donor';
    sortDirection?: 'asc' | 'desc';
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

    const sortField = params?.sortField ?? 'date';
    const sortDirection = params?.sortDirection ?? 'desc';
    const sortAscending = sortDirection === 'asc';

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
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null);

    // Apply status filter
    if (params?.statusFilter) {
      query = query.eq('status', params.statusFilter as DonationStatus);
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

    // Apply search filter in SQL before pagination
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      const searchTerm = params.searchQuery.trim();
      const orFilters = [
        `user.first_name.ilike.%${searchTerm}%`,
        `user.last_name.ilike.%${searchTerm}%`,
        `user.email.ilike.%${searchTerm}%`,
        `partner_org.name.ilike.%${searchTerm}%`,
        `intent_language.name.ilike.%${searchTerm}%`,
        `intent_region.name.ilike.%${searchTerm}%`,
        `intent_operation.name.ilike.%${searchTerm}%`,
      ];

      if (isValidUuid(searchTerm)) {
        orFilters.push(`id.eq.${searchTerm}`);
      }

      query = query.or(orFilters.join(','));
    }

    // Apply sorting
    switch (sortField) {
      case 'amount':
        query = query.order('amount_cents', { ascending: sortAscending });
        break;
      case 'remaining':
        // Cannot sort by remaining on server-side, will sort in JavaScript after calculation
        query = query.order('amount_cents', {
          ascending: sortAscending,
        });
        break;
      case 'donor':
        query = query
          .order('last_name', {
            ascending: sortAscending,
            nullsFirst: sortAscending,
            referencedTable: 'user',
          })
          .order('first_name', {
            ascending: sortAscending,
            nullsFirst: sortAscending,
            referencedTable: 'user',
          })
          .order('name', {
            ascending: sortAscending,
            nullsFirst: !sortAscending,
            referencedTable: 'partner_org',
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

    // Transform data to calculate allocated and remaining amounts
    let transformedData: DonationWithAllocations[] = (data || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (donation: any) => {
        const allocations: DonationAllocation[] =
          donation.donation_allocations || [];
        const allocated_cents = allocations.reduce(
          (sum, alloc) => sum + alloc.amount_cents,
          0
        );
        const remaining_cents = donation.amount_cents - allocated_cents;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const donationData = donation as any;

        return {
          ...donationData,
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
          is_manual: (donationData.is_manual as boolean | undefined) ?? false,
        } as DonationWithAllocations;
      }
    );

    // Apply onlyUnallocated filter if needed (must be done after calculating remaining)
    if (params?.onlyUnallocated) {
      transformedData = transformedData.filter(
        donation => donation.remaining_cents > 0
      );
    }

    // Apply remaining sort if needed (must be done after calculating remaining)
    if (sortField === 'remaining') {
      transformedData.sort((a, b) => {
        const diff = a.remaining_cents - b.remaining_cents;
        return sortAscending ? diff : -diff;
      });
    }

    // Note: count and pagination are approximate when onlyUnallocated filter is applied
    // since we filter after fetching. For accurate counts, we'd need a separate query.
    const finalCount = params?.onlyUnallocated
      ? transformedData.length
      : count || 0;

    return {
      data: transformedData,
      count: finalCount,
      page,
      pageSize,
      totalPages: Math.ceil(finalCount / pageSize),
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const donationData = data as any;

    return {
      ...donationData,
      allocations,
      allocated_cents,
      remaining_cents,
      intent_language: data.intent_language || null,
      intent_region: data.intent_region || null,
      intent_operation: data.intent_operation || null,
      partner_org: data.partner_org || null,
      user: data.user
        ? {
            id: data.user.id,
            first_name: data.user.first_name || '',
            last_name: data.user.last_name || '',
            email: data.user.email || '',
          }
        : null,
      is_manual: (donationData.is_manual as boolean | undefined) ?? false,
    } as DonationWithAllocations;
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'donationsApi.ts:362',
        message: 'createAllocation called',
        data: {
          donation_id: allocation.donation_id,
          amount_cents: allocation.amount_cents,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C',
      }),
    }).catch(() => {});
    // #endregion
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error('User not authenticated');
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'donationsApi.ts:375',
        message: 'User auth check',
        data: { userId: userData.user.id, email: userData.user.email },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C',
      }),
    }).catch(() => {});
    // #endregion

    const insertData = {
      ...allocation,
      created_by: userData.user.id,
    };

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'donationsApi.ts:383',
        message: 'Insert data prepared',
        data: insertData,
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run3',
        hypothesisId: 'E',
      }),
    }).catch(() => {});
    // #endregion

    // Test has_permission function directly
    // #region agent log
    const { data: permCheck, error: permError } = await supabase.rpc(
      'has_permission',
      {
        p_user_id: userData.user.id,
        p_action: 'system.admin',
        p_resource_type: 'global',
        p_resource_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID for global resources
      }
    );
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'donationsApi.ts:390',
        message: 'has_permission check',
        data: { hasPermission: permCheck, error: permError?.message },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run3',
        hypothesisId: 'E',
      }),
    }).catch(() => {});
    // #endregion

    // Try insert without RETURNING first to isolate INSERT vs SELECT policy issue
    // #region agent log
    const { error: insertOnlyError } = await supabase
      .from('donation_allocations')
      .insert(insertData);
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'donationsApi.ts:397',
        message: 'Insert without RETURNING',
        data: {
          success: !insertOnlyError,
          error: insertOnlyError?.message,
          code: insertOnlyError?.code,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run3',
        hypothesisId: 'E',
      }),
    }).catch(() => {});
    // #endregion

    if (insertOnlyError) {
      throw insertOnlyError;
    }

    // If insert succeeded, now try to query it back
    const { data: insertedData, error: queryError } = await supabase
      .from('donation_allocations')
      .select('id')
      .eq('donation_id', allocation.donation_id)
      .eq('created_by', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'donationsApi.ts:410',
        message: 'Query after insert',
        data: {
          success: !queryError,
          foundId: insertedData?.id,
          error: queryError?.message,
          code: queryError?.code,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run3',
        hypothesisId: 'E',
      }),
    }).catch(() => {});
    // #endregion

    if (queryError || !insertedData?.id) {
      throw new Error(queryError?.message || 'Failed to create allocation');
    }

    // Fetch the full allocation record
    const { data, error } = await supabase
      .from('donation_allocations')
      .select(
        'id, donation_id, operation_id, project_id, amount_cents, currency_code, effective_from, effective_to, created_by, created_at, notes'
      )
      .eq('id', insertedData.id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Search operations using simple ilike pattern matching
   */
  async searchOperations(
    searchQuery: string,
    maxResults: number = 50
  ): Promise<Array<{ id: string; name: string; category: string }>> {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return [];
    }

    const { data, error } = await (
      supabase as unknown as {
        rpc: (
          fn: string,
          params?: Record<string, unknown>
        ) => Promise<{ data: unknown; error: Error | null }>;
      }
    ).rpc('search_operations', {
      search_query: searchQuery.trim(),
      max_results: maxResults,
      min_similarity: 0.1,
    });

    if (error) throw error;

    const rows =
      (data as Array<{
        operation_id: string;
        operation_name: string;
        category: string | null;
      }>) || [];

    return rows.map(row => ({
      id: row.operation_id,
      name: row.operation_name,
      category: row.category || '',
    }));
  },

  /**
   * Search projects using simple ilike pattern matching
   */
  async searchProjects(
    searchQuery: string,
    maxResults: number = 50
  ): Promise<
    Array<{
      id: string;
      name: string;
      target_language_entity_id: string | null;
      target_language_name: string | null;
    }>
  > {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return [];
    }

    const { data, error } = await (
      supabase as unknown as {
        rpc: (
          fn: string,
          params?: Record<string, unknown>
        ) => Promise<{ data: unknown; error: Error | null }>;
      }
    ).rpc('search_projects', {
      search_query: searchQuery.trim(),
      max_results: maxResults,
      min_similarity: 0.1,
    });

    if (error) throw error;

    const rows =
      (data as Array<{
        project_id: string;
        project_name: string;
        target_language_entity_id: string | null;
        target_language_name: string | null;
      }>) || [];

    return rows.map(item => ({
      id: item.project_id,
      name: item.project_name,
      target_language_entity_id: item.target_language_entity_id,
      target_language_name: item.target_language_name || null,
    }));
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
      .eq('status', 'available' as const)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetch paginated operations for dropdown (alphabetical order)
   */
  async fetchOperationsPaginated(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: Array<{ id: string; name: string; category: string }>;
    page: number;
    pageSize: number;
    totalPages: number;
    count: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('operations')
      .select('id, name, category', { count: 'exact' })
      .is('deleted_at', null)
      .eq('status', 'available' as const)
      .order('name', { ascending: true })
      .range(from, to);

    if (error) throw error;
    return {
      data: data || [],
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      count: count || 0,
    };
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

  /**
   * Fetch paginated projects for dropdown (alphabetical order)
   */
  async fetchProjectsPaginated(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: Array<{
      id: string;
      name: string;
      target_language_entity_id: string | null;
      target_language_name: string | null;
    }>;
    page: number;
    pageSize: number;
    totalPages: number;
    count: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('projects')
      .select(
        `
        id,
        name,
        target_language_entity_id,
        target_language:language_entities!projects_target_language_entity_id_fkey (
          id,
          name
        )
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .order('name', { ascending: true })
      .range(from, to);

    if (error) throw error;
    return {
      data:
        data?.map(proj => ({
          id: proj.id,
          name: proj.name,
          target_language_entity_id: proj.target_language_entity_id,
          target_language_name:
            (proj.target_language as { name: string } | null)?.name || null,
        })) || [],
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      count: count || 0,
    };
  },

  /**
   * Create a new manual donation
   */
  async createDonation(data: {
    user_id: string;
    partner_org_id: string;
    intent_type: DonationIntentType;
    intent_language_entity_id?: string;
    intent_region_id?: string;
    intent_operation_id?: string;
    amount_cents: number;
    currency_code?: string;
    status?: DonationStatus;
    payment_method?: Database['public']['Enums']['payment_method_type'];
    is_recurring?: boolean;
  }): Promise<Donation> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error('User not authenticated');
    }

    // Validate required fields
    if (!data.user_id || !data.partner_org_id) {
      throw new Error('Both user_id and partner_org_id are required');
    }

    if (!data.intent_type) {
      throw new Error('Intent type is required');
    }

    if (data.amount_cents <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Validate intent fields match intent_type
    if (data.intent_type === 'language' && !data.intent_language_entity_id) {
      throw new Error('Language entity is required for language intent');
    }

    if (data.intent_type === 'region' && !data.intent_region_id) {
      throw new Error('Region is required for region intent');
    }

    if (data.intent_type === 'operation' && !data.intent_operation_id) {
      throw new Error('Operation is required for operation intent');
    }

    const status = data.status || 'completed';

    const insertData = {
      user_id: data.user_id,
      partner_org_id: data.partner_org_id,
      intent_type: data.intent_type,
      intent_language_entity_id:
        data.intent_type === 'language' ? data.intent_language_entity_id : null,
      intent_region_id:
        data.intent_type === 'region' ? data.intent_region_id : null,
      intent_operation_id:
        data.intent_type === 'operation' ? data.intent_operation_id : null,
      amount_cents: data.amount_cents,
      currency_code: data.currency_code || 'USD',
      status: status,
      payment_method: data.payment_method || 'card',
      is_recurring: data.is_recurring || false,
      is_manual: true,
      created_by: userData.user.id,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    } as Database['public']['Tables']['donations']['Insert'];

    const { data: donation, error } = await supabase
      .from('donations')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating donation:', error);
      throw new Error(error.message || 'Failed to create donation');
    }

    return donation;
  },
};
