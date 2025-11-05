import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

// Temporary types until database types are regenerated
interface ProjectBudget {
  id: string;
  project_id: string;
  total_cents: number;
  currency_code: string;
  description?: string | null;
  [key: string]: any;
}

interface ProjectFinancials {
  project_id: string;
  total_budget_cents: number;
  total_actual_cost_cents: number;
  currency_code: string;
  [key: string]: any;
}

interface ProjectBudgetItem {
  id: string;
  budget_id: string;
  project_id: string;
  description: string;
  notes?: string | null;
  category: string;
  amount_cents: number;
  [key: string]: any;
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
        const { data: projects } = await (supabase as any)
          .from('vw_partner_org_projects')
          .select('project_id')
          .eq('partner_org_id', partnerOrgId!);

        const projectIds = projects?.map((p: any) => p.project_id) || [];

        // Get budgets for all projects
        const { data: budgets, error: budgetsError } = await (supabase as any)
          .from('project_budgets')
          .select('*')
          .in('project_id', projectIds)
          .is('deleted_at', null);

        if (budgetsError) throw budgetsError;

        // Get financials view for aggregated data
        const { data: financials, error: financialsError } = await (
          supabase as any
        )
          .from('project_financials')
          .select('*')
          .in('project_id', projectIds);

        if (financialsError) throw financialsError;

        return {
          budgets: (budgets || []) as ProjectBudget[],
          financials: (financials || []) as ProjectFinancials[],
        };
      } else {
        // Single project
        const { data: budgets, error: budgetsError } = await (supabase as any)
          .from('project_budgets')
          .select('*')
          .eq('project_id', projectId)
          .is('deleted_at', null);

        if (budgetsError) throw budgetsError;

        const { data: financials, error: financialsError } = await (
          supabase as any
        )
          .from('project_financials')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle();

        if (financialsError) throw financialsError;

        // Get budget items for this project
        const budgetIds = budgets?.map((b: any) => b.id) || [];
        const { data: budgetItems, error: budgetItemsError } = await (
          supabase as any
        )
          .from('project_budget_items')
          .select('*')
          .in('budget_id', budgetIds)
          .is('deleted_at', null);

        if (budgetItemsError) throw budgetItemsError;

        return {
          budgets: (budgets || []) as ProjectBudget[],
          budgetItems: (budgetItems || []) as ProjectBudgetItem[],
          financials: financials as ProjectFinancials | null,
        };
      }
    },
    enabled: !!(projectId && (projectId !== 'all' || partnerOrgId)),
  });
}
