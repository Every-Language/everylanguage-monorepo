import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';

interface RequestBody {
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
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return createCorsResponse();
  if (req.method !== 'POST')
    return createErrorResponse('Method not allowed', 405);

  try {
    const body = (await req.json()) as Partial<RequestBody>;
    const {
      donor,
      adoptionIds = [],
      mode,
      partnerOrgId,
      newPartnerOrg,
      orgMode = 'individual',
    } = body as RequestBody;

    if (!donor?.email || !donor?.firstName || !donor?.lastName) {
      return createErrorResponse('Missing donor details', 400);
    }

    if (!adoptionIds || adoptionIds.length === 0) {
      return createErrorResponse('adoptionIds required', 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    if (!stripeKey) {
      console.error('Missing STRIPE_SECRET_KEY');
      return createErrorResponse('Server misconfigured', 500);
    }
    const stripe = new Stripe(stripeKey, {
      httpClient: Stripe.createFetchHttpClient(),
      apiVersion: '2023-10-16',
    });

    // Parallel optimization: Fetch settings, create customer, and handle partner org
    const [settingsResult, customer, partnerOrgIdResult] = await Promise.all([
      supabase
        .from('funding_settings')
        .select('deposit_percent,recurring_months')
        .limit(1),
      (async () => {
        const customers = await stripe.customers.list({
          email: donor.email,
          limit: 1,
        });
        const existingCustomer = customers.data[0];

        // Check for currency mismatch with existing customer
        if (existingCustomer) {
          // Check if customer has any existing charges/subscriptions
          const [charges, subs] = await Promise.all([
            stripe.charges.list({ customer: existingCustomer.id, limit: 1 }),
            stripe.subscriptions.list({
              customer: existingCustomer.id,
              limit: 1,
            }),
          ]);

          const existingCurrency =
            charges.data[0]?.currency || subs.data[0]?.currency;
          if (existingCurrency && existingCurrency !== 'usd') {
            throw new Error(
              `This account has existing transactions in ${existingCurrency.toUpperCase()}. ` +
                `Please contact support to process donations in a different currency.`
            );
          }
          return existingCustomer;
        }

        return await stripe.customers.create({
          email: donor.email,
          name: `${donor.firstName} ${donor.lastName}`.trim(),
          phone: donor.phone,
          metadata: { source: 'everylanguage', purpose: 'adoption' },
        });
      })(),
      (async () => {
        // Handle partner org creation/selection
        if (orgMode === 'existing' && partnerOrgId) {
          return partnerOrgId;
        } else if (orgMode === 'new' && newPartnerOrg) {
          const { data: insOrg, error: orgErr } = await supabase
            .from('partner_orgs')
            .insert({
              name: newPartnerOrg.name,
              description: newPartnerOrg.description ?? '',
              is_individual: false,
              is_public: newPartnerOrg.isPublic,
              created_by: null,
            })
            .select('id')
            .single();
          if (orgErr || !insOrg) {
            throw new Error(`Failed to create partner org: ${orgErr?.message}`);
          }
          return insOrg.id;
        } else {
          // Individual donor - create private individual partner org
          const partnerName = `Donor: ${donor.firstName} ${donor.lastName} (${donor.email})`;
          const { data: existingOrgs } = await supabase
            .from('partner_orgs')
            .select('id')
            .eq('name', partnerName)
            .limit(1);

          let orgId = existingOrgs?.[0]?.id as string | undefined;
          if (!orgId) {
            const { data: insOrg, error: orgErr } = await supabase
              .from('partner_orgs')
              .insert({
                name: partnerName,
                description: 'Individual donor',
                is_individual: true,
                is_public: false,
                created_by: null,
              })
              .select('id')
              .single();
            if (orgErr || !insOrg) {
              throw new Error(
                `Failed to create partner org: ${orgErr?.message}`
              );
            }
            orgId = insOrg.id;
          }
          return orgId;
        }
      })(),
    ]);

    if (settingsResult.error) {
      return createErrorResponse(
        `DB error (funding_settings): ${settingsResult.error.message}`,
        500
      );
    }

    const globalDeposit = settingsResult.data?.[0]?.deposit_percent ?? 0.2;
    const globalMonths = settingsResult.data?.[0]?.recurring_months ?? 12;
    const finalPartnerOrgId = partnerOrgIdResult;

    // Fetch language adoptions
    const { data: adoptions, error: aErr } = await supabase
      .from('language_adoptions')
      .select(
        'id, language_entity_id, estimated_budget_cents, deposit_percent, language_entities(name)'
      )
      .in('id', adoptionIds);

    if (aErr) {
      return createErrorResponse(
        `DB error (language_adoptions): ${aErr.message}`,
        500
      );
    }

    // Calculate deposit amounts for each adoption
    const adoptionSummaries: {
      id: string;
      name: string | null;
      depositCents: number;
      estimatedBudget: number;
    }[] = [];

    let depositTotal = 0;

    for (const a of adoptions ?? []) {
      const depositPercent = a.deposit_percent ?? globalDeposit;
      const budget = Math.max(0, a.estimated_budget_cents ?? 0);
      const deposit = Math.round(budget * depositPercent);

      depositTotal += deposit;
      adoptionSummaries.push({
        id: a.id,
        name: (a as any).language_entities?.name ?? null,
        depositCents: deposit,
        estimatedBudget: budget,
      });
    }

    // Create language_adoption_sponsorships for each adoption
    const sponsorshipInserts = adoptionIds.map((id, idx) => ({
      partner_org_id: finalPartnerOrgId,
      language_adoption_id: id,
      deposit_amount_cents: adoptionSummaries[idx].depositCents,
      currency_code: 'USD',
      payment_method: mode,
      stripe_customer_id: customer.id,
      created_by: null,
    }));

    const { data: sponsorships, error: sErr } = await supabase
      .from('language_adoption_sponsorships')
      .insert(sponsorshipInserts)
      .select('id');

    if (sErr || !sponsorships) {
      console.error(
        'language_adoption_sponsorships insert failed',
        sErr?.message
      );
      return createErrorResponse('Failed to create sponsorships', 500);
    }

    const sponsorshipIds = sponsorships.map(s => s.id);
    const primarySponsorshipId = sponsorshipIds[0];

    let clientSecret: string | null = null;
    let setupIntentClientSecret: string | null = null;
    let paymentIntentId: string | null = null;
    let setupIntentId: string | null = null;

    if (mode === 'card') {
      // Card payment: create PaymentIntent with setup_future_usage to save payment method
      if (depositTotal > 0) {
        const pi = await stripe.paymentIntents.create({
          amount: depositTotal,
          currency: 'usd',
          customer: customer.id,
          automatic_payment_methods: { enabled: true },
          setup_future_usage: 'off_session', // Save payment method for future project top-ups
          metadata: {
            purpose: 'language_adoption_deposit',
            language_adoption_sponsorship_id: primarySponsorshipId,
          },
        });
        clientSecret = pi.client_secret ?? null;
        paymentIntentId = pi.id;
      }
    } else if (mode === 'bank_transfer') {
      // Bank transfer: create PaymentIntent with customer_balance
      if (depositTotal > 0) {
        const pi = await stripe.paymentIntents.create({
          amount: depositTotal,
          currency: 'usd',
          customer: customer.id,
          payment_method_types: ['customer_balance'],
          payment_method_data: {
            type: 'customer_balance',
          },
          payment_method_options: {
            customer_balance: {
              funding_type: 'bank_transfer',
              bank_transfer: {
                type: 'us_bank_account',
              },
            },
          },
          metadata: {
            purpose: 'language_adoption_deposit',
            language_adoption_sponsorship_id: primarySponsorshipId,
            payment_method: 'bank_transfer',
          },
        });
        clientSecret = pi.client_secret ?? null;
        paymentIntentId = pi.id;

        // Also create SetupIntent to collect card for future project top-ups
        const si = await stripe.setupIntents.create({
          customer: customer.id,
          payment_method_types: ['card'],
          metadata: {
            purpose: 'language_adoption_future_payments',
            language_adoption_sponsorship_id: primarySponsorshipId,
          },
        });
        setupIntentClientSecret = si.client_secret ?? null;
        setupIntentId = si.id;
      }
    }

    // Update sponsorships with Stripe IDs
    await supabase
      .from('language_adoption_sponsorships')
      .update({
        stripe_payment_intent_id: paymentIntentId,
        stripe_setup_intent_id: setupIntentId,
      })
      .in('id', sponsorshipIds);

    // Don't update language_adoptions status yet - that happens in webhook when payment succeeds

    return createSuccessResponse({
      clientSecret,
      setupIntentClientSecret, // For bank transfer card collection
      paymentIntentId,
      setupIntentId,
      customerId: customer.id,
      sponsorshipIds,
      partnerOrgId: finalPartnerOrgId,
      adoptionSummaries,
    });
  } catch (e) {
    console.error('create-adoption-checkout error', e);
    return createErrorResponse((e as Error).message, 500);
  }
});
