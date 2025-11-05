import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createCorsResponse,
  createErrorResponse,
  createSuccessResponse,
} from '../_shared/response-utils.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return createCorsResponse();
  if (req.method !== 'POST')
    return createErrorResponse('Method not allowed', 405);

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: '2023-10-16',
  });
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const sig = req.headers.get('stripe-signature') ?? '';
    const bodyText = await req.text();
    const event = stripe.webhooks.constructEvent(bodyText, sig, webhookSecret);

    // Upsert stripe_events for idempotency/audit
    await supabase.from('stripe_events').upsert(
      {
        id: event.id,
        type: event.type,
        payload: event as any,
        processed_at: new Date().toISOString(),
        success: true,
      },
      { onConflict: 'id' }
    );

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const purpose = pi.metadata?.purpose;
        const langAdoptionSponsorshipId =
          pi.metadata?.language_adoption_sponsorship_id;
        const paymentMethod = pi.metadata?.payment_method || 'card';

        if (
          purpose === 'language_adoption_deposit' &&
          langAdoptionSponsorshipId
        ) {
          // Language adoption initial deposit
          const { data: sponsorship } = await supabase
            .from('language_adoption_sponsorships')
            .select('language_adoption_id, partner_org_id')
            .eq('id', langAdoptionSponsorshipId)
            .single();

          if (sponsorship) {
            // Create contribution record (project_id will be set by trigger when allocated)
            await supabase.from('contributions').insert({
              language_adoption_sponsorship_id: langAdoptionSponsorshipId,
              language_adoption_id: sponsorship.language_adoption_id,
              project_id: null, // Will be set by allocate_deposit_to_projects trigger
              amount_cents: pi.amount_received ?? pi.amount,
              currency_code: (pi.currency || 'usd').toUpperCase(),
              occurred_at: new Date().toISOString(),
              kind: 'initial_deposit',
              stripe_payment_intent_id: pi.id,
              stripe_charge_id:
                Array.isArray(pi.charges?.data) && pi.charges.data[0]?.id
                  ? pi.charges.data[0].id
                  : null,
            });

            // Update sponsorship with deposit_paid_at timestamp
            await supabase
              .from('language_adoption_sponsorships')
              .update({ deposit_paid_at: new Date().toISOString() })
              .eq('id', langAdoptionSponsorshipId);

            // Update language_adoption status to deposit_paid
            await supabase
              .from('language_adoptions')
              .update({ status: 'deposit_paid' })
              .eq('id', sponsorship.language_adoption_id);
          }
        } else if (purpose === 'project_top_up') {
          // Project balance top-up (manual one-time contribution)
          const projectId = pi.metadata?.project_id;
          const langAdoptionSponsorshipId =
            pi.metadata?.language_adoption_sponsorship_id;

          await supabase.from('contributions').insert({
            language_adoption_sponsorship_id: langAdoptionSponsorshipId || null,
            project_id: projectId || null,
            amount_cents: pi.amount_received ?? pi.amount,
            currency_code: (pi.currency || 'usd').toUpperCase(),
            occurred_at: new Date().toISOString(),
            kind: 'manual_top_up',
            stripe_payment_intent_id: pi.id,
            stripe_charge_id:
              Array.isArray(pi.charges?.data) && pi.charges.data[0]?.id
                ? pi.charges.data[0].id
                : null,
          });
        } else {
          // Operational donation (general support)
          const userId = pi.metadata?.user_id;

          await supabase.from('contributions').insert({
            user_id: userId || null,
            project_id: null,
            amount_cents: pi.amount_received ?? pi.amount,
            currency_code: (pi.currency || 'usd').toUpperCase(),
            occurred_at: new Date().toISOString(),
            kind: 'one_time',
            stripe_payment_intent_id: pi.id,
            stripe_charge_id:
              Array.isArray(pi.charges?.data) && pi.charges.data[0]?.id
                ? pi.charges.data[0].id
                : null,
          });
        }
        break;
      }

      case 'setup_intent.succeeded': {
        // Card successfully collected - save as default payment method
        const si = event.data.object as Stripe.SetupIntent;
        const customerId = si.customer as string;
        const paymentMethodId = si.payment_method as string;

        if (customerId && paymentMethodId) {
          await stripe.customers.update(customerId, {
            invoice_settings: {
              default_payment_method: paymentMethodId,
            },
          });
          console.log(
            `Saved payment method ${paymentMethodId} for customer ${customerId}`
          );
        }
        break;
      }

      case 'invoice.paid': {
        // Handle subscription payments (operational or project top-up)
        const inv = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId =
          typeof inv.subscription === 'string' ? inv.subscription : null;

        if (stripeSubscriptionId) {
          // Find subscription record
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('stripe_subscription_id', stripeSubscriptionId)
            .single();

          if (subscription) {
            // Create contribution for this subscription payment
            await supabase.from('contributions').insert({
              subscription_id: subscription.id,
              user_id: subscription.user_id || null,
              project_id: subscription.project_id || null,
              language_adoption_sponsorship_id:
                subscription.language_adoption_sponsorship_id || null,
              amount_cents: inv.amount_paid ?? inv.amount_due ?? 0,
              currency_code: (inv.currency || 'usd').toUpperCase(),
              occurred_at: new Date().toISOString(),
              kind:
                subscription.subscription_type === 'operational'
                  ? 'subscription'
                  : 'subscription_top_up',
              stripe_invoice_id: inv.id,
              stripe_subscription_id: stripeSubscriptionId,
            });
          } else {
            console.warn(
              `No subscription record found for stripe_subscription_id: ${stripeSubscriptionId}`
            );
          }
        }
        break;
      }

      case 'customer.balance.funded': {
        // Bank transfer funds received - logged for audit, actual processing happens in payment_intent.succeeded
        const balance = event.data.object as any;
        console.log('Customer balance funded:', {
          customer: balance.customer,
          amount: balance.amount,
          currency: balance.currency,
        });
        break;
      }

      default:
        // no-op for other event types
        break;
    }

    return createSuccessResponse({ received: true });
  } catch (e) {
    // Try to log failed event
    try {
      const text = await req.text().catch(() => '');
      await supabase.from('stripe_events').upsert({
        id: crypto.randomUUID(),
        type: 'unknown',
        payload: { error: (e as Error).message, body: text },
        processed_at: new Date().toISOString(),
        success: false,
        error_message: (e as Error).message,
      });
    } catch (e) {
      console.error('Error logging failed event:', e);
    }
    return createErrorResponse((e as Error).message, 400);
  }
});
