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
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_DONATIONS') ?? '';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const sig = req.headers.get('stripe-signature') ?? '';
    const bodyText = await req.text();
    const event = stripe.webhooks.constructEvent(bodyText, sig, webhookSecret);

    console.log(`Processing webhook event: ${event.type} (${event.id})`);

    switch (event.type) {
      case 'payment_intent.created':
      case 'payment_intent.requires_action':
      case 'payment_intent.processing':
      case 'payment_intent.succeeded':
      case 'payment_intent.canceled':
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const donationId = pi.metadata?.donation_id;

        if (!donationId) {
          console.warn(`No donation_id in PaymentIntent metadata: ${pi.id}`);
          break;
        }

        // Get donation
        const { data: donation, error: donErr } = await supabase
          .from('donations')
          .select('id, user_id, status')
          .eq('id', donationId)
          .single();

        if (donErr || !donation) {
          console.error(`Donation not found: ${donationId}`, donErr);
          break;
        }

        // Map Stripe PI status to our donation status
        let donationStatus: string = donation.status;
        if (pi.status === 'succeeded') {
          donationStatus = 'completed';
        } else if (pi.status === 'processing') {
          donationStatus = 'processing';
        } else if (pi.status === 'canceled') {
          donationStatus = 'cancelled';
        } else if (
          pi.status === 'requires_payment_method' ||
          pi.status === 'requires_confirmation' ||
          pi.status === 'requires_action'
        ) {
          donationStatus = 'pending';
        } else {
          // failed or other states
          donationStatus = 'failed';
        }

        // Create or update payment_attempt record
        await supabase.from('payment_attempts').upsert(
          {
            donation_id: donationId,
            stripe_payment_intent_id: pi.id,
            amount_cents: pi.amount,
            currency_code: (pi.currency || 'usd').toUpperCase(),
            status: pi.status as any, // Cast to match enum
            stripe_event_id: event.id,
            error_message: pi.last_payment_error?.message || null,
            created_by: donation.user_id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'stripe_payment_intent_id' }
        );

        // Update donation status
        const updateData: any = {
          status: donationStatus,
        };

        if (pi.status === 'succeeded') {
          updateData.completed_at = new Date().toISOString();
        } else if (pi.status === 'canceled') {
          updateData.cancelled_at = new Date().toISOString();
        }

        await supabase
          .from('donations')
          .update(updateData)
          .eq('id', donationId);

        // If payment succeeded, create transaction record (accounting layer)
        if (pi.status === 'succeeded') {
          const chargeId =
            Array.isArray(pi.charges?.data) && pi.charges.data[0]?.id
              ? pi.charges.data[0].id
              : null;

          // Get payment_attempt_id
          const { data: paymentAttempt } = await supabase
            .from('payment_attempts')
            .select('id')
            .eq('stripe_payment_intent_id', pi.id)
            .single();

          await supabase.from('transactions').insert({
            donation_id: donationId,
            payment_attempt_id: paymentAttempt?.id || null,
            user_id: donation.user_id,
            project_id: null, // Will be set when admin allocates
            operation_id: null, // Will be set when admin allocates
            amount_cents: pi.amount_received ?? pi.amount,
            kind: 'payment',
            occurred_at: new Date().toISOString(),
            stripe_charge_id: chargeId,
            stripe_event_id: event.id,
            description: `Donation payment via ${pi.metadata?.payment_method || 'card'}`,
          });

          console.log(`Transaction created for donation ${donationId}`);
        }

        break;
      }

      case 'payment_method.attached': {
        const pm = event.data.object as Stripe.PaymentMethod;
        const customerId = pm.customer as string;

        if (!customerId) break;

        // Find user or partner_org by stripe_customer_id from donations
        const { data: donations } = await supabase
          .from('donations')
          .select('user_id, partner_org_id')
          .eq('stripe_customer_id', customerId)
          .limit(1);

        const userId = donations?.[0]?.user_id || null;
        const partnerOrgId = donations?.[0]?.partner_org_id || null;

        if (!userId && !partnerOrgId) {
          console.warn(`No user/partner_org found for customer ${customerId}`);
          break;
        }

        // Check if payment method already exists
        const { data: existingPM } = await supabase
          .from('payment_methods')
          .select('id')
          .eq('stripe_payment_method_id', pm.id)
          .single();

        if (existingPM) {
          console.log(`Payment method ${pm.id} already exists`);
          break;
        }

        // Save payment method
        const pmData: any = {
          user_id: userId,
          partner_org_id: partnerOrgId,
          stripe_payment_method_id: pm.id,
          type: pm.type as any,
          created_by: userId,
        };

        if (pm.type === 'card' && pm.card) {
          pmData.card_last_4 = pm.card.last4;
          pmData.card_exp_month = pm.card.exp_month;
          pmData.card_exp_year = pm.card.exp_year;
          pmData.billing_address = {
            postal_code: pm.billing_details?.address?.postal_code,
            city: pm.billing_details?.address?.city,
            country: pm.billing_details?.address?.country,
            line1: pm.billing_details?.address?.line1,
            line2: pm.billing_details?.address?.line2,
            state: pm.billing_details?.address?.state,
          };
        } else if (pm.type === 'us_bank_account' && pm.us_bank_account) {
          pmData.bank_name = pm.us_bank_account.bank_name;
          pmData.bank_last_4 = pm.us_bank_account.last4;
        }

        await supabase.from('payment_methods').insert(pmData);

        console.log(`Saved payment method ${pm.id} for customer ${customerId}`);
        break;
      }

      case 'setup_intent.succeeded': {
        // Card successfully collected via SetupIntent - save as payment method
        const si = event.data.object as Stripe.SetupIntent;
        const customerId = si.customer as string;
        const paymentMethodId = si.payment_method as string;

        if (customerId && paymentMethodId) {
          // Set as default payment method in Stripe
          await stripe.customers.update(customerId, {
            invoice_settings: {
              default_payment_method: paymentMethodId,
            },
          });

          // Find user or partner_org
          const { data: donations } = await supabase
            .from('donations')
            .select('user_id, partner_org_id')
            .eq('stripe_customer_id', customerId)
            .limit(1);

          const userId = donations?.[0]?.user_id || null;
          const partnerOrgId = donations?.[0]?.partner_org_id || null;

          if (userId || partnerOrgId) {
            // Mark this payment method as default
            // First, unset all other defaults for this user/org
            if (userId) {
              await supabase
                .from('payment_methods')
                .update({ is_default: false })
                .eq('user_id', userId);
            } else if (partnerOrgId) {
              await supabase
                .from('payment_methods')
                .update({ is_default: false })
                .eq('partner_org_id', partnerOrgId);
            }

            // Set this one as default
            await supabase
              .from('payment_methods')
              .update({ is_default: true })
              .eq('stripe_payment_method_id', paymentMethodId);
          }

          console.log(
            `Set payment method ${paymentMethodId} as default for customer ${customerId}`
          );
        }
        break;
      }

      case 'invoice.paid': {
        // Handle recurring donation subscription payments
        const inv = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId =
          typeof inv.subscription === 'string' ? inv.subscription : null;

        if (!stripeSubscriptionId) break;

        // Find subscription - NOTE: subscriptions table doesn't exist yet in new model
        // We'll need to create this when implementing recurring donations
        console.log(`Invoice paid for subscription: ${stripeSubscriptionId}`);

        // TODO: When subscriptions are implemented, create donation + transaction here
        // For now, just log it
        break;
      }

      case 'customer.balance.funded': {
        // Bank transfer funds received
        const balance = event.data.object as any;
        console.log('Customer balance funded:', {
          customer: balance.customer,
          amount: balance.amount,
          currency: balance.currency,
        });
        // Actual processing happens in payment_intent.succeeded
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
        break;
    }

    return createSuccessResponse({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return createErrorResponse((e as Error).message, 400);
  }
});
