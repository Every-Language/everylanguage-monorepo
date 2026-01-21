import { supabase } from '@/shared/services/supabase';
import type { Database } from '@everylanguage/shared-types';

export interface EntityForDonation {
  id: string;
  name: string;
  budgetCents: number;
}

export interface PaginatedDonationEntities {
  data: EntityForDonation[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface FetchDonationEntitiesParams {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
}

type SearchPartnerOrgsResult =
  Database['public']['Functions']['search_partner_orgs']['Returns'];

export async function searchPartnerOrgs(
  query: string,
  limit = 10,
  excludeIndividual = false
): Promise<{
  results: Array<{
    id: string;
    name: string;
    description: string | null;
    similarityScore: number;
  }>;
}> {
  if (!query || query.trim().length < 2) {
    return { results: [] };
  }

  // If we need to exclude individual orgs, query directly from partner_orgs table
  // Otherwise, use the RPC function for better performance
  if (excludeIndividual) {
    // Query partner_orgs directly with filters
    const { data, error } = await (supabase as any)
      .from('partner_orgs')
      .select('id, name, description')
      .eq('is_public', true)
      .eq('is_individual', false)
      .ilike('name', `%${query}%`)
      .limit(limit);

    if (error) {
      console.error('Error searching partner orgs:', error);
      throw new Error(error.message || 'Failed to search organizations');
    }

    return {
      results: (data || []).map((org: any) => ({
        id: org.id,
        name: org.name,
        description: org.description,
        similarityScore: 1.0, // Simple match, no similarity score available
      })),
    };
  }

  // Call the RPC function directly through Supabase client (includes similarity scoring)
  const { data, error } = await (supabase as any).rpc('search_partner_orgs', {
    search_query: query,
    max_results: limit,
  });

  if (error) {
    console.error('Error searching partner orgs:', error);
    throw new Error(error.message || 'Failed to search organizations');
  }

  // Map database results to API format
  const results = (data || []) as SearchPartnerOrgsResult;
  return {
    results: results.map(org => ({
      id: org.id,
      name: org.name,
      description: org.description,
      similarityScore: org.similarity_score,
    })),
  };
}

/**
 * Fetch partner organizations paginated in alphabetical order
 * Used when there's no search query to display all available orgs
 */
export async function fetchPartnerOrgsPaginated(
  limit: number,
  offset: number
): Promise<{
  results: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
}> {
  const { data, error } = await (supabase as any)
    .from('partner_orgs')
    .select('id, name, description')
    .eq('is_public', true)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching partner orgs:', error);
    throw new Error(error.message || 'Failed to fetch organizations');
  }

  return {
    results: (data || []).map((org: any) => ({
      id: org.id,
      name: org.name,
      description: org.description,
    })),
  };
}

/**
 * Fetch languages available for donation from language_funding_balances view
 * Returns languages with funding_status 'available' or 'in_progress' and remaining_budget_cents > 0
 */
export async function fetchLanguagesForDonation(): Promise<
  EntityForDonation[]
> {
  return (await fetchLanguagesForDonationPaginated()).data;
}

export async function fetchLanguagesForDonationPaginated(
  params: FetchDonationEntitiesParams = {}
): Promise<PaginatedDonationEntities> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const searchQuery = params.searchQuery?.trim() ?? '';
  const isSearchActive = searchQuery.length >= 2;

  type LanguageFundingBalanceRow = {
    language_entity_id: string;
    remaining_budget_cents: number | null;
    language_entities: { id: string; name: string } | null;
  };

  // Use explicit foreign key relationship syntax for PostgREST
  let query = (supabase as unknown as typeof supabase)
    .from('language_funding_balances')
    .select(
      'language_entity_id, remaining_budget_cents, language_entities!language_entity_id(id, name)',
      { count: 'exact' }
    )
    .in('funding_status', ['available', 'in_progress'])
    .gt('remaining_budget_cents', 0)
    .is('deleted_at', null);

