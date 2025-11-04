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

const BANK_TRANSFER_EXPIRY_DAYS = 7;

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

    // Fetch language adoptions with stripe_product_id
    const { data: adoptions, error: aErr } = await supabase
      .from('language_adoptions')
      .select(
        'id, language_entity_id, estimated_budget_cents, deposit_percent, recurring_months, stripe_product_id, language_entities(name)'
      )
      .in('id', adoptionIds);

    if (aErr) {
      return createErrorResponse(
        `DB error (language_adoptions): ${aErr.message}`,
        500
      );
    }

    // Verify all adoptions have stripe_product_id
    const missingProducts = (adoptions ?? []).filter(a => !a.stripe_product_id);
    if (missingProducts.length > 0) {
      const missingIds = missingProducts.map(a => a.id).join(', ');
      return createErrorResponse(
        `Some adoptions are missing Stripe products. Please contact support. IDs: ${missingIds}`,
        500
      );
    }

    // Calculate costs and build subscription items using pre-created products
    let depositTotal = 0;
    const subscriptionItems: { price_data: any; quantity: number }[] = [];
    const adoptionSummaries: {
      id: string;
      name: string | null;
      depositCents: number;
      recurringCents: number;
    }[] = [];

    for (const a of adoptions ?? []) {
      const depositPercent = a.deposit_percent ?? globalDeposit;
      const months = a.recurring_months ?? globalMonths;
      const budget = Math.max(0, a.estimated_budget_cents ?? 0);
      const deposit = Math.round(budget * depositPercent);
      const recurring = Math.max(
        0,
        Math.round((budget - deposit) / Math.max(1, months))
      );

      depositTotal += deposit;
      adoptionSummaries.push({
        id: a.id,
        name: (a as any).language_entities?.name ?? null,
        depositCents: deposit,
        recurringCents: recurring,
      });

      // Build subscription items using pre-created stripe_product_id
      if (mode === 'card' && recurring > 0) {
        subscriptionItems.push({
          price_data: {
            currency: 'usd',
            product: a.stripe_product_id, // Use pre-created product ID
            unit_amount: recurring,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        });
      }
    }

    // Create sponsorships for each adoption
    const sponsorshipInserts = adoptionIds.map(id => ({
      partner_org_id: finalPartnerOrgId,
      language_adoption_id: id,
      status: mode === 'bank_transfer' ? 'pending_bank_transfer' : 'interest',
      pledge_one_time_cents: depositTotal,
      pledge_recurring_cents: subscriptionItems.reduce(
        (s, i) => s + (i.price_data?.unit_amount ?? 0),
        0
      ),
      currency_code: 'USD',
      stripe_customer_id: customer.id,
      payment_method: mode,
      created_by: null,
    }));

    const { data: sponsorships, error: sErr } = await supabase
      .from('sponsorships')
      .insert(sponsorshipInserts)
      .select('id');

    if (sErr || !sponsorships) {
      console.error('sponsorships insert failed', sErr?.message);
      return createErrorResponse('Failed to create sponsorships', 500);
    }

    const sponsorshipIds = sponsorships.map(s => s.id);
    const primarySponsorshipId = sponsorshipIds[0];

    let depositClientSecret: string | null = null;
    let subscriptionClientSecret: string | null = null;
    let paymentIntentId: string | null = null;
    let subscriptionId: string | null = null;

    if (mode === 'card') {
      // Parallelize deposit PaymentIntent and subscription creation
      const stripeOperations = [];

      // Create deposit PaymentIntent
      if (depositTotal > 0) {
        stripeOperations.push(
          stripe.paymentIntents.create({
            amount: depositTotal,
            currency: 'usd',
            customer: customer.id,
            automatic_payment_methods: { enabled: true },
            metadata: {
              purpose: 'adoption',
              type: 'deposit',
              sponsorship_id: primarySponsorshipId,
            },
          })
        );
      }

      // Create subscription for recurring (starts billing next month after deposit)
      if (subscriptionItems.length > 0) {
        // Calculate billing start date (first day of next month)
        const billingStart = new Date();
        billingStart.setMonth(billingStart.getMonth() + 1);
        billingStart.setDate(1);
        billingStart.setHours(0, 0, 0, 0);

        stripeOperations.push(
          stripe.subscriptions.create({
            customer: customer.id,
            items: subscriptionItems,
            // Start billing next month, no immediate payment required
            billing_cycle_anchor: Math.floor(billingStart.getTime() / 1000),
            proration_behavior: 'none',
            payment_settings: {
              save_default_payment_method: 'on_subscription',
            },
            metadata: {
              purpose: 'adoption',
              sponsorship_id: primarySponsorshipId,
            },
          })
        );
      }

      // Execute Stripe operations in parallel
      const results = await Promise.all(stripeOperations);

      // Extract results based on what operations were performed
      let resultIndex = 0;
      if (depositTotal > 0) {
        const pi = results[resultIndex] as Stripe.PaymentIntent;
        depositClientSecret = pi.client_secret ?? null;
        paymentIntentId = pi.id;
        resultIndex++;
      }
      if (subscriptionItems.length > 0) {
        const sub = results[resultIndex] as Stripe.Subscription;
        subscriptionId = sub.id;
        subscriptionClientSecret = null;
      }
    } else if (mode === 'bank_transfer') {
      // Set adoptions to on_hold with expiry
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + BANK_TRANSFER_EXPIRY_DAYS);

      await supabase
        .from('language_adoptions')
        .update({
          status: 'on_hold',
          bank_transfer_expiry_at: expiryDate.toISOString(),
        })
        .in('id', adoptionIds);
    }

    // Update sponsorships with Stripe IDs
    await supabase
      .from('sponsorships')
      .update({
        stripe_customer_id: customer.id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_subscription_id: subscriptionId,
        status: mode === 'bank_transfer' ? 'pending_bank_transfer' : 'active',
      })
      .in('id', sponsorshipIds);

    return createSuccessResponse({
      clientSecret: subscriptionClientSecret ?? depositClientSecret,
      depositClientSecret,
      subscriptionClientSecret,
      customerId: customer.id,
      sponsorshipIds,
      subscriptionId,
      partnerOrgId: finalPartnerOrgId,
      adoptionSummaries,
    });
  } catch (e) {
    console.error('create-adoption-checkout error', e);
    return createErrorResponse((e as Error).message, 500);
  }
});
