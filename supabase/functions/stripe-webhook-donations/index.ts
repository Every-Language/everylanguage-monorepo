import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@14.25.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
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
        // Stripe deprecated charges property, use latest_charge instead
        const chargeId =
          typeof pi.latest_charge === 'string'
            ? pi.latest_charge
            : ((pi.latest_charge as any)?.id ?? null);

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
        // Note: PaymentIntent status doesn't include 'failed', but we handle payment_failed event
        if (pi.status === 'succeeded') {
          paymentAttemptData.succeeded_at = new Date().toISOString();
          paymentAttemptData.amount_received_cents =
            pi.amount_received ?? pi.amount;
        } else if (
          event.type === 'payment_intent.payment_failed' ||
          pi.last_payment_error
        ) {
          paymentAttemptData.failed_at = new Date().toISOString();
          paymentAttemptData.failure_message =
            pi.last_payment_error?.message ?? null;
          paymentAttemptData.failure_code = pi.last_payment_error?.code ?? null;
        }

        if (chargeId) {
          paymentAttemptData.stripe_charge_id = chargeId;
        }

        // Update payment_attempt with stripe_customer_id if not already set
        // Get customer ID from Stripe PaymentIntent
        if (pi.customer && typeof pi.customer === 'string') {
          paymentAttemptData.stripe_customer_id = pi.customer;
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

        // Payment succeeded - no need to create transactions
        // All financial tracking is done via donations, payment_attempts, and donation_allocations
        if (pi.status === 'succeeded') {
          console.log(
            `Payment succeeded for ${donations.length} donation(s) via PaymentIntent ${pi.id}`
          );
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

        // Find user or partner_org by stripe_customer_id from payment_attempts
        // stripe_customer_id is now in payment_attempts (payment provider layer)
        const { data: paymentAttempts } = await supabase
          .from('payment_attempts')
          .select('donation_id, donations!inner(user_id, partner_org_id)')
          .eq('stripe_customer_id', customerId)
          .limit(1);

        // donations is an array due to the join, so we need to access the first element
        const donationsArray = paymentAttempts?.[0]?.donations as
          | Array<{ user_id: string | null; partner_org_id: string | null }>
          | undefined;
        const donation = donationsArray?.[0];

        const userId = donation?.user_id ?? null;
        const partnerOrgId = donation?.partner_org_id ?? null;

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

          // Find user or partner_org by stripe_customer_id from payment_attempts
          const { data: paymentAttempts } = await supabase
            .from('payment_attempts')
            .select('donation_id, donations!inner(user_id, partner_org_id)')
            .eq('stripe_customer_id', customerId)
            .limit(1);

          // donations is an array due to the join, so we need to access the first element
          const donationsArray = paymentAttempts?.[0]?.donations as
            | Array<{ user_id: string | null; partner_org_id: string | null }>
            | undefined;
          const donation = donationsArray?.[0];

          const userId = donation?.user_id ?? null;
          const partnerOrgId = donation?.partner_org_id ?? null;

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
        // Handle subscription payment invoices (both initial and recurring)
        const inv = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId =
          typeof inv.subscription === 'string' ? inv.subscription : null;

        if (!stripeSubscriptionId) break;

        // Find subscription record
        const { data: subscription, error: subErr } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('stripe_subscription_id', stripeSubscriptionId)
          .single();

        if (subErr || !subscription) {
          console.error(
            `Subscription not found for Stripe subscription ID: ${stripeSubscriptionId}`,
            subErr
          );
          break;
        }

        // Get payment_intent from invoice
        const paymentIntentId =
          typeof inv.payment_intent === 'string' ? inv.payment_intent : null;

        if (!paymentIntentId) {
          console.warn(
            `No payment_intent found in invoice ${inv.id} for subscription ${stripeSubscriptionId}`
          );
          break;
        }

        // Check billing_reason to differentiate initial payment vs recurring payment
        const isInitialPayment = inv.billing_reason === 'subscription_create';

        if (isInitialPayment) {
          // INITIAL SUBSCRIPTION PAYMENT: Update existing donation
          // The donation was created when the subscription was created (in create-donation-checkout)
          // We just need to mark it as completed and create payment_attempt

          if (!subscription.original_donation_id) {
            console.error(
              `Subscription ${subscription.id} missing original_donation_id for initial payment`
            );
            break;
          }

          // Update existing donation to completed status
          const { error: donationUpdateErr } = await supabase
            .from('donations')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', subscription.original_donation_id);

          if (donationUpdateErr) {
            console.error(
              'Failed to update donation for initial subscription payment',
              {
                error: donationUpdateErr,
                donationId: subscription.original_donation_id,
              }
            );
            break;
          }

          // Create payment_attempt record for initial payment
          const { error: attemptErr } = await supabase
            .from('payment_attempts')
            .insert({
              donation_id: subscription.original_donation_id,
              stripe_payment_intent_id: paymentIntentId,
              stripe_customer_id: subscription.stripe_customer_id,
              stripe_subscription_id: stripeSubscriptionId,
              amount_cents: inv.amount_paid,
              amount_received_cents: inv.amount_paid,
              currency_code: (inv.currency ?? 'usd').toUpperCase(),
              status: 'succeeded',
              stripe_event_id: event.id,
              succeeded_at: new Date().toISOString(),
              created_by: subscription.user_id,
            });

          if (attemptErr) {
            console.error(
              'Failed to create payment_attempt for initial subscription payment',
              {
                error: attemptErr,
                donationId: subscription.original_donation_id,
              }
            );
          }

          console.log(
            `Updated donation ${subscription.original_donation_id} for initial subscription payment ${stripeSubscriptionId}`
          );
        } else {
          // RECURRING SUBSCRIPTION PAYMENT: Create new donation record
          // This is a renewal payment (billing_reason === 'subscription_cycle')
          const { data: newDonation, error: donationErr } = await supabase
            .from('donations')
            .insert({
              user_id: subscription.user_id,
              partner_org_id: subscription.partner_org_id,
              intent_type: subscription.intent_type,
              intent_language_entity_id: subscription.intent_language_entity_id,
              intent_region_id: subscription.intent_region_id,
              intent_operation_id: subscription.intent_operation_id,
              amount_cents: inv.amount_paid, // Amount actually paid (may differ from subscription amount due to prorations)
              currency_code: (inv.currency ?? 'usd').toUpperCase(),
              status: 'completed',
              payment_method: 'card', // Default, can be enhanced later
              is_recurring: true,
              subscription_id: subscription.id,
              completed_at: new Date().toISOString(),
              created_by: subscription.user_id,
            })
            .select('id')
            .single();

          if (donationErr || !newDonation) {
            console.error(
              'Failed to create donation for recurring subscription payment',
              {
                error: donationErr,
                subscriptionId: subscription.id,
              }
            );
            break;
          }

          // Create payment_attempt record for recurring payment
          const { error: attemptErr } = await supabase
            .from('payment_attempts')
            .insert({
              donation_id: newDonation.id,
              stripe_payment_intent_id: paymentIntentId,
              stripe_customer_id: subscription.stripe_customer_id,
              stripe_subscription_id: stripeSubscriptionId,
              amount_cents: inv.amount_paid,
              amount_received_cents: inv.amount_paid, // For subscriptions, amount_paid is net
              currency_code: (inv.currency ?? 'usd').toUpperCase(),
              status: 'succeeded',
              stripe_event_id: event.id,
              succeeded_at: new Date().toISOString(),
              created_by: subscription.user_id,
            });

          if (attemptErr) {
            console.error(
              'Failed to create payment_attempt for recurring subscription payment',
              {
                error: attemptErr,
                donationId: newDonation.id,
              }
            );
          }

          console.log(
            `Created donation ${newDonation.id} for recurring subscription payment ${stripeSubscriptionId}`
          );
        }

        // Update subscription current_period_start and current_period_end
        // Fetch latest subscription data from Stripe
        const updatedSubscription =
          await stripe.subscriptions.retrieve(stripeSubscriptionId);

        await supabase
          .from('subscriptions')
          .update({
            current_period_start: updatedSubscription.current_period_start
              ? new Date(
                  updatedSubscription.current_period_start * 1000
                ).toISOString()
              : null,
            current_period_end: updatedSubscription.current_period_end
              ? new Date(
                  updatedSubscription.current_period_end * 1000
                ).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        break;
      }

      case 'customer.subscription.updated': {
        // Handle subscription status updates
        const sub = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = sub.id;

        // Find subscription record
        const { data: subscription, error: subErr } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', stripeSubscriptionId)
          .single();

        if (subErr || !subscription) {
          console.error(
            `Subscription not found for update: ${stripeSubscriptionId}`,
            subErr
          );
          break;
        }

        // Update subscription status and period dates
        await supabase
          .from('subscriptions')
          .update({
            status: sub.status as any,
            current_period_start: sub.current_period_start
              ? new Date(sub.current_period_start * 1000).toISOString()
              : null,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        console.log(
          `Updated subscription ${stripeSubscriptionId} status: ${sub.status}`
        );
        break;
      }

      case 'customer.subscription.deleted': {
        // Handle subscription cancellation
        const sub = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = sub.id;

        // Find subscription record
        const { data: subscription, error: subErr } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', stripeSubscriptionId)
          .single();

        if (subErr || !subscription) {
          console.error(
            `Subscription not found for deletion: ${stripeSubscriptionId}`,
            subErr
          );
          break;
        }

        // Update subscription status to canceled
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        console.log(`Canceled subscription ${stripeSubscriptionId}`);
        break;
      }

      case 'invoice.payment_failed': {
        // Handle subscription payment failures
        const inv = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId =
          typeof inv.subscription === 'string' ? inv.subscription : null;

        if (!stripeSubscriptionId) break;

        // Find subscription record
        const { data: subscription, error: subErr } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', stripeSubscriptionId)
          .single();

        if (subErr || !subscription) {
          console.error(
            `Subscription not found for payment failure: ${stripeSubscriptionId}`,
            subErr
          );
          break;
        }

        // Fetch latest subscription status from Stripe
        const updatedSubscription =
          await stripe.subscriptions.retrieve(stripeSubscriptionId);

        // Update subscription status (will be 'past_due' or 'unpaid')
        await supabase
          .from('subscriptions')
          .update({
            status: updatedSubscription.status as any,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        // TODO: Future: Add business logic for payment failure handling
        // - Send dunning emails to donor
        // - Custom retry logic (Stripe handles this automatically, but we could add custom logic)
        // - Notify admins of payment failures
        console.log(
          `Payment failed for subscription ${stripeSubscriptionId}. Status: ${updatedSubscription.status}`
        );
        break;
      }

      case 'customer.balance.funded' as Stripe.WebhookEndpointCreateParams.EnabledEvent: {
        // Bank transfer funds received
        // Note: This event type may not be in Stripe types, using type assertion
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
