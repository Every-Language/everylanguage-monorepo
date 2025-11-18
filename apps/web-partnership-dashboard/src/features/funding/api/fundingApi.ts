import { supabase } from '@/shared/services/supabase';
import type { Database } from '@everylanguage/shared-types';

export interface EntityForDonation {
  id: string;
  name: string;
  budgetCents: number;
}

type SearchPartnerOrgsResult =
  Database['public']['Functions']['search_partner_orgs']['Returns'];

export async function searchPartnerOrgs(
  query: string,
  limit = 10
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

  // Call the RPC function directly through Supabase client
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
 * Fetch languages available for donation from language_funding_remaining view
 * Returns languages with funding_status 'available' or 'in_progress' and remaining_budget_cents > 0
 */
export async function fetchLanguagesForDonation(): Promise<
  EntityForDonation[]
> {
  // Use explicit foreign key relationship syntax for PostgREST
  const { data, error } = await (supabase as any)
    .from('language_funding_remaining')
    .select(
      'language_entity_id, remaining_budget_cents, language_entities!language_entity_id(id, name)'
    )
    .in('funding_status', ['available', 'in_progress'])
    .gt('remaining_budget_cents', 0)
    .is('deleted_at', null)
    .order('remaining_budget_cents', { ascending: false });

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

  console.log('Fetched languages data:', {
    count: data?.length || 0,
    sample: data?.[0],
  });

  // Filter out languages without entity data and map to response format
  const result = (data || [])
    .filter((row: any) => row.language_entities) // Only filter out if language_entities is missing
    .map((row: any) => ({
      id: row.language_entity_id,
      name: row.language_entities.name,
      budgetCents: row.remaining_budget_cents || 0, // Use remaining budget
    }));

  console.log('Processed languages:', {
    count: result.length,
    sample: result[0],
  });

  return result;
}

/**
 * Fetch regions available for donation from region_funding view
 * Returns regions with status indicating available/in_progress and remaining_budget_cents > 0
 */
export async function fetchRegionsForDonation(): Promise<EntityForDonation[]> {
  const { data, error } = await (supabase as any)
    .from('region_funding')
    .select('region_id, remaining_budget_cents, region_name')
    .in('funding_status', ['available', 'in_progress'])
    .gt('remaining_budget_cents', 0)
    .order('remaining_budget_cents', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch regions');
  }

  return (data || [])
    .filter((row: any) => row.region_name && row.remaining_budget_cents)
    .map((row: any) => ({
      id: row.region_id,
      name: row.region_name,
      budgetCents: row.remaining_budget_cents,
    }));
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
    .from('language_funding_remaining')
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
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(
    /\/$/,
    ''
  );

  const url = `${base}/create-donation-checkout`;
  console.log('🔵 Creating donation checkout:', {
    url,
    payload: JSON.parse(JSON.stringify(payload)), // Deep clone to see actual values
  });
  console.log('🔵 Intent in payload:', JSON.stringify(payload.intent, null, 2));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  console.log('🔵 Response status:', res.status, res.statusText);

  if (!res.ok) {
    let message = 'Failed to create donation checkout';
    let errorDetails: any = null;
    try {
      const text = await res.text();
      console.error('🔴 Raw error response:', text);
      const j = JSON.parse(text);
      errorDetails = j;
      if (j?.error) message = j.error;
      if (j?.details) {
        console.error('🔴 Error details:', j.details);
        message = `${message}: ${j.details}`;
      }
    } catch (e) {
      console.error('🔴 Failed to parse error response', e);
      message = `${message} (${res.status} ${res.statusText})`;
    }
    console.error('🔴 Full error context:', {
      status: res.status,
      statusText: res.statusText,
      errorDetails,
      url,
    });
    throw new Error(message);
  }
  const json = await res.json();
  const data =
    json && typeof json === 'object' && 'data' in json
      ? (json as any).data
      : json;
  return data as {
    clientSecret: string | null;
    paymentIntentId: string;
    donationId: string;
    customerId: string;
    partnerOrgId: string | null;
  };
}
