import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';

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
    languageEntityId?: string; // Required if type is 'language'
    regionId?: string; // Required if type is 'region'
    operationId?: string; // Required if type is 'operation'
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

    // Validation
    if (!donor?.email || !donor.firstName || !donor.lastName) {
      return createErrorResponse('Missing donor details', 400);
    }

    if (!intent?.type) {
      return createErrorResponse('Missing donation intent', 400);
    }

    // Validate intent has required IDs
    if (intent.type === 'language' && !intent.languageEntityId) {
      return createErrorResponse(
        'languageEntityId required for language intent',
        400
      );
    }
    if (intent.type === 'region' && !intent.regionId) {
      return createErrorResponse('regionId required for region intent', 400);
    }
    if (intent.type === 'operation' && !intent.operationId) {
      return createErrorResponse(
        'operationId required for operation intent',
        400
      );
    }

    if (!paymentMethod || !['card', 'bank_transfer'].includes(paymentMethod)) {
      return createErrorResponse('Invalid payment method', 400);
    }

    if (!amountCents || amountCents <= 0) {
      return createErrorResponse('Invalid amount', 400);
    }

    // Validate environment variables
    // Note: Supabase automatically provides SUPABASE_URL to Edge Functions
    // For admin operations (bypassing RLS), we need a service role key or secret key
    // Supabase may provide this as SUPABASE_SERVICE_ROLE_KEY or we may need to set it manually
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // Try multiple possible names for the service role/secret key
    const supabaseSecretKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
      Deno.env.get('SUPABASE_SECRET_KEY') ||
      Deno.env.get('SUPABASE_SERVICE_KEY') ||
      '';
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      supabaseUrl: supabaseUrl?.substring(0, 30) + '...', // Log partial URL for debugging
      hasSupabaseServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasSupabaseSecretKey: !!Deno.env.get('SUPABASE_SECRET_KEY'),
      hasSupabaseServiceKey: !!Deno.env.get('SUPABASE_SERVICE_KEY'),
      hasSupabaseSecretKeyFinal: !!supabaseSecretKey,
      hasStripeKey: !!stripeKey,
      supabaseKeyLength: supabaseSecretKey?.length ?? 0,
      stripeKeyLength: stripeKey?.length ?? 0,
    });

    if (!supabaseUrl) {
      console.error('Missing SUPABASE_URL environment variable');
      return createErrorResponse(
        'Server configuration error: SUPABASE_URL is missing (should be auto-provided by Supabase)',
        500
      );
    }

    if (!supabaseSecretKey) {
      console.error(
        'Missing service role key. Checked: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SECRET_KEY, SUPABASE_SERVICE_KEY'
      );
      return createErrorResponse(
        'Server configuration error: Supabase service role key is missing. For admin operations, you need to set SUPABASE_SERVICE_ROLE_KEY in your Edge Function secrets. This is different from publishable keys - it bypasses RLS for server-side operations.',
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

    const supabase = createClient(supabaseUrl, supabaseSecretKey);
    const stripe = new Stripe(stripeKey, {
      httpClient: Stripe.createFetchHttpClient(),
      apiVersion: '2023-10-16',
    });

    // 1. Create or get Stripe customer
    const customers = await stripe.customers.list({
      email: donor.email,
      limit: 1,
    });
    let customer = customers.data[0];

    customer ??= await stripe.customers.create({
      email: donor.email,
      name: `${donor.firstName} ${donor.lastName}`.trim(),
      phone: donor.phone,
      metadata: {
        source: 'everylanguage',
        purpose: 'donation',
      },
    });

    // 2. Get or create user_id (link to public.users if authenticated, else null for now)
    // For now, we'll assume unauthenticated donations (user_id will be null)
    // The user can claim their donation later by creating an account
    const userId: string | null = null;
    // TODO: In future, check for auth.uid() from JWT to link to existing user

    // 3. Handle partner org (if donorType is 'partner_org')
    let finalPartnerOrgId: string | null = null;

    if (donorType === 'partner_org') {
      if (partnerOrgId) {
        // Use existing partner org
        finalPartnerOrgId = partnerOrgId;
      } else if (newPartnerOrg) {
        // Create new partner org
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
        finalPartnerOrgId = insOrg.id;
      } else {
        return createErrorResponse(
          'partnerOrgId or newPartnerOrg required when donorType is partner_org',
          400
        );
      }
    }

    // 4. Create donation record (business logic layer)
    const donationInsert = {
      user_id: userId,
      partner_org_id: finalPartnerOrgId,
      intent_type: intent.type,
      intent_language_entity_id: intent.languageEntityId ?? null,
      intent_region_id: intent.regionId ?? null,
      intent_operation_id: intent.operationId ?? null,
      amount_cents: amountCents,
      currency_code: 'USD',
      status: 'draft', // Will move to pending when payment is initiated
      payment_method: paymentMethod,
      is_recurring: isRecurring,
      stripe_customer_id: customer.id,
      created_by: userId,
    };

    const { data: donation, error: donationErr } = await supabase
      .from('donations')
      .insert(donationInsert)
      .select('id')
      .single();

    if (donationErr || !donation) {
      console.error('Failed to create donation', donationErr?.message);
      return createErrorResponse('Failed to create donation', 500);
    }

    const donationId = donation.id;

    // 5. Create Stripe PaymentIntent (payment provider layer)
    let paymentIntent: Stripe.PaymentIntent;

    if (paymentMethod === 'card') {
      // Card payment: create PaymentIntent with automatic_payment_methods
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        customer: customer.id,
        automatic_payment_methods: { enabled: true },
        setup_future_usage: isRecurring ? 'off_session' : undefined, // Save card for recurring
        metadata: {
          purpose: 'donation',
          donation_id: donationId,
          intent_type: intent.type,
        },
      });
    } else {
      // Bank transfer: create PaymentIntent with customer_balance
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
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
          purpose: 'donation',
          donation_id: donationId,
          intent_type: intent.type,
          payment_method: 'bank_transfer',
        },
      });
    }

    // 6. Create payment_attempt record (payment provider layer)
    const { error: attemptErr } = await supabase
      .from('payment_attempts')
      .insert({
        donation_id: donationId,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: amountCents,
        currency_code: 'USD',
        status: paymentIntent.status as any, // Cast to match enum
        stripe_event_id: null, // Will be populated by webhook
        created_by: userId,
      });

    if (attemptErr) {
      console.error('Failed to create payment_attempt', attemptErr.message);
      // Don't fail the request, but log the error
    }

    // 7. Update donation with stripe_payment_intent_id and move to 'pending'
    await supabase
      .from('donations')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
      })
      .eq('id', donationId);

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
