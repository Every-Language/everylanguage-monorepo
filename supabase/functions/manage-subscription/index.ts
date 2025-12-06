import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@14.25.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';

interface CancelRequestBody {
  action: 'cancel';
  subscriptionId: string;
}

interface CustomerPortalRequestBody {
  action: 'customer-portal';
  customerId: string;
  returnUrl?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return createCorsResponse();

  // Validate environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey || !stripeKey) {
    return createErrorResponse(
      'Server configuration error: Missing required environment variables',
      500
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const stripe = new Stripe(stripeKey, {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: '2023-10-16',
  });

  // Get authenticated user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return createErrorResponse('Missing authorization header', 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return createErrorResponse('Invalid or expired token', 401);
  }

  try {
    const body = await req.json();
    const action = body.action;

    if (req.method === 'POST' && action === 'cancel') {
      // Cancel subscription
      const cancelBody = body as CancelRequestBody;
      const { subscriptionId } = cancelBody;

      if (!subscriptionId) {
        return createErrorResponse('Missing subscriptionId', 400);
      }

      // Verify user owns this subscription
      const { data: subscription, error: subErr } = await supabase
        .from('subscriptions')
        .select('id, stripe_subscription_id, user_id, partner_org_id')
        .eq('id', subscriptionId)
        .single();

      if (subErr || !subscription) {
        return createErrorResponse('Subscription not found', 404);
      }

      // Check ownership: user must match or be member of partner org
      const isOwner =
        subscription.user_id === user.id ||
        (subscription.partner_org_id &&
          (await supabase
            .from('user_roles')
            .select('id')
            .eq('partner_org_id', subscription.partner_org_id)
            .eq('user_id', user.id)
            .limit(1)
            .then(({ data }) => data && data.length > 0)));

      if (!isOwner) {
        return createErrorResponse(
          'Unauthorized: You do not own this subscription',
          403
        );
      }

      // Cancel subscription in Stripe
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);

      // Update subscription status in database
      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      return createSuccessResponse({
        success: true,
        message: 'Subscription canceled successfully',
      });
    } else if (req.method === 'POST' && action === 'customer-portal') {
      // Get Stripe Customer Portal URL
      const portalBody = body as CustomerPortalRequestBody;
      const { customerId, returnUrl } = portalBody;

      if (!customerId) {
        return createErrorResponse('Missing customerId', 400);
      }

      // Verify user owns this customer (via subscriptions or payment_attempts)
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .or(
          `user_id.eq.${user.id},partner_org_id.in.(SELECT partner_org_id FROM user_roles WHERE user_id.eq.${user.id})`
        )
        .limit(1)
        .single();

      const { data: paymentAttempt } = await supabase
        .from('payment_attempts')
        .select('donation_id, donations!inner(user_id, partner_org_id)')
        .eq('stripe_customer_id', customerId)
        .limit(1)
        .single();

      // donations is an array due to the join, so we need to access the first element
      const donationsArray = paymentAttempt?.donations as
        | Array<{ user_id: string | null; partner_org_id: string | null }>
        | undefined;
      const donation = donationsArray?.[0];

      const isOwner =
        subscription ||
        donation?.user_id === user.id ||
        (donation?.partner_org_id &&
          (await supabase
            .from('user_roles')
            .select('id')
            .eq('partner_org_id', donation.partner_org_id)
            .eq('user_id', user.id)
            .limit(1)
            .then(({ data }) => data && data.length > 0)));

      if (!isOwner) {
        return createErrorResponse(
          'Unauthorized: You do not own this customer',
          403
        );
      }

      // Create billing portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url:
          returnUrl ||
          'https://partnership.everylanguage.com/profile/subscriptions',
      });

      return createSuccessResponse({
        url: portalSession.url,
      });
    } else {
      return createErrorResponse('Method not allowed', 405);
    }
  } catch (e) {
    console.error('manage-subscription error', e);
    const errorMessage =
      e instanceof Error ? e.message : 'Unknown error occurred';
    const errorStack = e instanceof Error ? e.stack : undefined;
    return createErrorResponse(
      errorMessage || 'Internal server error',
      500,
      errorStack
    );
  }
});
