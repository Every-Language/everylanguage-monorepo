import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@14.25.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';
import { retryWithBackoff } from '../_shared/retry-utils.ts';
import {
  authenticateRequest,
  isAuthError,
  createAuthErrorResponse,
} from '../_shared/auth-middleware.ts';

interface RequestBody {
  donor: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  donorType: 'individual' | 'partner_org';
  partnerOrgId?: string; // If donorType is 'partner_org' and selecting existing org
  newPartnerOrg?: {
    // If donorType is 'partner_org' and creating new org
    name: string;
    description?: string;
    isPublic: boolean;
  };
  intent: {
    type: 'language' | 'region' | 'operation' | 'unrestricted';
    // Single entity IDs only
    languageEntityId?: string;
    regionId?: string;
    operationId?: string;
  };
  paymentMethod: 'card' | 'bank_transfer';
  amountCents: number;
  isRecurring: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return createCorsResponse();
  if (req.method !== 'POST')
    return createErrorResponse('Method not allowed', 405);

  try {
    const body = (await req.json()) as Partial<RequestBody>;
    const {
      donor,
      donorType,
      partnerOrgId,
      newPartnerOrg,
      intent,
      paymentMethod,
      amountCents,
      isRecurring,
    } = body;

    // Debug: Log the received intent
    console.log(
      '🔵 Edge Function received intent:',
      JSON.stringify(intent, null, 2)
    );
    console.log('🔵 Intent type:', intent?.type);
    console.log('🔵 languageEntityId:', intent?.languageEntityId);

    // Validation - check for missing or empty strings
    if (!donor?.email || !donor.firstName?.trim() || !donor.lastName?.trim()) {
      console.error('❌ Validation failed: Missing donor details', {
        hasEmail: !!donor?.email,
        hasFirstName: !!donor?.firstName?.trim(),
        hasLastName: !!donor?.lastName?.trim(),
        email: donor?.email,
        firstName: donor?.firstName,
        lastName: donor?.lastName,
      });
      return createErrorResponse(
        'Missing donor details: first name, last name, and email are required',
        400
      );
    }

    if (!intent?.type) {
      console.error('❌ Validation failed: Missing donation intent', {
        intent,
      });
      return createErrorResponse('Missing donation intent', 400);
    }

    // Validate intent has required IDs (single IDs only)
    if (intent.type === 'language') {
      if (!intent.languageEntityId) {
        console.error('❌ Missing language entity ID:', { intent });
        return createErrorResponse(
          'languageEntityId required for language intent',
          400
        );
      }
    }
    if (intent.type === 'region') {
      if (!intent.regionId) {
        return createErrorResponse('regionId required for region intent', 400);
      }
    }
    if (intent.type === 'operation') {
      if (!intent.operationId) {
        return createErrorResponse(
          'operationId required for operation intent',
          400
        );
      }
    }

    if (!paymentMethod || !['card', 'bank_transfer'].includes(paymentMethod)) {
      console.error('❌ Validation failed: Invalid payment method', {
        paymentMethod,
        isValid:
          paymentMethod && ['card', 'bank_transfer'].includes(paymentMethod),
      });
      return createErrorResponse('Invalid payment method', 400);
    }

    if (!amountCents || amountCents <= 0) {
      console.error('❌ Validation failed: Invalid amount', {
        amountCents,
        isValid: amountCents && amountCents > 0,
      });
      return createErrorResponse('Invalid amount', 400);
    }

    // Validate environment variables
    // Note: Supabase automatically provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Edge Functions
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      supabaseUrl: supabaseUrl?.substring(0, 30) + '...', // Log partial URL for debugging
      hasSupabaseServiceRoleKey: !!supabaseServiceRoleKey,
      hasStripeKey: !!stripeKey,
      supabaseKeyLength: supabaseServiceRoleKey?.length ?? 0,
      stripeKeyLength: stripeKey?.length ?? 0,
    });

    if (!supabaseUrl) {
      console.error('Missing SUPABASE_URL environment variable');
      return createErrorResponse(
        'Server configuration error: SUPABASE_URL is missing (should be auto-provided by Supabase)',
        500
      );
    }

    if (!supabaseServiceRoleKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
      return createErrorResponse(
        'Server configuration error: Supabase service role key is missing.',
        500
      );
    }

    if (!stripeKey) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      return createErrorResponse(
        'Server configuration error: STRIPE_SECRET_KEY is missing',
        500
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const stripe = new Stripe(stripeKey, {
      httpClient: Stripe.createFetchHttpClient(),
      apiVersion: '2023-10-16',
    });

    // Authenticate request (required auth - we always create session before calling)
    const authResult = await authenticateRequest(req);

    // Handle auth errors
    if (isAuthError(authResult)) {
      // If missing header, return 400 (session expired) instead of 401
      if (
        authResult.status === 401 &&
        authResult.details?.includes('Missing Authorization header')
      ) {
        return createErrorResponse(
          'Session expired. Please refresh the page and try again.',
          400
        );
      }
      // Otherwise return the auth error (401 for invalid token, 500 for other errors)
      return createAuthErrorResponse(authResult);
    }

    const userId = authResult.publicUserId;

    // Helper function to get or create Stripe customer with retry
    const getOrCreateStripeCustomer = async (): Promise<Stripe.Customer> => {
      // Try to find existing customer first
      const customers = (await retryWithBackoff(() =>
        stripe.customers.list({
          email: donor.email,
          limit: 1,
        })
      )) as Stripe.ApiList<Stripe.Customer>;

      if (customers.data.length > 0) {
        const existingCustomer = customers.data[0];

        // Link existing customer to user account if metadata doesn't already have user_id
        // or if it has a different user_id
        const currentUserId = existingCustomer.metadata?.user_id;
        if (currentUserId !== userId) {
          await retryWithBackoff(() =>
            stripe.customers.update(existingCustomer.id, {
              metadata: {
                ...existingCustomer.metadata,
                user_id: userId,
                source: 'everylanguage',
                purpose: 'donation',
              },
            })
          );
        }

        return existingCustomer;
      }

      // Create new customer with retry, linking to user account
      return await retryWithBackoff(() =>
        stripe.customers.create({
          email: donor.email,
          name: `${donor.firstName} ${donor.lastName}`.trim(),
          phone: donor.phone,
          metadata: {
            user_id: userId,
            source: 'everylanguage',
            purpose: 'donation',
          },
        })
      );
    };

    // Helper function to create partner org
    const createPartnerOrg = async (): Promise<string> => {
      if (donorType === 'individual') {
        // For individual donations, create a partner org with is_individual=true
        const { data: individualOrg, error: orgErr } = await supabase
          .from('partner_orgs')
          .insert({
            name: `${donor.firstName} ${donor.lastName}`.trim(),
            description: `Individual donor: ${donor.email}`,
            is_individual: true,
            is_public: false,
            created_by: userId, // Always set since we require Authorization header
          })
          .select('id')
          .single();

        if (orgErr || !individualOrg) {
          console.error('Failed to create individual partner org', {
            error: orgErr,
            errorMessage: orgErr?.message,
            errorCode: orgErr?.code,
            errorDetails: orgErr?.details,
          });
          throw new Error(
            `Failed to create donor record: ${orgErr?.message || 'Unknown error'}`
          );
        }
        return individualOrg.id;
      } else {
        // Handle partner org
        if (partnerOrgId) {
          return partnerOrgId;
        } else if (newPartnerOrg) {
          const { data: insOrg, error: orgErr } = await supabase
            .from('partner_orgs')
            .insert({
              name: newPartnerOrg.name,
              description: newPartnerOrg.description ?? '',
              is_individual: false,
              is_public: newPartnerOrg.isPublic,
              created_by: userId, // Always set since we require Authorization header
            })
            .select('id')
            .single();

          if (orgErr || !insOrg) {
            throw new Error(`Failed to create partner org: ${orgErr?.message}`);
          }
          return insOrg.id;
        } else {
          throw new Error(
            'partnerOrgId or newPartnerOrg required when donorType is partner_org'
          );
        }
      }
    };

    // OPTIMIZATION: Parallelize Stripe customer lookup and partner org creation
    // These operations are independent and can run concurrently
    let finalPartnerOrgId: string | null = null;
    let customer: Stripe.Customer;

    try {
      const [customerResult, partnerOrgResult] = await Promise.all([
        getOrCreateStripeCustomer(),
        createPartnerOrg(),
      ]);

      customer = customerResult;
      finalPartnerOrgId = partnerOrgResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to create customer or partner org:', errorMessage);
      return createErrorResponse(
        `Failed to set up donation: ${errorMessage}`,
        500
      );
    }

    // Auto-assign partner_member role when user donates on behalf of existing partner org
    if (donorType === 'partner_org' && partnerOrgId && userId) {
      try {
        // Get partner_member role_id
        const { data: partnerMemberRole, error: roleError } = await supabase
          .from('roles')
          .select('id')
          .eq('role_key', 'partner_member')
          .eq('resource_type', 'partner')
          .single();

        if (!roleError && partnerMemberRole) {
          // Check if user already has a role for this partner org
          const { data: existingRole } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', userId)
            .eq('partner_org_id', partnerOrgId)
            .maybeSingle();

          if (!existingRole) {
            // Insert partner_member role
            await supabase.from('user_roles').insert({
              user_id: userId,
              partner_org_id: partnerOrgId,
              role_id: partnerMemberRole.id,
            });
          }
        }
      } catch (error) {
        // Log error but don't fail the donation
        console.error('Failed to assign partner_member role:', error);
      }
    }

    // 4. Create donation record (business logic layer)
    // Map frontend payment method to database enum value
    // Frontend uses 'bank_transfer' but database enum uses 'us_bank_account'
    const dbPaymentMethod =
      paymentMethod === 'bank_transfer' ? 'us_bank_account' : paymentMethod;

    // Create single donation with user-entered amount (business logic layer only)
    // user_id is never null - we require Authorization header
    const donationInsert = {
      user_id: userId, // Always set since we require Authorization header
      partner_org_id: finalPartnerOrgId,
      intent_type: intent.type,
      intent_language_entity_id:
        intent.type === 'language' ? (intent.languageEntityId ?? null) : null,
      intent_region_id:
        intent.type === 'region' ? (intent.regionId ?? null) : null,
      intent_operation_id:
        intent.type === 'operation' ? (intent.operationId ?? null) : null,
      amount_cents: amountCents,
      currency_code: 'USD',
      status: 'draft' as const, // Will move to pending when payment is initiated
      payment_method: dbPaymentMethod, // Business logic: donor's payment preference
      is_recurring: isRecurring, // Business logic: donor's intent for recurring
      created_by: userId, // Always set since we require Authorization header
    };

    const { data: donations, error: donationErr } = await supabase
      .from('donations')
      .insert(donationInsert)
      .select('id');

    if (donationErr || !donations || donations.length === 0) {
      console.error('Failed to create donation', {
        error: donationErr,
        errorMessage: donationErr?.message,
        errorCode: donationErr?.code,
        errorDetails: donationErr?.details,
        errorHint: donationErr?.hint,
        donationInsert,
      });
      return createErrorResponse(
        `Failed to create donation: ${donationErr?.message || 'Unknown error'}`,
        500,
        donationErr?.details || donationErr?.hint
      );
    }

    // Single donation ID
    const donationId = donations[0].id;
    const allDonationIds = [donationId];

    // 5. Handle recurring vs one-time donations
    let clientSecret: string | null = null;
    let paymentIntentId: string | null = null;
    let subscriptionId: string | null = null;

    if (isRecurring) {
      // RECURRING DONATION: Create Stripe Subscription
      try {
        // Create Stripe Subscription with immediate first payment
        // Build product name based on donation intent
        let productName = 'Monthly Donation';
        if (intent.type === 'language') {
          productName = 'Monthly Language Donation';
        } else if (intent.type === 'region') {
          productName = 'Monthly Region Donation';
        } else if (intent.type === 'operation') {
          productName = 'Monthly Operation Donation';
        } else {
          productName = 'Monthly Unrestricted Donation';
        }

        // Create product first, then use it in the subscription
        const product = await retryWithBackoff(async () => {
          return await stripe.products.create({
            name: productName,
            description: 'Recurring monthly donation',
            metadata: {
              purpose: 'donation',
              donation_id: donationId,
              intent_type: intent.type,
            },
          });
        });

        const subscription = await retryWithBackoff(async () => {
          return await stripe.subscriptions.create({
            customer: customer.id,
            items: [
              {
                price_data: {
                  currency: 'usd',
                  unit_amount: amountCents,
                  product: product.id,
                  recurring: {
                    interval: 'month', // Default to monthly, can be made configurable later
                  },
                },
              },
            ],
            payment_behavior: 'default_incomplete', // Immediate first payment
            expand: ['latest_invoice.payment_intent'], // Get client_secret for first payment
            metadata: {
              purpose: 'donation',
              donation_id: donationId,
              intent_type: intent.type,
            },
          });
        });

        // Get payment_intent from latest_invoice for client_secret
        // Since we expanded 'latest_invoice.payment_intent', it should be a PaymentIntent object
        const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
        const paymentIntent =
          latestInvoice.payment_intent as Stripe.PaymentIntent;

        if (!paymentIntent || typeof paymentIntent === 'string') {
          throw new Error(
            'Failed to get payment_intent from subscription invoice (not expanded)'
          );
        }

        if (!paymentIntent.client_secret) {
          throw new Error(
            'Failed to get client_secret from subscription invoice payment intent'
          );
        }

        // Set receipt_email on the PaymentIntent for automatic receipt sending
        // This ensures the initial subscription payment receipt is sent
        await retryWithBackoff(() =>
          stripe.paymentIntents.update(paymentIntent.id, {
            receipt_email: donor.email,
          })
        );

        clientSecret = paymentIntent.client_secret;
        paymentIntentId = paymentIntent.id;
        subscriptionId = subscription.id;

        // Create subscription record in database
        const { data: subscriptionRecord, error: subErr } = await supabase
          .from('subscriptions')
          .insert({
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customer.id,
            original_donation_id: donationId,
            amount_cents: amountCents,
            currency_code: 'USD',
            interval_type: 'month',
            status: subscription.status as any,
            current_period_start: subscription.current_period_start
              ? new Date(subscription.current_period_start * 1000).toISOString()
              : null,
            current_period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            intent_type: intent.type,
            intent_language_entity_id:
              intent.type === 'language'
                ? (intent.languageEntityId ?? null)
                : null,
            intent_region_id:
              intent.type === 'region' ? (intent.regionId ?? null) : null,
            intent_operation_id:
              intent.type === 'operation' ? (intent.operationId ?? null) : null,
            user_id: userId, // Always set since we require Authorization header
            partner_org_id: finalPartnerOrgId,
          })
          .select('id')
          .single();

        if (subErr || !subscriptionRecord) {
          console.error('Failed to create subscription record', {
            error: subErr,
            errorMessage: subErr?.message,
          });
          // Don't fail the request, but log the error
        } else {
          // Update donation with subscription_id
          await supabase
            .from('donations')
            .update({
              subscription_id: subscriptionRecord.id,
              status: 'pending',
            })
            .eq('id', donationId);

          // Create payment_attempt for first payment
          await supabase.from('payment_attempts').insert({
            donation_id: donationId,
            stripe_payment_intent_id: paymentIntent.id,
            stripe_customer_id: customer.id,
            stripe_subscription_id: subscription.id,
            amount_cents: amountCents,
            currency_code: 'USD',
            status: paymentIntent.status as any,
            stripe_event_id: null, // Will be populated by webhook
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to create subscription:', errorMessage);
        return createErrorResponse(
          `Failed to create subscription: ${errorMessage}`,
          500
        );
      }
    } else {
      // ONE-TIME DONATION: Create PaymentIntent (existing flow)
      let paymentIntent: Stripe.PaymentIntent;

      const createPaymentIntent = async (): Promise<Stripe.PaymentIntent> => {
        if (paymentMethod === 'card') {
          // Card payment: create PaymentIntent with automatic_payment_methods
          return await stripe.paymentIntents.create({
            amount: amountCents,
            currency: 'usd',
            customer: customer.id,
            automatic_payment_methods: { enabled: true },
            receipt_email: donor.email, // Enable automatic receipt sending
            metadata: {
              purpose: 'donation',
              donation_ids: allDonationIds.join(','), // Store all donation IDs
              donation_id: donationId, // Keep for backward compatibility
              intent_type: intent.type,
            },
          });
        } else {
          // Bank transfer (ACH): create PaymentIntent with us_bank_account
          // Note: This requires collecting bank account details via Stripe Elements
          // The payment will be in 'processing' status until the ACH transfer clears (1-3 business days)
          return await stripe.paymentIntents.create({
            amount: amountCents,
            currency: 'usd',
            customer: customer.id,
            payment_method_types: ['us_bank_account'],
            receipt_email: donor.email, // Enable automatic receipt sending
            metadata: {
              purpose: 'donation',
              donation_ids: allDonationIds.join(','), // Store all donation IDs
              donation_id: donationId, // Keep for backward compatibility
              intent_type: intent.type,
              payment_method: 'bank_transfer',
            },
          });
        }
      };

      try {
        paymentIntent = await retryWithBackoff(createPaymentIntent);
        clientSecret = paymentIntent.client_secret;
        paymentIntentId = paymentIntent.id;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to create PaymentIntent:', errorMessage);
        return createErrorResponse(
          `Failed to create payment: ${errorMessage}`,
          500
        );
      }

      // Create payment_attempt record(s) (payment provider layer)
      // Create one payment attempt per donation, all linked to same PaymentIntent
      // payment_attempts is the single source of truth for Stripe payment details
      const paymentAttempts = allDonationIds.map((dId: string) => ({
        donation_id: dId,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: customer.id, // Stripe customer ID (payment provider detail)
        amount_cents: amountCents, // Total amount (will be allocated by webhook if needed)
        currency_code: 'USD',
        status: paymentIntent.status as any, // Cast to match enum
        stripe_event_id: null, // Will be populated by webhook
      }));

      const { error: attemptErr } = await supabase
        .from('payment_attempts')
        .insert(paymentAttempts);

      if (attemptErr) {
        console.error('Failed to create payment_attempts', attemptErr.message);
        // Don't fail the request, but log the error
      }

      // Update all donations status to 'pending' (business logic only)
      // Stripe payment details are in payment_attempts, not donations
      await supabase
        .from('donations')
        .update({
          status: 'pending',
        })
        .in('id', allDonationIds);
    }

    // 6. Return response
    return createSuccessResponse({
      clientSecret,
      paymentIntentId,
      donationId,
      customerId: customer.id,
      partnerOrgId: finalPartnerOrgId,
      subscriptionId, // Include subscriptionId if recurring
    });
  } catch (e) {
    console.error('create-donation-checkout error', e);
    const errorMessage =
      e instanceof Error ? e.message : 'Unknown error occurred';
    const errorStack = e instanceof Error ? e.stack : undefined;
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      errorType: e?.constructor?.name,
    });
    return createErrorResponse(
      errorMessage || 'Internal server error',
      500,
      errorStack
    );
  }
});
