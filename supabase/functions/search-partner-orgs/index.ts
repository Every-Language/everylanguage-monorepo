import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';
import { dbToApi } from '../_shared/case-utils.ts';

interface RequestBody {
  query: string;
  limit?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return createCorsResponse();
  if (req.method !== 'POST')
    return createErrorResponse('Method not allowed', 405);

  try {
    const body = (await req.json()) as Partial<RequestBody>;
    const { query, limit = 10 } = body as RequestBody;

    if (!query || query.trim().length < 2) {
      return createSuccessResponse({ results: [] });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SECRET_KEY') ?? ''
    );

    // Call the database function for fuzzy search
    const { data, error } = await supabase.rpc('search_partner_orgs', {
      search_query: query,
      max_results: limit,
    });

    if (error) {
      console.error('search_partner_orgs error', error);
      return createErrorResponse(`Search error: ${error.message}`, 500);
    }

    // Convert database results from snake_case to camelCase
    const results = dbToApi(data ?? []);
    return createSuccessResponse({ results });
  } catch (e) {
    console.error('search-partner-orgs error', e);
    return createErrorResponse((e as Error).message, 500);
  }
});