  if (isSearchActive) {
    query = query
      .ilike('language_entities.name', `%${searchQuery}%`)
      .order('name', {
        ascending: true,
        referencedTable: 'language_entities',
      });
  } else {
    query = query.order('remaining_budget_cents', { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error('Error fetching languages:', error);
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(error.message || 'Failed to fetch languages');
  }

  const rows = (data || []) as LanguageFundingBalanceRow[];
  const result = rows
    .filter(row => row.language_entities)
    .map(row => ({
      id: row.language_entity_id,
      name: row.language_entities?.name ?? '',
      budgetCents: row.remaining_budget_cents || 0,
    }))
    .filter(entity => entity.name);

  const totalCount = count ?? 0;
  const totalPages = totalCount === 0 ? 1 : Math.ceil(totalCount / pageSize);

  return {
    data: result,
    count: totalCount,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Fetch regions available for donation from region_funding view
 * Returns regions with status indicating available/in_progress and remaining_budget_cents > 0
 */
export async function fetchRegionsForDonation(): Promise<EntityForDonation[]> {
  return (await fetchRegionsForDonationPaginated()).data;
}

export async function fetchRegionsForDonationPaginated(
  params: FetchDonationEntitiesParams = {}
): Promise<PaginatedDonationEntities> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const searchQuery = params.searchQuery?.trim() ?? '';
  const isSearchActive = searchQuery.length >= 2;

  type RegionFundingRow = {
    region_id: string;
    remaining_budget_cents: number | null;
    region_name: string | null;
  };

  let query = (supabase as unknown as typeof supabase)
    .from('region_funding_cached')
    .select('region_id, remaining_budget_cents, region_name', {
      count: 'exact',
    })
    .in('funding_status', ['available', 'in_progress'])
    .gt('remaining_budget_cents', 0);

  if (isSearchActive) {
    query = query
      .ilike('region_name', `%${searchQuery}%`)
      .order('region_name', { ascending: true });
  } else {
    query = query.order('remaining_budget_cents', { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error(error.message || 'Failed to fetch regions');
  }

  const rows = (data || []) as RegionFundingRow[];
  const result = rows
    .filter(row => row.region_name)
    .map(row => ({
      id: row.region_id,
      name: row.region_name ?? '',
      budgetCents: row.remaining_budget_cents || 0,
    }))
    .filter(entity => entity.name);

  const totalCount = count ?? 0;
  const totalPages = totalCount === 0 ? 1 : Math.ceil(totalCount / pageSize);

  return {
    data: result,
    count: totalCount,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Check if a language entity has remaining budget
 */
export async function checkLanguageRemainingBudget(
  languageEntityId: string
): Promise<{
  hasBudget: boolean;
  remainingBudgetCents: number;
  name: string;
} | null> {
  const { data, error } = await (supabase as any)
    .from('language_funding_balances')
    .select(
      'language_entity_id, remaining_budget_cents, language_entities!language_entity_id(id, name)'
    )
    .eq('language_entity_id', languageEntityId)
    .gt('remaining_budget_cents', 0)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error('Error checking language remaining budget:', error);
    return null;
  }

  if (!data || !data.language_entities) {
    return null;
  }

  return {
    hasBudget: true,
    remainingBudgetCents: data.remaining_budget_cents || 0,
    name: data.language_entities.name,
  };
}

/**
 * Check if a region has remaining budget
 */
export async function checkRegionRemainingBudget(regionId: string): Promise<{
  hasBudget: boolean;
  remainingBudgetCents: number;
  name: string;
} | null> {
  const { data, error } = await (supabase as any)
    .from('region_funding')
    .select('region_id, remaining_budget_cents, region_name')
    .eq('region_id', regionId)
    .gt('remaining_budget_cents', 0)
    .maybeSingle();

  if (error) {
    console.error('Error checking region remaining budget:', error);
    return null;
  }

  if (!data || !data.region_name) {
    return null;
  }

  return {
    hasBudget: true,
    remainingBudgetCents: data.remaining_budget_cents || 0,
    name: data.region_name,
  };
}

/**
 * Fetch operations available for donation from operations table
 * Returns operations with status 'available' and is_public = true
 */
export async function fetchOperationsForDonation(): Promise<
  EntityForDonation[]
> {
  // Check if budget_cents column exists by trying to select it
  // If it doesn't exist (migration not run), use a default budget
  const { data, error } = await (supabase as any)
    .from('operations')
    .select('id, name, budget_cents')
    .eq('status', 'available')
    .eq('is_public', true)
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error) {
    // If error is about missing column, try without budget_cents
    if (
      error.message?.includes('budget_cents') ||
      error.message?.includes('column')
    ) {
      const { data: dataWithoutBudget, error: errorWithoutBudget } = await (
        supabase as any
      )
        .from('operations')
        .select('id, name')
        .eq('status', 'available')
        .eq('is_public', true)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (errorWithoutBudget) {
        throw new Error(
          errorWithoutBudget.message || 'Failed to fetch operations'
        );
      }

      // Return with default budget (0) if column doesn't exist
      return (dataWithoutBudget || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        budgetCents: 0, // Default budget until migration is run
      }));
    }
    throw new Error(error.message || 'Failed to fetch operations');
  }

  // Include operations even if budget_cents is null (use 0 as default)
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    budgetCents: row.budget_cents || 0, // Use 0 if budget not set
  }));
}

