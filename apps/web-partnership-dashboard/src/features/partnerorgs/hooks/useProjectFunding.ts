import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

// Types for new balance-based billing system
interface ProjectBalance {
  project_id: string;
  project_name: string;
  language_entity_id: string;
  total_contributions_cents: number;
  total_costs_cents: number;
  balance_cents: number;
  currency_code: string;
  contribution_count: number;
  cost_count: number;
  last_contribution_at?: string | null;
  last_cost_at?: string | null;
}

interface Contribution {
  id: string;
  project_id?: string | null;
  amount_cents: number;
  currency_code: string;
  occurred_at: string;
  kind: string;
  stripe_payment_intent_id?: string | null;
  stripe_invoice_id?: string | null;
  subscription_id?: string | null;
}

interface ProjectCost {
  id: string;
  project_id: string;
  occurred_at: string;
  category: string;
  amount_cents: number;
  currency_code: string;
  note?: string | null;
  receipt_url?: string | null;
}

interface Subscription {
  id: string;
  project_id?: string | null;
  amount_cents: number;
  currency_code: string;
  status: string;
  started_at: string;
  cancelled_at?: string | null;
  subscription_type: string;
}

export function useProjectFunding(
  projectId: string | 'all',
  partnerOrgId?: string
) {
  return useQuery({
    queryKey: ['project-funding', projectId, partnerOrgId],
    queryFn: async () => {
      if (projectId === 'all') {
        // Aggregate funding across all partner org projects
        const { data: activeProjects } = await (supabase as any)
          .from('vw_partner_org_active_projects')
          .select('project_id')
          .eq('partner_org_id', partnerOrgId!);

        const projectIds = activeProjects?.map((p: any) => p.project_id) || [];

        // Get balance for all projects
        const { data: balances, error: balancesError } = await (supabase as any)
          .from('vw_project_balances')
          .select('*')
          .in('project_id', projectIds);

        if (balancesError) throw balancesError;

        return {
          balances: (balances || []) as ProjectBalance[],
        };
      } else {
        // Single project - get detailed data
        const { data: balance, error: balanceError } = await (supabase as any)
          .from('vw_project_balances')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle();

        if (balanceError) throw balanceError;

        // Get contributions for this project
        const { data: contributions, error: contributionsError } = (
          supabase as any
        )
          .from('contributions')
          .select('*')
          .eq('project_id', projectId)
          .order('occurred_at', { ascending: false });

        if (contributionsError) throw contributionsError;

        // Get costs for this project
        const { data: costs, error: costsError } = await (supabase as any)
          .from('project_budget_costs')
          .select('*')
          .eq('project_id', projectId)
          .order('occurred_at', { ascending: false });

        if (costsError) throw costsError;

        // Get active subscriptions for this project
        const { data: subscriptions, error: subscriptionsError } = (
          supabase as any
        )
          .from('subscriptions')
          .select('*')
          .eq('project_id', projectId)
          .eq('status', 'active');

        if (subscriptionsError) throw subscriptionsError;

        return {
          balance: balance as ProjectBalance | null,
          contributions: (contributions || []) as Contribution[],
          costs: (costs || []) as ProjectCost[],
          subscriptions: (subscriptions || []) as Subscription[],
        };
      }
    },
    enabled: !!(projectId && (projectId !== 'all' || partnerOrgId)),
  });
}
