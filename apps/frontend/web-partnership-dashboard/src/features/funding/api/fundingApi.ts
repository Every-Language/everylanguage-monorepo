import { supabase } from '@/shared/services/supabase';
export interface PublicAdoptionRow {
  id: string;
  language_entity_id: string | null;
  language_name?: string | null;
  estimated_budget_cents: number | null;
  currency_code?: string | null;
  status: 'draft' | 'available' | 'on_hold' | 'funded' | 'archived' | null;
}

export async function listAvailableLanguages(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const statusFilter = (params?.status ??
    'available') as PublicAdoptionRow['status'];
  const limit = params?.limit ?? 100;
  const offset = params?.offset ?? 0;

  const query = (supabase as any)
    .from('language_adoptions')
    .select(
      'id, language_entity_id, estimated_budget_cents, status, language_entities(name)'
    )
    .eq('status', statusFilter as any)
    .order('estimated_budget_cents', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error)
    throw new Error(error.message || 'Failed to list available languages');

  const items: PublicAdoptionRow[] = (data ?? []).map((row: any) => ({
    id: row.id,
    language_entity_id: row.language_entity_id,
    language_name: row.language_entities?.name ?? null,
    estimated_budget_cents: row.estimated_budget_cents ?? null,
    status: row.status ?? null,
  }));
  return items;
}

export async function createLead(payload: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  intent: 'ops' | 'adopt';
  languageIds?: string[];
}) {
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
  const body = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    source: payload.intent,
  };
  // Non-blocking CRM intake
  fetch(`${base}/crm-lead-intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => undefined);
  return { ok: true };
}

// API methods

export async function calculateAdoptionCosts(adoptionIds: string[]) {
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
  const res = await fetch(`${base}/calculate-adoption-costs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adoptionIds }),
  });
  if (!res.ok) {
    const message = await res.text().catch(() => 'Failed to calculate costs');
    throw new Error(message);
  }
  const json = await res.json();
  const data =
    json && typeof json === 'object' && 'data' in json
      ? (json as any).data
      : json;
  return data as {
    languages: Array<{
      id: string;
      name: string | null;
      depositCents: number;
      recurringCents: number;
      totalCents: number;
      months: number;
    }>;
    depositTotalCents: number;
    monthlyTotalCents: number;
    recurringMonths: number;
    totalCommitmentCents: number;
    summary: {
      totalDeposit: number;
      totalMonthly: number;
      months: number;
      totalCommitment: number;
    };
  };
}

export async function searchPartnerOrgs(query: string, limit = 10) {
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
  const res = await fetch(`${base}/search-partner-orgs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  });
  if (!res.ok) {
    const message = await res
      .text()
      .catch(() => 'Failed to search organizations');
    throw new Error(message);
  }
  const json = await res.json();
  const data =
    json && typeof json === 'object' && 'data' in json
      ? (json as any).data
      : json;
  return data as {
    results: Array<{
      id: string;
      name: string;
      description: string | null;
      similarityScore: number;
    }>;
  };
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
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

  const res = await fetch(`${base}/create-donation-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let message = 'Failed to create donation checkout';
    try {
      const j = await res.json();
      if (j?.error) message = j.error;
      if (j?.details) console.error('Error details:', j.details);
    } catch (e) {
      console.error('Failed to parse error response', e);
    }
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

export async function createAdoptionCheckout(payload: {
  donor: { firstName: string; lastName: string; email: string; phone?: string };
  adoptionIds: string[];
  mode: 'card' | 'bank_transfer';
  partnerOrgId?: string;
  newPartnerOrg?: {
    name: string;
    description?: string;
    isPublic: boolean;
  };
  orgMode?: 'individual' | 'existing' | 'new';
}) {
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
  const res = await fetch(`${base}/create-adoption-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let message = 'Failed to create adoption checkout';
    try {
      const j = await res.json();
      if (j?.error) message = j.error;
      if (j?.details) console.error('Error details:', j.details);
    } catch (e) {
      console.error('Failed to parse error response', e);
    }
    throw new Error(message);
  }
  const json = await res.json();
  const data =
    json && typeof json === 'object' && 'data' in json
      ? (json as any).data
      : json;
  return data as {
    clientSecret: string | null;
    depositClientSecret: string | null;
    subscriptionClientSecret: string | null;
    setupIntentClientSecret?: string | null; // For bank transfer card collection
    paymentIntentId?: string | null;
    setupIntentId?: string | null;
    customerId: string;
    sponsorshipIds: string[];
    subscriptionId?: string | null;
    partnerOrgId: string;
    adoptionSummaries: Array<{
      id: string;
      name: string | null;
      depositCents: number;
      recurringCents: number;
    }>;
  };
}
