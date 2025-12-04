import { supabase } from '@/shared/services/supabase';
import { normalizeSupabaseRelation } from '@/shared/utils/supabase-helpers';

export interface Subscription {
  id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  original_donation_id: string | null;
  amount_cents: number;
  currency_code: string;
  interval_type: 'month' | 'year';
  status:
    | 'active'
    | 'canceled'
    | 'past_due'
    | 'unpaid'
    | 'incomplete'
    | 'incomplete_expired'
    | 'trialing'
    | 'paused';
  current_period_start: string | null;
  current_period_end: string | null;
  intent_type: 'language' | 'region' | 'operation' | 'unrestricted';
  intent_language_entity_id: string | null;
  intent_region_id: string | null;
  intent_operation_id: string | null;
  user_id: string | null;
  partner_org_id: string | null;
  created_at: string;
  updated_at: string | null;
  canceled_at: string | null;
  // Relations
  intent_language?: { id: string; name: string } | null;
  intent_region?: { id: string; name: string } | null;
  intent_operation?: { id: string; name: string } | null;
  original_donation?: {
    id: string;
    amount_cents: number;
    created_at: string;
  } | null;
}

export interface SubscriptionWithDonations extends Subscription {
  donations: Array<{
    id: string;
    amount_cents: number;
    status: string;
    created_at: string;
    completed_at: string | null;
  }>;
}

/**
 * Fetch all subscriptions for the current user or their partner orgs
 */
export async function fetchSubscriptions(
  userId: string | null,
  partnerOrgIds: string[] = []
): Promise<Subscription[]> {
  if (!userId && partnerOrgIds.length === 0) {
    return [];
  }

  let query = supabase
    .from('subscriptions')
    .select(
      `
      *,
      intent_language:language_entities!subscriptions_intent_language_entity_id_fkey (
        id,
        name
      ),
      intent_region:regions!subscriptions_intent_region_id_fkey (
        id,
        name
      ),
      intent_operation:operations!subscriptions_intent_operation_id_fkey (
        id,
        name
      ),
      original_donation:donations!subscriptions_original_donation_id_fkey (
        id,
        amount_cents,
        created_at
      )
    `
    )
    .order('created_at', { ascending: false });

  // Filter by user or partner orgs
  if (userId) {
    query = query.or(
      `user_id.eq.${userId}${partnerOrgIds.length > 0 ? `,partner_org_id.in.(${partnerOrgIds.join(',')})` : ''}`
    );
  } else if (partnerOrgIds.length > 0) {
    query = query.in('partner_org_id', partnerOrgIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching subscriptions:', error);
    throw new Error(error.message || 'Failed to fetch subscriptions');
  }

  return (data || []).map((sub: any) => ({
    ...sub,
    intent_language: normalizeSupabaseRelation(sub.intent_language),
    intent_region: normalizeSupabaseRelation(sub.intent_region),
    intent_operation: normalizeSupabaseRelation(sub.intent_operation),
    original_donation: normalizeSupabaseRelation(sub.original_donation),
  })) as Subscription[];
}

/**
 * Fetch a single subscription with its donation history
 */
export async function fetchSubscriptionWithDonations(
  subscriptionId: string
): Promise<SubscriptionWithDonations | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      `
      *,
      intent_language:language_entities!subscriptions_intent_language_entity_id_fkey (
        id,
        name
      ),
      intent_region:regions!subscriptions_intent_region_id_fkey (
        id,
        name
      ),
      intent_operation:operations!subscriptions_intent_operation_id_fkey (
        id,
        name
      ),
      original_donation:donations!subscriptions_original_donation_id_fkey (
        id,
        amount_cents,
        created_at
      ),
      donations:donations!donations_subscription_id_fkey (
        id,
        amount_cents,
        status,
        created_at,
        completed_at
      )
    `
    )
    .eq('id', subscriptionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching subscription:', error);
    throw new Error(error.message || 'Failed to fetch subscription');
  }

  if (!data) return null;

  type SubscriptionRow = Subscription & {
    intent_language: { id: string; name: string } | null;
    intent_region: { id: string; name: string } | null;
    intent_operation: { id: string; name: string } | null;
    original_donation: {
      id: string;
      amount_cents: number;
      created_at: string;
    } | null;
    donations: Array<{
      id: string;
      amount_cents: number;
      status: string;
      created_at: string;
      completed_at: string | null;
    }> | null;
  };

  const row = data as SubscriptionRow;

  return {
    ...row,
    intent_language: normalizeSupabaseRelation(row.intent_language),
    intent_region: normalizeSupabaseRelation(row.intent_region),
    intent_operation: normalizeSupabaseRelation(row.intent_operation),
    original_donation: normalizeSupabaseRelation(row.original_donation),
    donations: (row.donations || []).map(d => ({
      id: d.id,
      amount_cents: d.amount_cents,
      status: d.status,
      created_at: d.created_at,
      completed_at: d.completed_at,
    })),
  } as SubscriptionWithDonations;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<void> {
  const { data, error } = await supabase.functions.invoke(
    'manage-subscription',
    {
      body: { action: 'cancel', subscriptionId },
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (error) {
    console.error('Error canceling subscription:', error);
    throw new Error(error.message || 'Failed to cancel subscription');
  }

  // Check response structure
  const response = data?.data || data;
  if (response && typeof response === 'object' && 'success' in response) {
    if (!response.success) {
      throw new Error(
        (response as any).error || 'Failed to cancel subscription'
      );
    }
  }
}

/**
 * Get Stripe Customer Portal URL for managing payment methods
 */
export async function getCustomerPortalUrl(
  customerId: string,
  returnUrl?: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke(
    'manage-subscription',
    {
      body: { action: 'customer-portal', customerId, returnUrl },
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (error) {
    console.error('Error getting customer portal URL:', error);
    throw new Error(error.message || 'Failed to get customer portal URL');
  }

  // Check response structure
  const response = data?.data || data;
  if (response && typeof response === 'object' && 'url' in response) {
    return (response as any).url;
  }

  throw new Error('Invalid response format from customer portal endpoint');
}
