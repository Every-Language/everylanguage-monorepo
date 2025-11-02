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
  amount_cents: number;
  cadence: 'once' | 'monthly';
  mode: 'card' | 'bank_transfer';
  currency?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return createCorsResponse();
  if (req.method !== 'POST')
    return createErrorResponse('Method not allowed', 405);

  try {
    const body = (await req.json()) as Partial<RequestBody>;
    const {
      donor,
      amount_cents,
      cadence,
      mode,
      currency = 'usd',
    } = body as RequestBody;

    if (!donor?.email || !donor?.firstName || !donor?.lastName) {
      return createErrorResponse('Missing donor details', 400);
    }

    if (!amount_cents || amount_cents < 50) {
      return createErrorResponse('Amount must be at least 50 cents', 400);
    }

    if (!cadence || !['once', 'monthly'].includes(cadence)) {
      return createErrorResponse('Cadence must be "once" or "monthly"', 400);
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

    // Parallel optimization: Create/find customer and create partner org in parallel
    const [customer, partnerOrgResult] = await Promise.all([
      (async () => {
        const customers = await stripe.customers.list({
          email: donor.email,
          limit: 1,
        });
        return (
          customers.data[0] ??
          (await stripe.customers.create({
            email: donor.email,
            name: `${donor.firstName} ${donor.lastName}`.trim(),
            phone: donor.phone,
            metadata: { source: 'everylanguage', purpose: 'operations' },
          }))
        );
      })(),
      (async () => {
        // Create individual partner org
        const partnerName = `Donor: ${donor.firstName} ${donor.lastName} (${donor.email})`;
        const { data: existingOrgs } = await supabase
          .from('partner_orgs')
          .select('id')
          .eq('name', partnerName)
          .limit(1);

        let partnerOrgId = existingOrgs?.[0]?.id as string | undefined;
        if (!partnerOrgId) {
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
            throw new Error(`Failed to create partner org: ${orgErr?.message}`);
          }
          partnerOrgId = insOrg.id;
        }
        return partnerOrgId;
      })(),
    ]);

    const partnerOrgId = partnerOrgResult;

    // Create sponsorship record
    const { data: insSpons, error: sErr } = await supabase
      .from('sponsorships')
      .insert({
        partner_org_id: partnerOrgId,
        language_adoption_id: null,
        status: mode === 'bank_transfer' ? 'pledged' : 'interest',
        pledge_one_time_cents: cadence === 'once' ? amount_cents : 0,
        pledge_recurring_cents: cadence === 'monthly' ? amount_cents : 0,
        currency_code: currency.toUpperCase(),
        stripe_customer_id: customer.id,
        payment_method: mode,
        created_by: null,
      })
      .select('id')
      .single();

    if (sErr || !insSpons) {
      console.error('sponsorships insert failed', sErr?.message);
      return createErrorResponse('Failed to create sponsorship', 500);
    }

    const sponsorshipId = insSpons.id as string;

    let clientSecret: string | null = null;
    let paymentIntentId: string | null = null;
    let subscriptionId: string | null = null;

    if (mode === 'card') {
      if (cadence === 'once') {
        // Create one-time PaymentIntent
        const pi = await stripe.paymentIntents.create({
          amount: amount_cents,
          currency: currency,
          customer: customer.id,
          automatic_payment_methods: { enabled: true },
          metadata: {
            purpose: 'operations',
            type: 'one_time',
            sponsorship_id: sponsorshipId,
          },
        });
        clientSecret = pi.client_secret ?? null;
        paymentIntentId = pi.id;
      } else {
        // Create subscription for monthly recurring
        const sub = await stripe.subscriptions.create({
          customer: customer.id,
          items: [
            {
              price_data: {
                currency: currency,
                product_data: {
                  name: 'Monthly Operational Support',
                  description:
                    'Recurring monthly donation for operational costs',
                },
                unit_amount: amount_cents,
                recurring: { interval: 'month' },
              },
              quantity: 1,
            },
          ],
          payment_behavior: 'default_incomplete',
          payment_settings: {
            save_default_payment_method: 'on_subscription',
          },
          expand: ['latest_invoice.payment_intent'],
          metadata: {
            purpose: 'operations',
            type: 'monthly_subscription',
            sponsorship_id: sponsorshipId,
          },
        });
        subscriptionId = sub.id;

        // Extract the subscription's payment intent client secret
        // Handle both expanded object and string ID cases
        const latestInvoice = sub.latest_invoice;

        if (typeof latestInvoice === 'string') {
          // If it's a string, we need to fetch the invoice
          const invoice = await stripe.invoices.retrieve(latestInvoice, {
            expand: ['payment_intent'],
          });
          const paymentIntent = invoice.payment_intent;
          if (typeof paymentIntent === 'object' && paymentIntent !== null) {
            clientSecret = paymentIntent.client_secret ?? null;
          }
        } else if (latestInvoice && typeof latestInvoice === 'object') {
          // If it's already expanded
          const paymentIntent = (latestInvoice as Stripe.Invoice)
            .payment_intent;
          if (typeof paymentIntent === 'object' && paymentIntent !== null) {
            clientSecret =
              (paymentIntent as Stripe.PaymentIntent).client_secret ?? null;
          }
        }

        if (!clientSecret) {
          throw new Error('Failed to get client secret from subscription');
        }
      }
    }

    // Update sponsorship with Stripe IDs
    const { error: updErr } = await supabase
      .from('sponsorships')
      .update({
        stripe_customer_id: customer.id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_subscription_id: subscriptionId,
        status: mode === 'bank_transfer' ? 'pledged' : 'active',
      })
      .eq('id', sponsorshipId);

    if (updErr) {
      console.error('sponsorships update failed', updErr.message);
      return createErrorResponse('Failed to update sponsorship', 500);
    }

    return createSuccessResponse({
      clientSecret,
      customerId: customer.id,
      sponsorshipId,
      subscriptionId,
      partnerOrgId,
    });
  } catch (e) {
    console.error('create-donation-checkout error', e);
    return createErrorResponse((e as Error).message, 500);
  }
});
