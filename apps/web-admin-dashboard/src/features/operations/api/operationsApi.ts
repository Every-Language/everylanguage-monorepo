import { supabase } from '@/shared/services/supabase';
import type { Tables, Enums } from '@everylanguage/shared-types';

export type OperationBalance = Tables<'vw_operation_balances'>;
export type Operation = Tables<'operations'>;
export type OperationCost = Tables<'operation_costs'>;
export type OperationCategory = Enums<'operation_category'>;
export type EntityStatus = Enums<'entity_status'>;

export interface OperationWithBalance extends OperationBalance {
  // Additional fields if needed
}

export interface CreateOperationData {
  name: string;
  description?: string | null;
  category: OperationCategory;
  status?: EntityStatus;
  is_public?: boolean;
  display_order?: number;
}

export interface UpdateOperationData {
  name?: string;
  description?: string | null;
  category?: OperationCategory;
  status?: EntityStatus;
  is_public?: boolean;
  display_order?: number;
}

export interface CreateOperationCostData {
  operation_id: string;
  amount_cents: number;
  description: string;
  category: OperationCategory;
  occurred_at?: string;
  receipt_url?: string | null;
  currency_code?: string;
}

export interface UpdateOperationCostData {
  amount_cents?: number;
  description?: string;
  category?: OperationCategory;
  occurred_at?: string;
  receipt_url?: string | null;
}

export const operationsApi = {
  /**
   * Fetch operations with balance data from vw_operation_balances
   */
  async fetchOperations(params?: {
    searchQuery?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: OperationBalance[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('vw_operation_balances')
      .select('*', { count: 'exact' })
      .order('operation_name');

    // Apply search if provided
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      query = query.ilike('operation_name', `%${params.searchQuery.trim()}%`);
    }

    const { data, error, count: totalCount } = await query.range(from, to);

    if (error) throw error;

    const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1;

    return {
      data: (data || []) as OperationBalance[],
      count: totalCount || 0,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Fetch single operation by ID with full details
   */
  async fetchOperationById(operationId: string): Promise<Operation | null> {
    const { data, error } = await supabase
      .from('operations')
      .select('*')
      .eq('id', operationId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
    }

    return data as Operation;
  },

  /**
   * Create a new operation
   */
  async createOperation(data: CreateOperationData): Promise<Operation> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const insertData = {
      ...data,
      created_by: user?.id || null,
      status: data.status || ('draft' as EntityStatus),
      is_public: data.is_public ?? true,
      display_order: data.display_order ?? 0,
    };

    const { data: operation, error } = await supabase
      .from('operations')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return operation as Operation;
  },

  /**
   * Update an existing operation
   */
  async updateOperation(
    operationId: string,
    updates: UpdateOperationData
  ): Promise<Operation> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('operations')
      .update(updateData)
      .eq('id', operationId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    return data as Operation;
  },

  /**
   * Soft delete an operation (set deleted_at)
   */
  async deleteOperation(operationId: string): Promise<void> {
    const { error } = await supabase
      .from('operations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', operationId)
      .is('deleted_at', null);

    if (error) throw error;
  },

  /**
   * Fetch operation costs for an operation
   */
  async fetchOperationCosts(operationId: string): Promise<OperationCost[]> {
    const { data, error } = await supabase
      .from('operation_costs')
      .select('*')
      .eq('operation_id', operationId)
      .order('occurred_at', { ascending: false });

    if (error) throw error;

    return (data || []) as OperationCost[];
  },

  /**
   * Create a new operation cost
   */
  async createOperationCost(
    data: CreateOperationCostData
  ): Promise<OperationCost> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to create operation costs');
    }

    const insertData = {
      ...data,
      created_by: user.id,
      currency_code: data.currency_code || 'USD',
      occurred_at: data.occurred_at || new Date().toISOString(),
    };

    const { data: cost, error } = await supabase
      .from('operation_costs')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return cost as OperationCost;
  },

  /**
   * Update an existing operation cost
   */
  async updateOperationCost(
    costId: string,
    updates: UpdateOperationCostData
  ): Promise<OperationCost> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('operation_costs')
      .update(updateData)
      .eq('id', costId)
      .select()
      .single();

    if (error) throw error;

    return data as OperationCost;
  },

  /**
   * Delete an operation cost
   */
  async deleteOperationCost(costId: string): Promise<void> {
    const { error } = await supabase
      .from('operation_costs')
      .delete()
      .eq('id', costId);

    if (error) throw error;
  },
};
