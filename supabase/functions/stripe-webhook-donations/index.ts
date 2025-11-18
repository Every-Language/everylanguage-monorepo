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

  // Allow GET for health check / debugging
  if (req.method === 'GET') {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
    return createSuccessResponse({
      status: 'ok',
      hasWebhookSecret: !!webhookSecret,
      webhookSecretLength: webhookSecret.length,
      endpoint: 'stripe-webhook-donations',
    });
  }

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

    // Log webhook attempt for debugging
    console.log('Webhook received:', {
      hasSignature: !!sig,
      signatureLength: sig.length,
      bodyLength: bodyText.length,
      hasWebhookSecret: !!webhookSecret,
      webhookSecretLength: webhookSecret.length,
      webhookSecretPrefix: webhookSecret.substring(0, 10) + '...',
    });

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not set!');
      return createErrorResponse(
        'Webhook secret not configured',
        500,
        'STRIPE_WEBHOOK_SECRET environment variable is missing'
      );
    }

    if (!sig) {
      console.error('Missing stripe-signature header');
      return createErrorResponse(
        'Missing signature',
        400,
        'stripe-signature header is required'
      );
    }

    let event: Stripe.Event;
    try {
      // Use constructEventAsync for Deno Edge Functions (async crypto required)
      event = await stripe.webhooks.constructEventAsync(
        bodyText,
        sig,
        webhookSecret
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', {
        error: errorMessage,
        signatureLength: sig.length,
        bodyLength: bodyText.length,
        webhookSecretLength: webhookSecret.length,
      });
      return createErrorResponse(
        `Webhook signature verification failed: ${errorMessage}`,
        400,
        'Check that STRIPE_WEBHOOK_SECRET matches the webhook endpoint secret'
      );
    }

    console.log(`Processing webhook event: ${event.type} (${event.id})`);

    switch (event.type) {
      case 'payment_intent.created':
      case 'payment_intent.requires_action':
      case 'payment_intent.processing':
      case 'payment_intent.succeeded':
      case 'payment_intent.canceled':
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;

        // Get all donation IDs from metadata (support both single and multiple)
        const donationIdsStr =
          pi.metadata?.donation_ids || pi.metadata?.donation_id;
        if (!donationIdsStr) {
          console.warn(
            `No donation_id or donation_ids in PaymentIntent metadata: ${pi.id}`
          );
          break;
        }

        // Parse donation IDs (comma-separated if multiple, or single)
        const donationIds = donationIdsStr
          .split(',')
          .map((id: string) => id.trim())
          .filter(Boolean);

        if (donationIds.length === 0) {
          console.warn(
            `No valid donation IDs found in PaymentIntent metadata: ${pi.id}`
          );
          break;
        }

        // Get all donations linked to this PaymentIntent
        const { data: donations, error: donErr } = await supabase
          .from('donations')
          .select('id, user_id, status')
          .in('id', donationIds);

        if (donErr || !donations || donations.length === 0) {
          console.error(
            `Donations not found for IDs: ${donationIds.join(', ')}`,
            donErr
          );
          break;
        }

        // Map Stripe PI status to our donation status
        let donationStatus: string;
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

        // Get charge ID if available
        const chargeId =
          Array.isArray(pi.charges?.data) && pi.charges.data[0]?.id
            ? pi.charges.data[0].id
            : null;

        // Create or update payment_attempt record
        // Note: payment_attempts has unique constraint on stripe_payment_intent_id,
        // so there can only be ONE payment_attempt per PaymentIntent
        // We'll link it to the first donation, but update all donations' status
        const primaryDonation = donations[0];
        const paymentAttemptData: any = {
          donation_id: primaryDonation.id,
          stripe_payment_intent_id: pi.id,
          amount_cents: pi.amount, // Total amount (will be allocated if needed)
          currency_code: (pi.currency ?? 'usd').toUpperCase(),
          status: pi.status as any, // Cast to match enum
          stripe_event_id: event.id,
        };

        // Set succeeded_at or failed_at based on status
        if (pi.status === 'succeeded') {
          paymentAttemptData.succeeded_at = new Date().toISOString();
          paymentAttemptData.amount_received_cents =
            pi.amount_received ?? pi.amount;
        } else if (pi.status === 'failed') {
          paymentAttemptData.failed_at = new Date().toISOString();
          paymentAttemptData.failure_message =
            pi.last_payment_error?.message ?? null;
          paymentAttemptData.failure_code = pi.last_payment_error?.code ?? null;
        }

        if (chargeId) {
          paymentAttemptData.stripe_charge_id = chargeId;
        }

        // Upsert payment attempt (unique constraint on stripe_payment_intent_id)
        await supabase.from('payment_attempts').upsert(paymentAttemptData, {
          onConflict: 'stripe_payment_intent_id',
        });

        // Update all donations' status
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
          .in(
            'id',
            donations.map((d: { id: string }) => d.id)
          );

        // If payment succeeded, create transaction records (accounting layer) for each donation
        if (pi.status === 'succeeded') {
          // Get the payment_attempt we just created
          const { data: paymentAttempt } = await supabase
            .from('payment_attempts')
            .select('id')
            .eq('stripe_payment_intent_id', pi.id)
            .single();

          const paymentAttemptId = paymentAttempt?.id ?? null;

          // Create transaction for each donation
          // Note: All transactions share the same payment_attempt_id since there's only one per PaymentIntent
          for (const donation of donations) {
            await supabase.from('transactions').insert({
              donation_id: donation.id,
              payment_attempt_id: paymentAttemptId,
              user_id: donation.user_id,
              project_id: null, // Will be set when admin allocates
              operation_id: null, // Will be set when admin allocates
              amount_cents: pi.amount_received ?? pi.amount, // Total amount (will be allocated)
              kind: 'payment',
              occurred_at: new Date().toISOString(),
              stripe_charge_id: chargeId,
              stripe_event_id: event.id,
              description: `Donation payment via ${pi.metadata?.payment_method ?? 'card'}`,
            });

            console.log(`Transaction created for donation ${donation.id}`);
          }
        }

        console.log(
          `Processed ${donations.length} donation(s) for PaymentIntent ${pi.id}`
        );
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

        const userId = donations?.[0]?.user_id ?? null;
        const partnerOrgId = donations?.[0]?.partner_org_id ?? null;

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

          const userId = donations?.[0]?.user_id ?? null;
          const partnerOrgId = donations?.[0]?.partner_org_id ?? null;

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
    const errorMessage = e instanceof Error ? e.message : String(e);
    const errorStack = e instanceof Error ? e.stack : undefined;
    console.error('Webhook error:', {
      message: errorMessage,
      stack: errorStack,
      error: e,
    });
    return createErrorResponse(
      `Webhook processing error: ${errorMessage}`,
      400
    );
  }
});
