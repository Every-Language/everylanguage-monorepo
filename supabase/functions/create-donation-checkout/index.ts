import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@14.25.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';
import { retryWithBackoff } from '../_shared/retry-utils.ts';

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

    // Validation
    if (!donor?.email || !donor.firstName || !donor.lastName) {
      return createErrorResponse('Missing donor details', 400);
    }

    if (!intent?.type) {
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
      return createErrorResponse('Invalid payment method', 400);
    }

    if (!amountCents || amountCents <= 0) {
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
        return customers.data[0];
      }

      // Create new customer with retry
      return await retryWithBackoff(() =>
        stripe.customers.create({
          email: donor.email,
          name: `${donor.firstName} ${donor.lastName}`.trim(),
          phone: donor.phone,
          metadata: {
            source: 'everylanguage',
            purpose: 'donation',
          },
        })
      );
    };

    // Helper function to create partner org
    const createPartnerOrg = async (): Promise<string> => {
      let userId: string | null = null;
      // TODO: In future, check for auth.uid() from JWT to link to existing user

      if (donorType === 'individual') {
        // For individual donations, create a partner org with is_individual=true
        const { data: individualOrg, error: orgErr } = await supabase
          .from('partner_orgs')
          .insert({
            name: `${donor.firstName} ${donor.lastName}`.trim(),
            description: `Individual donor: ${donor.email}`,
            is_individual: true,
            is_public: false,
            created_by: userId,
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
              created_by: userId,
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
    let userId: string | null = null;
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

    // 4. Create donation record (business logic layer)
    // Map frontend payment method to database enum value
    // Frontend uses 'bank_transfer' but database enum uses 'us_bank_account'
    const dbPaymentMethod =
      paymentMethod === 'bank_transfer' ? 'us_bank_account' : paymentMethod;

    // Create single donation with user-entered amount
    const donationInsert = {
      user_id: userId,
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
      payment_method: dbPaymentMethod,
      is_recurring: isRecurring,
      stripe_customer_id: customer.id,
      created_by: userId,
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

    // 5. Create Stripe PaymentIntent (payment provider layer) with retry
    let paymentIntent: Stripe.PaymentIntent;

    const createPaymentIntent = async (): Promise<Stripe.PaymentIntent> => {
      if (paymentMethod === 'card') {
        // Card payment: create PaymentIntent with automatic_payment_methods
        return await stripe.paymentIntents.create({
          amount: amountCents,
          currency: 'usd',
          customer: customer.id,
          automatic_payment_methods: { enabled: true },
          setup_future_usage: isRecurring ? 'off_session' : undefined,
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
          setup_future_usage: isRecurring ? 'off_session' : undefined,
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to create PaymentIntent:', errorMessage);
      return createErrorResponse(
        `Failed to create payment: ${errorMessage}`,
        500
      );
    }

    // 6. Create payment_attempt record(s) (payment provider layer)
    // Create one payment attempt per donation, all linked to same PaymentIntent
    const paymentAttempts = allDonationIds.map((dId: string) => ({
      donation_id: dId,
      stripe_payment_intent_id: paymentIntent.id,
      amount_cents: amountCents, // Total amount (will be allocated by webhook if needed)
      currency_code: 'USD',
      status: paymentIntent.status as any, // Cast to match enum
      stripe_event_id: null, // Will be populated by webhook
      created_by: userId,
    }));

    const { error: attemptErr } = await supabase
      .from('payment_attempts')
      .insert(paymentAttempts);

    if (attemptErr) {
      console.error('Failed to create payment_attempts', attemptErr.message);
      // Don't fail the request, but log the error
    }

    // 7. Update all donations with stripe_payment_intent_id and move to 'pending'
    await supabase
      .from('donations')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
      })
      .in('id', allDonationIds);

    // 8. Return response
    return createSuccessResponse({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      donationId,
      customerId: customer.id,
      partnerOrgId: finalPartnerOrgId,
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
