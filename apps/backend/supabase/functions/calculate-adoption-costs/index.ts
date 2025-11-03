import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';

interface RequestBody {
  adoptionIds: string[];
}

interface LanguageCost {
  id: string;
  name: string | null;
  depositCents: number;
  recurringCents: number;
  totalCents: number;
  months: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return createCorsResponse();
  if (req.method !== 'POST')
    return createErrorResponse('Method not allowed', 405);

  try {
    const body = (await req.json()) as Partial<RequestBody>;
    const { adoptionIds = [] } = body as RequestBody;

    if (!adoptionIds || adoptionIds.length === 0) {
      return createErrorResponse('adoptionIds required', 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch funding settings and language adoptions in parallel
    const [settingsResult, adoptionsResult] = await Promise.all([
      supabase
        .from('funding_settings')
        .select('deposit_percent,recurring_months')
        .limit(1),
      supabase
        .from('language_adoptions')
        .select(
          'id, language_entity_id, estimated_budget_cents, deposit_percent, recurring_months, language_entities(name)'
        )
        .in('id', adoptionIds),
    ]);

    if (settingsResult.error) {
      return createErrorResponse(
        `DB error (funding_settings): ${settingsResult.error.message}`,
        500
      );
    }

    if (adoptionsResult.error) {
      return createErrorResponse(
        `DB error (language_adoptions): ${adoptionsResult.error.message}`,
        500
      );
    }

    const globalDeposit = settingsResult.data?.[0]?.deposit_percent ?? 0.2;
    const globalMonths = settingsResult.data?.[0]?.recurring_months ?? 12;

    const languages: LanguageCost[] = [];
    let totalDeposit = 0;
    let totalMonthly = 0;

    for (const a of adoptionsResult.data ?? []) {
      const depositPercent = a.deposit_percent ?? globalDeposit;
      const months = a.recurring_months ?? globalMonths;
      const budget = Math.max(0, a.estimated_budget_cents ?? 0);
      const deposit = Math.round(budget * depositPercent);
      const recurring = Math.max(
        0,
        Math.round((budget - deposit) / Math.max(1, months))
      );

      languages.push({
        id: a.id,
        name: (a as any).language_entities?.name ?? null,
        depositCents: deposit,
        recurringCents: recurring,
        totalCents: budget,
        months,
      });

      totalDeposit += deposit;
      totalMonthly += recurring;
    }

    return createSuccessResponse({
      languages,
      deposit_total_cents: totalDeposit,
      monthly_total_cents: totalMonthly,
      recurring_months: globalMonths,
      total_commitment_cents: totalDeposit + totalMonthly * globalMonths,
      summary: {
        totalDeposit,
        totalMonthly,
        months: globalMonths,
        totalCommitment: totalDeposit + totalMonthly * globalMonths,
      },
    });
  } catch (e) {
    console.error('calculate-adoption-costs error', e);
    return createErrorResponse((e as Error).message, 500);
  }
});
