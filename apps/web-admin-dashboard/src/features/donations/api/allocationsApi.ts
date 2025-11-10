import { supabase } from '@/shared/services/supabase';
import type { AllocationWithDetails } from '@/types';

export const allocationsApi = {
  /**
   * Fetch allocations with pagination, filters, and details
   */
  async fetchAllocations(params?: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    operationFilter?: string;
    projectFilter?: string;
  }): Promise<{
    data: AllocationWithDetails[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query for allocations
    let query = supabase
      .from('donation_allocations')
      .select(
        `
        *,
        donation:donations!donation_allocations_donation_id_fkey (
          id,
          amount_cents,
          status,
          intent_type,
          payment_method,
          is_recurring,
          created_at,
          completed_at
        ),
        operation:operations!donation_allocations_operation_id_fkey (
          id,
          name,
          category,
          status
        ),
        project:projects!donation_allocations_project_id_fkey (
          id,
          name,
          project_status
        ),
        created_by_user:users!donation_allocations_created_by_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    // Apply operation filter
    if (params?.operationFilter) {
      query = query.eq('operation_id', params.operationFilter);
    }

    // Apply project filter
    if (params?.projectFilter) {
      query = query.eq('project_id', params.projectFilter);
    }

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    // Transform data
    let transformedData: AllocationWithDetails[] = (data || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (allocation: any) =>
        ({
          ...allocation,
          donation: allocation.donation || null,
          operation: allocation.operation || null,
          project: allocation.project || null,
          created_by_user: allocation.created_by_user
            ? {
                id: allocation.created_by_user.id,
                first_name: allocation.created_by_user.first_name || '',
                last_name: allocation.created_by_user.last_name || '',
                email: allocation.created_by_user.email || '',
              }
            : null,
        }) as AllocationWithDetails
    );

    // Apply search filter in-memory
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      const searchLower = params.searchQuery.toLowerCase();
      transformedData = transformedData.filter(allocation => {
        const operationName = allocation.operation?.name?.toLowerCase() || '';
        const projectName = allocation.project?.name?.toLowerCase() || '';
        const userName = allocation.created_by_user
          ? `${allocation.created_by_user.first_name} ${allocation.created_by_user.last_name}`.toLowerCase()
          : '';
        const notes = allocation.notes?.toLowerCase() || '';

        return (
          operationName.includes(searchLower) ||
          projectName.includes(searchLower) ||
          userName.includes(searchLower) ||
          notes.includes(searchLower) ||
          allocation.id.toLowerCase().includes(searchLower) ||
          allocation.donation_id.toLowerCase().includes(searchLower)
        );
      });
    }

    // Recalculate pagination after filters
    const filteredCount = transformedData.length;
    const paginatedData = transformedData.slice(0, pageSize);

    return {
      data: paginatedData,
      count: params?.searchQuery ? filteredCount : count || 0,
      page,
      pageSize,
      totalPages: Math.ceil(
        (params?.searchQuery ? filteredCount : count || 0) / pageSize
      ),
    };
  },

  /**
   * Fetch a single allocation with all details
   */
  async fetchAllocationById(id: string): Promise<AllocationWithDetails | null> {
    const { data, error } = await supabase
      .from('donation_allocations')
      .select(
        `
        *,
        donation:donations!donation_allocations_donation_id_fkey (
          id,
          amount_cents,
          status,
          intent_type,
          payment_method,
          is_recurring,
          created_at,
          completed_at
        ),
        operation:operations!donation_allocations_operation_id_fkey (
          id,
          name,
          category,
          status
        ),
        project:projects!donation_allocations_project_id_fkey (
          id,
          name,
          project_status
        ),
        created_by_user:users!donation_allocations_created_by_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      ...data,
      donation: data.donation || null,
      operation: data.operation || null,
      project: data.project || null,
      created_by_user: data.created_by_user
        ? {
            id: data.created_by_user.id,
            first_name: data.created_by_user.first_name || '',
            last_name: data.created_by_user.last_name || '',
            email: data.created_by_user.email || '',
          }
        : null,
    } as AllocationWithDetails;
  },

  /**
   * Update an allocation
   */
  async updateAllocation(
    id: string,
    updates: {
      amount_cents?: number;
      operation_id?: string | null;
      project_id?: string | null;
      notes?: string | null;
      effective_from?: string;
      effective_to?: string | null;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('donation_allocations')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Delete an allocation
   */
  async deleteAllocation(id: string): Promise<void> {
    const { error } = await supabase
      .from('donation_allocations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Fetch all operations for filter dropdown
   */
  async fetchOperations(): Promise<
    Array<{ id: string; name: string; category: string }>
  > {
    const { data, error } = await supabase
      .from('operations')
      .select('id, name, category')
      .is('deleted_at', null)
      .eq('status', 'available' as const)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetch all projects for filter dropdown
   */
  async fetchProjects(): Promise<
    Array<{ id: string; name: string; project_status: string }>
  > {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, project_status')
      .is('deleted_at', null)
      .order('name');

    if (error) throw error;
    return data || [];
  },
};
