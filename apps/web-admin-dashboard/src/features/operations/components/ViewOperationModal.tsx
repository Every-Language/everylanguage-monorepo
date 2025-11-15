import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operationsApi } from '../api/operationsApi';
import type {
  Operation,
  OperationCost,
  OperationCategory,
  EntityStatus,
} from '../api/operationsApi';
import { X, Edit, Save, Plus, Trash2 } from 'lucide-react';

const OPERATION_CATEGORIES: OperationCategory[] = [
  'travel',
  'administration',
  'legal',
  'server',
  'marketing',
  'development',
];

const STATUS_OPTIONS: EntityStatus[] = [
  'draft',
  'available',
  'funded',
  'archived',
];

interface ViewOperationModalProps {
  operationId: string;
  onClose: () => void;
}

export function ViewOperationModal({
  operationId,
  onClose,
}: ViewOperationModalProps) {
  const queryClient = useQueryClient();
  const [isClosing, setIsClosing] = useState(false);
  const [isEntering, setIsEntering] = useState(true);

  // Section editing states
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [showAddCostForm, setShowAddCostForm] = useState(false);

  // Fetch operation
  const { data: operation, isLoading: isLoadingOperation } = useQuery({
    queryKey: ['operation', operationId],
    queryFn: () => operationsApi.fetchOperationById(operationId),
  });

  // Fetch operation costs
  const { data: costs, isLoading: isLoadingCosts } = useQuery({
    queryKey: ['operation-costs', operationId],
    queryFn: () => operationsApi.fetchOperationCosts(operationId),
  });

  // Form states for Operation Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<OperationCategory>('administration');
  const [status, setStatus] = useState<EntityStatus>('draft');
  const [isPublic, setIsPublic] = useState(true);

  // Form states for Cost
  const [costAmount, setCostAmount] = useState('');
  const [costDescription, setCostDescription] = useState('');
  const [costCategory, setCostCategory] =
    useState<OperationCategory>('administration');
  const [costOccurredAt, setCostOccurredAt] = useState('');
  const [costReceiptUrl, setCostReceiptUrl] = useState('');

  // Sync form states with fetched data
  useEffect(() => {
    if (operation) {
      setName(operation.name);
      setDescription(operation.description || '');
      setCategory(operation.category);
      setStatus(operation.status);
      setIsPublic(operation.is_public);
    }
  }, [operation]);

  useEffect(() => {
    setIsEntering(false);
  }, []);

  // Mutations
  const updateInfoMutation = useMutation({
    mutationFn: async () => {
      if (!operation) return;
      await operationsApi.updateOperation(operation.id, {
        name,
        description: description || null,
        category,
        status,
        is_public: isPublic,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operation', operationId] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      setEditingInfo(false);
    },
  });

  const createCostMutation = useMutation({
    mutationFn: async () => {
      if (!operation) return;
      await operationsApi.createOperationCost({
        operation_id: operation.id,
        amount_cents: Math.round(parseFloat(costAmount) * 100),
        description: costDescription,
        category: costCategory,
        occurred_at: costOccurredAt || undefined,
        receipt_url: costReceiptUrl || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['operation-costs', operationId],
      });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      resetCostForm();
    },
  });

  const updateCostMutation = useMutation({
    mutationFn: async (costId: string) => {
      await operationsApi.updateOperationCost(costId, {
        amount_cents: Math.round(parseFloat(costAmount) * 100),
        description: costDescription,
        category: costCategory,
        occurred_at: costOccurredAt || undefined,
        receipt_url: costReceiptUrl || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['operation-costs', operationId],
      });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      setEditingCostId(null);
      resetCostForm();
    },
  });

  const deleteCostMutation = useMutation({
    mutationFn: async (costId: string) => {
      await operationsApi.deleteOperationCost(costId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['operation-costs', operationId],
      });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
    },
  });

  const resetCostForm = () => {
    setCostAmount('');
    setCostDescription('');
    setCostCategory('administration');
    setCostOccurredAt('');
    setCostReceiptUrl('');
    setShowAddCostForm(false);
    setEditingCostId(null);
  };

  const handleStartEditCost = (cost: OperationCost) => {
    setEditingCostId(cost.id);
    setCostAmount((cost.amount_cents / 100).toFixed(2));
    setCostDescription(cost.description);
    setCostCategory(cost.category);
    // Extract date part from ISO string
    const dateStr = cost.occurred_at.includes('T')
      ? cost.occurred_at.split('T')[0]
      : cost.occurred_at.split(' ')[0];
    setCostOccurredAt(dateStr);
    setCostReceiptUrl(cost.receipt_url || '');
    setShowAddCostForm(false);
  };

  const handleCancelEditCost = () => {
    resetCostForm();
  };

  const handleSaveCost = () => {
    if (!costAmount || !costDescription) return;
    if (editingCostId) {
      updateCostMutation.mutate(editingCostId);
    } else {
      createCostMutation.mutate();
    }
  };

  const handleDeleteCost = (costId: string) => {
    if (confirm('Are you sure you want to delete this cost?')) {
      deleteCostMutation.mutate(costId);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const formatCategory = (cat: OperationCategory): string => {
    return cat
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatCurrency = (cents: number): string => {
    return `$${((cents || 0) / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoadingOperation) {
    return (
      <div className='fixed inset-0 z-50 overflow-hidden'>
        <div className='absolute inset-0 bg-black/50' onClick={handleClose} />
        <div className='absolute inset-y-0 right-0 max-w-3xl w-full bg-white dark:bg-neutral-900 shadow-xl flex flex-col'>
          <div className='flex-1 flex items-center justify-center'>
            <div className='text-center'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
              <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
                Loading operation...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!operation) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-50 overflow-hidden'>
      {/* Backdrop with fade animation */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ease-out ${
          isClosing ? 'opacity-0' : isEntering ? 'opacity-0' : 'opacity-50'
        }`}
        onClick={handleClose}
      />

      {/* Slide panel with animation */}
      <div
        className={`absolute inset-y-0 right-0 max-w-3xl w-full bg-white dark:bg-neutral-900 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          isClosing
            ? 'translate-x-full'
            : isEntering
              ? 'translate-x-full'
              : 'translate-x-0'
        }`}
      >
        {/* Header */}
        <div className='px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              {operation.name}
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              Operation Details
            </p>
          </div>
          <button
            onClick={handleClose}
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
          >
            <X className='h-5 w-5 text-neutral-600 dark:text-neutral-400' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-8'>
          {/* 1. Operation Information */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Operation Information
              </h3>
              {!editingInfo && (
                <button
                  onClick={() => setEditingInfo(true)}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'
                >
                  <Edit className='h-4 w-4' />
                  Edit
                </button>
              )}
            </div>
            <div className='space-y-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Name
                </label>
                {editingInfo ? (
                  <input
                    type='text'
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                  />
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {operation.name}
                  </p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Description
                </label>
                {editingInfo ? (
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                  />
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {operation.description || '—'}
                  </p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Category
                </label>
                {editingInfo ? (
                  <select
                    value={category}
                    onChange={e =>
                      setCategory(e.target.value as OperationCategory)
                    }
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                  >
                    {OPERATION_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {formatCategory(cat)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {formatCategory(operation.category)}
                  </p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Status
                </label>
                {editingInfo ? (
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as EntityStatus)}
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                  >
                    {STATUS_OPTIONS.map(stat => (
                      <option key={stat} value={stat}>
                        {stat.charAt(0).toUpperCase() + stat.slice(1)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Public
                </label>
                {editingInfo ? (
                  <div className='flex items-center'>
                    <input
                      type='checkbox'
                      checked={isPublic}
                      onChange={e => setIsPublic(e.target.checked)}
                      className='h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded'
                    />
                    <span className='ml-2 text-sm text-neutral-700 dark:text-neutral-300'>
                      Visible to donors
                    </span>
                  </div>
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {isPublic ? 'Yes' : 'No'}
                  </p>
                )}
              </div>
              {editingInfo && (
                <div className='flex gap-2 pt-2'>
                  <button
                    onClick={() => {
                      setEditingInfo(false);
                      setName(operation.name);
                      setDescription(operation.description || '');
                      setCategory(operation.category);
                      setStatus(operation.status);
                      setIsPublic(operation.is_public);
                    }}
                    className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateInfoMutation.mutate()}
                    disabled={updateInfoMutation.isPending}
                    className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'
                  >
                    <Save className='h-4 w-4' />
                    {updateInfoMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 2. Operation Costs */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Operation Costs
              </h3>
              {!showAddCostForm && !editingCostId && (
                <button
                  onClick={() => setShowAddCostForm(true)}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'
                >
                  <Plus className='h-4 w-4' />
                  Add Cost
                </button>
              )}
            </div>

            {/* Add/Edit Cost Form */}
            {(showAddCostForm || editingCostId) && (
              <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg mb-4 space-y-3'>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Amount ($) <span className='text-red-500'>*</span>
                    </label>
                    <input
                      type='number'
                      step='0.01'
                      min='0'
                      value={costAmount}
                      onChange={e => setCostAmount(e.target.value)}
                      className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      placeholder='0.00'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Category <span className='text-red-500'>*</span>
                    </label>
                    <select
                      value={costCategory}
                      onChange={e =>
                        setCostCategory(e.target.value as OperationCategory)
                      }
                      className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                    >
                      {OPERATION_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {formatCategory(cat)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                    Description <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={costDescription}
                    onChange={e => setCostDescription(e.target.value)}
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                    placeholder='e.g., AWS hosting fees'
                  />
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Occurred At
                    </label>
                    <input
                      type='date'
                      value={costOccurredAt}
                      onChange={e => setCostOccurredAt(e.target.value)}
                      className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Receipt URL
                    </label>
                    <input
                      type='url'
                      value={costReceiptUrl}
                      onChange={e => setCostReceiptUrl(e.target.value)}
                      className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      placeholder='https://...'
                    />
                  </div>
                </div>
                <div className='flex gap-2 pt-2'>
                  <button
                    onClick={handleCancelEditCost}
                    className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCost}
                    disabled={
                      createCostMutation.isPending ||
                      updateCostMutation.isPending ||
                      !costAmount ||
                      !costDescription ||
                      isNaN(parseFloat(costAmount)) ||
                      parseFloat(costAmount) <= 0
                    }
                    className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'
                  >
                    <Save className='h-4 w-4' />
                    {editingCostId
                      ? updateCostMutation.isPending
                        ? 'Saving...'
                        : 'Save'
                      : createCostMutation.isPending
                        ? 'Creating...'
                        : 'Add Cost'}
                  </button>
                </div>
              </div>
            )}

            {/* Costs Table */}
            <div className='bg-neutral-50 dark:bg-neutral-800/50 rounded-lg overflow-hidden'>
              {isLoadingCosts ? (
                <div className='p-8 text-center'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
                  <p className='mt-2 text-sm text-neutral-600 dark:text-neutral-400'>
                    Loading costs...
                  </p>
                </div>
              ) : costs && costs.length > 0 ? (
                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
                    <thead className='bg-neutral-100 dark:bg-neutral-800'>
                      <tr>
                        <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          Date
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          Description
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          Category
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          Amount
                        </th>
                        <th className='px-4 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                      {costs.map(cost => (
                        <tr key={cost.id}>
                          <td className='px-4 py-3 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100'>
                            {formatDate(cost.occurred_at)}
                          </td>
                          <td className='px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100'>
                            {cost.description}
                          </td>
                          <td className='px-4 py-3 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                            <span className='px-2 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'>
                              {formatCategory(cost.category)}
                            </span>
                          </td>
                          <td className='px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                            {formatCurrency(cost.amount_cents)}
                          </td>
                          <td className='px-4 py-3 whitespace-nowrap text-right text-sm font-medium'>
                            <div className='flex items-center justify-end gap-2'>
                              <button
                                onClick={() => handleStartEditCost(cost)}
                                disabled={
                                  editingCostId === cost.id ||
                                  showAddCostForm ||
                                  editingCostId !== null
                                }
                                className='p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors disabled:opacity-50'
                                title='Edit'
                              >
                                <Edit className='h-4 w-4' />
                              </button>
                              <button
                                onClick={() => handleDeleteCost(cost.id)}
                                disabled={deleteCostMutation.isPending}
                                className='p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50'
                                title='Delete'
                              >
                                <Trash2 className='h-4 w-4' />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className='p-8 text-center text-neutral-500 dark:text-neutral-400'>
                  No costs recorded yet
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
