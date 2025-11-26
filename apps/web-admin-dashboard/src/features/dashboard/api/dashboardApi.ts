import { supabase } from '@/shared/services/supabase';

export interface DashboardStats {
  activeProjectsCount: number;
  languagesPendingFundingCount: number;
  donationsPendingAllocationCount: number;
}

export const dashboardApi = {
  /**
   * Fetch dashboard statistics
   */
  async fetchDashboardStats(): Promise<DashboardStats> {
    // Fetch active projects count
    const { count: activeProjectsCount, error: projectsError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('project_status', 'active')
      .is('deleted_at', null);

    if (projectsError) throw projectsError;

    // Fetch languages pending funding count
    // Count language_funding with status 'available' and remaining_budget_cents > 0
    const { data: languagesData, error: languagesError } = await supabase
      .from('language_funding_remaining')
      .select('id')
      .eq('funding_status', 'available')
      .gt('remaining_budget_cents', 0)
      .is('deleted_at', null);

    if (languagesError) throw languagesError;

    // Fetch donations pending allocation count
    // Count donations with status 'completed' where sum of allocations < amount_cents
    const { data: donationsData, error: donationsError } = await supabase
      .from('donations')
      .select(
        `
        id,
        amount_cents,
        donation_allocations (
          amount_cents
        )
      `
      )
      .eq('status', 'completed')
      .is('deleted_at', null);

    if (donationsError) throw donationsError;

    // Calculate donations pending allocation
    const donationsPendingAllocationCount =
      donationsData?.filter(donation => {
        const allocations = donation.donation_allocations || [];
        const allocatedCents = allocations.reduce(
          (sum: number, alloc: { amount_cents: number }) =>
            sum + alloc.amount_cents,
          0
        );
        return allocatedCents < donation.amount_cents;
      }).length || 0;

    return {
      activeProjectsCount: activeProjectsCount || 0,
      languagesPendingFundingCount: languagesData?.length || 0,
      donationsPendingAllocationCount,
    };
  },
};