/**
 * Find existing anonymous or authenticated user by email or phone
 * This prevents data fragmentation from multiple anonymous users with the same contact info
 */
export async function findAnonymousUserByContact(
  email?: string,
  phone?: string
): Promise<{
  user_id: string | null;
  is_anonymous: boolean | null;
  email: string | null;
  phone: string | null;
} | null> {
  if (!email && !phone) {
    return null;
  }

  const { data, error } = await (supabase as any).rpc(
    'find_anonymous_user_by_contact',
    {
      p_email: email || null,
      p_phone: phone || null,
    }
  );

  if (error) {
    console.error('Error finding anonymous user by contact:', error);
    return null;
  }

  // RPC returns array, get first result
  if (data && data.length > 0) {
    return data[0] as {
      user_id: string;
      is_anonymous: boolean;
      email: string | null;
      phone: string | null;
    };
  }

  return null;
}

export async function createDonationCheckout(payload: {
  donor: { firstName: string; lastName: string; email: string; phone?: string };
  donorType: 'individual' | 'partner_org';
  partnerOrgId?: string;
  newPartnerOrg?: {
    name: string;
    description?: string;
    isPublic: boolean;
  };
  intent: {
    type: 'language' | 'region' | 'operation' | 'unrestricted';
    languageEntityId?: string;
    regionId?: string;
    operationId?: string;
  };
  paymentMethod: 'card' | 'bank_transfer';
  amountCents: number;
  isRecurring: boolean;
}) {
  const { data, error } = await supabase.functions.invoke(
    'create-donation-checkout',
    {
      body: payload,
    }
  );

  if (error) {
    console.error('🔴 Edge function error:', error);
    let message = 'Failed to create donation checkout';
    if (error.message) {
      message = error.message;
    }
    throw new Error(message);
  }

  // Handle the response structure from supabase.functions.invoke()
  // invoke() returns { data: edgeFunctionResponse, error: ... }
  // The edge function returns { success: true, data: {...} }
  // So we need data.data to get the actual payload
  const functionResponse = data?.data;
  if (!functionResponse) {
    throw new Error('Invalid response format from Edge function');
  }

  // Extract the actual data from the edge function response
  if (
    functionResponse &&
    typeof functionResponse === 'object' &&
    'success' in functionResponse &&
    'data' in functionResponse
  ) {
    return functionResponse.data as {
      clientSecret: string | null;
      paymentIntentId: string | null;
      donationId: string;
      customerId: string;
      partnerOrgId: string | null;
      subscriptionId?: string | null; // Included if recurring donation
    };
  }

  // Fallback: return the response as-is if structure is different
  return functionResponse as {
    clientSecret: string | null;
    paymentIntentId: string | null;
    donationId: string;
    customerId: string;
    partnerOrgId: string | null;
    subscriptionId?: string | null; // Included if recurring donation
  };
}
