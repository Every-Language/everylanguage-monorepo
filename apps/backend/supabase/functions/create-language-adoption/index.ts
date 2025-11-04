import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';

interface RequestBody {
  language_entity_id: string;
  estimated_budget_cents: number;
  deposit_percent?: number;
  recurring_months?: number;
  currency_code?: string;
  status?: 'draft' | 'available' | 'on_hold' | 'funded' | 'archived';
  created_by?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return createCorsResponse();
  if (req.method !== 'POST')
    return createErrorResponse('Method not allowed', 405);

  try {
    const body = (await req.json()) as Partial<RequestBody>;
    const {
      language_entity_id,
      estimated_budget_cents,
      deposit_percent,
      recurring_months,
      currency_code = 'USD',
      status = 'draft',
      created_by = null,
    } = body as RequestBody;

    if (!language_entity_id) {
      return createErrorResponse('language_entity_id is required', 400);
    }

    if (!estimated_budget_cents || estimated_budget_cents < 0) {
      return createErrorResponse(
        'estimated_budget_cents must be a positive number',
        400
      );
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

    // Fetch language name for Stripe product
    const { data: language, error: langErr } = await supabase
      .from('language_entities')
      .select('name')
      .eq('id', language_entity_id)
      .single();

    if (langErr || !language) {
      return createErrorResponse(
        `Language entity not found: ${langErr?.message}`,
        404
      );
    }

    const languageName = language.name ?? 'Unknown Language';

    // Create Stripe product for this adoption
    const product = await stripe.products.create({
      name: `Adoption: ${languageName}`,
      description: `Monthly subscription for language adoption of ${languageName}`,
      metadata: {
        language_entity_id,
        purpose: 'adoption',
      },
    });

    // Insert language adoption with stripe_product_id
    const { data: adoption, error: insertErr } = await supabase
      .from('language_adoptions')
      .insert({
        language_entity_id,
        estimated_budget_cents,
        deposit_percent,
        recurring_months,
        currency_code: currency_code.toUpperCase(),
        status,
        created_by,
        stripe_product_id: product.id,
      })
      .select()
      .single();

    if (insertErr || !adoption) {
      // Clean up Stripe product if database insert fails
      try {
        await stripe.products.update(product.id, { active: false });
      } catch (cleanupErr) {
        console.error('Failed to deactivate Stripe product:', cleanupErr);
      }
      return createErrorResponse(
        `Failed to create adoption: ${insertErr?.message}`,
        500
      );
    }

    return createSuccessResponse({
      adoption: {
        ...adoption,
        language_name: languageName,
      },
      stripe_product_id: product.id,
    });
  } catch (e) {
    console.error('create-language-adoption error', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return createErrorResponse(errorMessage, 500);
  }
});
