import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { languageAvailabilityApi } from '../api/languageAvailabilityApi';
import { languagesApi } from '@/features/languages/api/languagesApi';
import { regionsApi } from '@/features/regions/api/regionsApi';
import type { LanguageFundingStatus, LanguageEntityWithRegions } from '@/types';
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  X as XIcon,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { Select, SelectItem } from '@everylanguage/shared-ui';

// Component for draft language row with external IDs
function DraftLanguageRow({
  language,
  onAddLanguage,
  onCloseModal,
  isPending,
}: {
  language: LanguageEntityWithRegions;
  onAddLanguage: (id: string) => void;
  onCloseModal: () => void;
  isPending: boolean;
}) {
  // Fetch language entity sources for external IDs
  const { data: sources } = useQuery({
    queryKey: ['language-entity-sources', language.id],
    queryFn: () => languagesApi.fetchLanguageEntitySources(language.id),
    staleTime: 5 * 60 * 1000,
  });

  const externalIds =
    sources
      ?.filter(s => s.external_id && s.external_id_type)
      .map(s => `${s.external_id_type}:${s.external_id}`) || [];

  return (
    <tr className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors'>
      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
        {language.name}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
        <span className='px-2 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'>
          {language.level}
        </span>
      </td>
      <td className='px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400'>
        {externalIds.length > 0 ? (
          <div className='flex flex-col gap-1'>
            {externalIds.map((id, idx) => (
              <span key={idx} className='font-mono text-xs'>
                {id}
              </span>
            ))}
          </div>
        ) : (
          <span className='text-neutral-400 dark:text-neutral-600'>—</span>
        )}
      </td>
      <td className='px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400'>
        {language.regions && language.regions.length > 0 ? (
          <div className='flex flex-col gap-1'>
            {language.regions.map((region, idx) => (
              <span key={idx} className='text-xs'>
                {region.name}
              </span>
            ))}
          </div>
        ) : (
          <span className='text-neutral-400 dark:text-neutral-600'>—</span>
        )}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
        <button
          onClick={() => {
            onAddLanguage(language.id);
            onCloseModal();
          }}
          disabled={isPending}
          className='px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
          Add Language
        </button>
      </td>
    </tr>
  );
}

// Component for language row with external IDs
function LanguageAvailabilityRow({
  language,
  displayPriority,
  isReordering,
  editingBudget,
  budgetValue,
  onBudgetChange,
  onBudgetSave,
  onBudgetCancel,
  onBudgetStartEdit,
  editingPriority,
  priorityValue,
  onPriorityChange,
  onPrioritySave,
  onPriorityCancel,
  onPriorityStartEdit,
  onStatusChange,
  onDelete,
  updateBudgetMutation,
  updatePriorityMutation,
  updateStatusMutation,
  deleteMutation,
}: {
  language: LanguageEntityWithRegions;
  displayPriority: number | null;
  isReordering: boolean;
  editingBudget: string | null;
  budgetValue: string;
  onBudgetChange: (value: string) => void;
  onBudgetSave: (id: string) => void;
  onBudgetCancel: () => void;
  onBudgetStartEdit: (id: string, currentBudget: number | null) => void;
  editingPriority: string | null;
  priorityValue: string;
  onPriorityChange: (value: string) => void;
  onPrioritySave: (id: string) => void;
  onPriorityCancel: () => void;
  onPriorityStartEdit: (id: string, currentPriority: number | null) => void;
  onStatusChange: (id: string, status: LanguageFundingStatus) => void;
  onDelete: (id: string) => void;
  updateBudgetMutation: { isPending: boolean };
  updatePriorityMutation: { isPending: boolean };
  updateStatusMutation: { isPending: boolean };
  deleteMutation: { isPending: boolean };
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: language.id,
    disabled: !isReordering,
  });

  // Fetch language entity sources for external IDs
  const { data: sources } = useQuery({
    queryKey: ['language-entity-sources', language.id],
    queryFn: () => languagesApi.fetchLanguageEntitySources(language.id),
    staleTime: 5 * 60 * 1000,
  });

  const externalIds =
    sources
      ?.filter(s => s.external_id && s.external_id_type)
      .map(s => `${s.external_id_type}:${s.external_id}`) || [];

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`transition-colors ${
        isReordering
          ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
      } ${
        isDragging
          ? 'opacity-70 bg-primary-50/70 dark:bg-primary-900/30 shadow-sm'
          : ''
      }`}>
      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
        {language.name}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
        {editingBudget === language.id ? (
          <div className='flex items-center gap-2'>
            <span className='text-neutral-600 dark:text-neutral-400'>$</span>
            <input
              type='number'
              step='0.01'
              min='0'
              value={budgetValue}
              onChange={e => onBudgetChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onBudgetSave(language.id);
                } else if (e.key === 'Escape') {
                  onBudgetCancel();
                }
              }}
              className='w-24 px-2 py-1 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
              autoFocus
            />
            <button
              onClick={() => onBudgetSave(language.id)}
              disabled={updateBudgetMutation.isPending}
              className='p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50'>
              <Check className='h-4 w-4' />
            </button>
            <button
              onClick={onBudgetCancel}
              className='p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'>
              <XIcon className='h-4 w-4' />
            </button>
          </div>
        ) : (
          <div className='flex items-center gap-2'>
            <span className='text-neutral-900 dark:text-neutral-100'>
              {language.language_funding?.budget_cents
                ? `$${((language.language_funding.budget_cents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '—'}
            </span>
            <button
              onClick={() =>
                onBudgetStartEdit(
                  language.id,
                  language.language_funding?.budget_cents || null
                )
              }
              className='p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
              title='Edit budget'>
              <Edit2 className='h-3 w-3' />
            </button>
          </div>
        )}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
        {editingPriority === language.id && !isReordering ? (
          <div className='flex items-center gap-2'>
            <input
              type='number'
              step='1'
              min='0'
              value={priorityValue}
              onChange={e => onPriorityChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onPrioritySave(language.id);
                } else if (e.key === 'Escape') {
                  onPriorityCancel();
                }
              }}
              className='w-20 px-2 py-1 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
              autoFocus
            />
            <button
              onClick={() => onPrioritySave(language.id)}
              disabled={updatePriorityMutation.isPending}
              className='p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50'>
              <Check className='h-4 w-4' />
            </button>
            <button
              onClick={onPriorityCancel}
              className='p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'>
              <XIcon className='h-4 w-4' />
            </button>
          </div>
        ) : (
          <div className='flex items-center gap-2'>
            {isReordering && (
              <button
                type='button'
                {...attributes}
                {...listeners}
                className={`p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 touch-none ${
                  isDragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                title='Drag to reorder'>
                <GripVertical className='h-4 w-4' />
              </button>
            )}
            <span className='text-neutral-900 dark:text-neutral-100'>
              {displayPriority ?? '—'}
            </span>
            {!isReordering && (
              <button
                onClick={() =>
                  onPriorityStartEdit(
                    language.id,
                    language.language_funding?.priority ?? null
                  )
                }
                className='p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                title='Edit priority'>
                <Edit2 className='h-3 w-3' />
              </button>
            )}
          </div>
        )}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
        <div onClick={e => e.stopPropagation()} className='w-full'>
          <Select
            value={language.language_funding?.funding_status || 'draft'}
            onValueChange={value =>
              onStatusChange(language.id, value as LanguageFundingStatus)
            }
            disabled={updateStatusMutation.isPending}>
            <SelectItem value='draft'>Draft</SelectItem>
            <SelectItem value='available'>Available</SelectItem>
            <SelectItem value='in_progress'>In Progress</SelectItem>
            <SelectItem value='funded'>Funded</SelectItem>
            <SelectItem value='archived'>Archived</SelectItem>
          </Select>
        </div>
      </td>
      <td className='px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400'>
        {externalIds.length > 0 ? (
          <div className='flex flex-col gap-1'>
            {externalIds.map((id, idx) => (
              <span key={idx} className='font-mono text-xs'>
                {id}
              </span>
            ))}
          </div>
        ) : (
          <span className='text-neutral-400 dark:text-neutral-600'>—</span>
        )}
      </td>
      <td className='px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400'>
        {language.regions && language.regions.length > 0 ? (
          <div className='flex flex-col gap-1'>
            {language.regions.map((region, idx) => (
              <span key={idx} className='text-xs'>
                {region.name}
              </span>
            ))}
          </div>
        ) : (
          <span className='text-neutral-400 dark:text-neutral-600'>—</span>
        )}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
        {language.population !== null && language.population !== undefined ? (
          language.population === 0 ? (
            <span className='text-neutral-400 dark:text-neutral-600'>
              Unknown
            </span>
          ) : (
            language.population.toLocaleString('en-US')
          )
        ) : (
          <span className='text-neutral-400 dark:text-neutral-600'>—</span>
        )}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
        <button
          onClick={() => onDelete(language.id)}
          disabled={deleteMutation.isPending}
          className='px-3 py-1.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1'
          title='Delete language funding'>
          <Trash2 className='h-4 w-4' />
        </button>
      </td>
    </tr>
  );
}

export function LanguageAvailabilityPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalSearchTerm, setAddModalSearchTerm] = useState('');
  const [addModalDebouncedSearch, setAddModalDebouncedSearch] = useState('');
  const [addModalExternalIdSearch, setAddModalExternalIdSearch] = useState('');
  const [
    addModalDebouncedExternalIdSearch,
    setAddModalDebouncedExternalIdSearch,
  ] = useState('');
  const [addModalPage, setAddModalPage] = useState(1);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState<string>('');
  const [editingPriority, setEditingPriority] = useState<string | null>(null);
  const [priorityValue, setPriorityValue] = useState<string>('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [orderedLanguages, setOrderedLanguages] = useState<
    LanguageEntityWithRegions[]
  >([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'budget' | 'priority'>(
    'priority'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [externalIdSearch, setExternalIdSearch] = useState('');
  const [debouncedExternalIdSearch, setDebouncedExternalIdSearch] =
    useState('');
  const [regionFilters, setRegionFilters] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [regionSearchQuery, setRegionSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce add modal search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setAddModalDebouncedSearch(addModalSearchTerm);
      setAddModalPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [addModalSearchTerm]);

  // Debounce add modal external ID search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setAddModalDebouncedExternalIdSearch(addModalExternalIdSearch);
      setAddModalPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [addModalExternalIdSearch]);

  // Debounce external ID search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedExternalIdSearch(externalIdSearch);
      setPage(1); // Reset to page 1 on search
    }, 300);

    return () => clearTimeout(timer);
  }, [externalIdSearch]);

  // Fetch regions for filter
  const { data: searchedRegions } = useQuery({
    queryKey: ['region-search-filter', regionSearchQuery],
    queryFn: async () => {
      if (!regionSearchQuery || regionSearchQuery.length < 2) return [];
      const results = await regionsApi.fetchRegions({
        searchQuery: regionSearchQuery,
        page: 1,
        pageSize: 20,
      });
      return results.data;
    },
    enabled: regionSearchQuery.length >= 2,
  });

  // Fetch available languages
  const regionFilterIds = regionFilters.map(r => r.id);
  const { data: response, isLoading } = useQuery({
    queryKey: [
      'available-languages',
      page,
      pageSize,
      debouncedSearch,
      statusFilter,
      sortField,
      sortDirection,
      debouncedExternalIdSearch,
      regionFilterIds.join(','),
    ],
    queryFn: () =>
      languageAvailabilityApi.fetchAvailableLanguages({
        page,
        pageSize,
        searchQuery: debouncedSearch,
        statusFilter:
          statusFilter !== 'all'
            ? (statusFilter as LanguageFundingStatus)
            : undefined,
        sortField,
        sortDirection,
        externalIdSearch:
          debouncedExternalIdSearch.trim().length > 0
            ? debouncedExternalIdSearch.trim()
            : undefined,
        regionFilters: regionFilterIds.length > 0 ? regionFilterIds : undefined,
      }),
  });

  // Fetch all languages (with no funding record) for add modal
  const { data: allLanguagesResponse, isLoading: isLoadingAllLanguages } =
    useQuery({
      queryKey: [
        'all-languages',
        addModalPage,
        pageSize,
        addModalDebouncedSearch,
        addModalDebouncedExternalIdSearch,
      ],
      queryFn: () =>
        languageAvailabilityApi.fetchAllLanguages({
          page: addModalPage,
          pageSize,
          searchQuery: addModalDebouncedSearch,
          externalIdSearch:
            addModalDebouncedExternalIdSearch.trim().length > 0
              ? addModalDebouncedExternalIdSearch.trim()
              : undefined,
        }),
      enabled: showAddModal,
    });

  const languages = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;

  const isReordering = sortField === 'priority';

  useEffect(() => {
    setOrderedLanguages(prev => {
      if (!isReordering) {
        return prev.length > 0 ? [] : prev;
      }
      if (languages.length === 0) {
        return prev.length > 0 ? [] : prev;
      }
      const isSameOrder =
        prev.length === languages.length &&
        prev.every((language, index) => language.id === languages[index]?.id);
      return isSameOrder ? prev : languages;
    });
  }, [isReordering, languages]);

  const allLanguages = allLanguagesResponse?.data || [];
  const allLanguagesTotalCount = allLanguagesResponse?.count || 0;
  const allLanguagesTotalPages = allLanguagesResponse?.totalPages || 1;

  const handleSort = (field: 'name' | 'budget' | 'priority') => {
    if (field === 'priority') {
      setSortField('priority');
      setSortDirection('asc');
      setPage(1);
      return;
    }
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'budget' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const getSortIndicator = (field: 'name' | 'budget' | 'priority') => {
    if (field === 'priority') return null;
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const displayedLanguages = isReordering ? orderedLanguages : languages;
  const priorityDisplayById = useMemo((): Record<string, number> => {
    if (!isReordering) return {};
    return orderedLanguages.reduce<Record<string, number>>(
      (acc, language, i) => {
        acc[language.id] = i + 1;
        return acc;
      },
      {}
    );
  }, [isReordering, orderedLanguages]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (!isReordering) return;
    setActiveDragId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!isReordering) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedLanguages(prev => {
      const oldIndex = prev.findIndex(item => item.id === active.id);
      const newIndex = prev.findIndex(item => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return prev;
      }
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isReordering) return;
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const hasOrderChanged =
      orderedLanguages.length === languages.length &&
      orderedLanguages.some(
        (language, index) => language.id !== languages[index]?.id
      );
    if (!hasOrderChanged) return;
    reorderLanguagesMutation.mutate(orderedLanguages);
  };

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({
      languageId,
      status,
    }: {
      languageId: string;
      status: LanguageFundingStatus;
    }) =>
      languageAvailabilityApi.updateLanguageFundingStatus(languageId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-languages'] });
    },
  });

  // Update budget mutation
  const updateBudgetMutation = useMutation({
    mutationFn: ({
      languageId,
      budgetCents,
    }: {
      languageId: string;
      budgetCents: number | null;
    }) => languageAvailabilityApi.updateLanguageBudget(languageId, budgetCents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-languages'] });
      setEditingBudget(null);
    },
  });

  // Update priority mutation
  const updatePriorityMutation = useMutation({
    mutationFn: ({
      languageId,
      priority,
    }: {
      languageId: string;
      priority: number | null;
    }) => languageAvailabilityApi.updateLanguagePriority(languageId, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-languages'] });
      setEditingPriority(null);
    },
  });

  const reorderLanguagesMutation = useMutation({
    mutationFn: async (ordered: LanguageEntityWithRegions[]) => {
      const updates = ordered.map((language, index) =>
        languageAvailabilityApi.updateLanguagePriority(language.id, index + 1)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-languages'] });
    },
  });

  // Set language available mutation
  const setAvailableMutation = useMutation({
    mutationFn: (languageId: string) =>
      languageAvailabilityApi.setLanguageAvailable(languageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-languages'] });
      queryClient.invalidateQueries({ queryKey: ['all-languages'] });
    },
  });

  // Delete language funding mutation
  const deleteMutation = useMutation({
    mutationFn: (languageId: string) =>
      languageAvailabilityApi.deleteLanguageFunding(languageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-languages'] });
    },
  });

  const handleStatusChange = (
    languageId: string,
    newStatus: LanguageFundingStatus
  ) => {
    updateStatusMutation.mutate({ languageId, status: newStatus });
  };

  const handleAddLanguage = (languageId: string) => {
    setAvailableMutation.mutate(languageId);
  };

  const handleStartEditBudget = (
    languageId: string,
    currentBudget: number | null
  ) => {
    setEditingBudget(languageId);
    setBudgetValue(currentBudget ? (currentBudget / 100).toFixed(2) : '');
    setEditingPriority(null);
  };

  const handleStartEditPriority = (
    languageId: string,
    currentPriority: number | null
  ) => {
    setEditingPriority(languageId);
    setPriorityValue(
      currentPriority !== null && currentPriority !== undefined
        ? String(currentPriority)
        : ''
    );
    setEditingBudget(null);
  };

  const handleSaveBudget = (languageId: string) => {
    const budgetCents =
      budgetValue.trim() === ''
        ? null
        : Math.round(parseFloat(budgetValue) * 100);
    if (budgetCents !== null && (isNaN(budgetCents) || budgetCents < 0)) {
      return; // Invalid input
    }
    updateBudgetMutation.mutate({ languageId, budgetCents });
  };

  const handleCancelEditBudget = () => {
    setEditingBudget(null);
    setBudgetValue('');
  };

  const handleSavePriority = (languageId: string) => {
    const trimmedValue = priorityValue.trim();
    const priority =
      trimmedValue === '' ? null : Number.parseInt(trimmedValue, 10);

    if (
      priority !== null &&
      (!Number.isInteger(priority) || Number.isNaN(priority) || priority < 0)
    ) {
      return; // Invalid input
    }

    updatePriorityMutation.mutate({ languageId, priority });
  };

  const handleCancelEditPriority = () => {
    setEditingPriority(null);
    setPriorityValue('');
  };

  const handleDelete = (languageId: string) => {
    const language = languages.find(l => l.id === languageId);
    if (language) {
      const confirmed = window.confirm(
        `Are you sure you want to delete the funding record for "${language.name}"? This action cannot be undone.`
      );
      if (confirmed) {
        deleteMutation.mutate(languageId);
      }
    }
  };

  return (
    <div className='p-8'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
            Language Availability
          </h1>
          <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
            Manage language funding status and budgets
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => {
              setShowAddModal(true);
              setAddModalSearchTerm('');
              setAddModalExternalIdSearch('');
              setAddModalPage(1);
            }}
            className='inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors'>
            <Plus className='h-5 w-5 mr-2' />
            Add Language
          </button>
        </div>
      </div>

      {/* Search */}
      <div className='mb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
          <input
            type='text'
            placeholder='Search languages...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
          />
        </div>
      </div>

      <div className='mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4'>
        <Select
          label='Funding Status'
          value={statusFilter}
          onValueChange={value => {
            setStatusFilter(value);
            setPage(1);
          }}>
          <SelectItem value='all'>All statuses</SelectItem>
          <SelectItem value='draft'>Draft</SelectItem>
          <SelectItem value='available'>Available</SelectItem>
          <SelectItem value='in_progress'>In Progress</SelectItem>
          <SelectItem value='funded'>Funded</SelectItem>
          <SelectItem value='archived'>Archived</SelectItem>
        </Select>

        {/* External ID Search */}
        <div>
          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
            Search by External ID
          </label>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500' />
            <input
              type='text'
              placeholder='Search external IDs...'
              value={externalIdSearch}
              onChange={e => setExternalIdSearch(e.target.value)}
              className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
            />
          </div>
        </div>

        {/* Region Filter */}
        <div>
          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
            Filter by Regions (OR)
          </label>
          <div className='relative'>
            <input
              type='text'
              placeholder='Type to search and add regions...'
              value={regionSearchQuery}
              onChange={e => setRegionSearchQuery(e.target.value)}
              className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
            />
            {regionSearchQuery && (
              <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                <button
                  onClick={() => {
                    if (!regionFilters.find(r => r.id === 'none')) {
                      setRegionFilters(prev => [
                        ...prev,
                        { id: 'none', name: 'No Region' },
                      ]);
                      setPage(1);
                    }
                    setRegionSearchQuery('');
                  }}
                  className='w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm text-neutral-500 dark:text-neutral-400 italic border-b border-neutral-200 dark:border-neutral-800'>
                  No Region
                </button>
                {searchedRegions &&
                  searchedRegions.map(region => (
                    <button
                      key={region.id}
                      onClick={() => {
                        if (!regionFilters.find(r => r.id === region.id)) {
                          setRegionFilters(prev => [
                            ...prev,
                            { id: region.id, name: region.name },
                          ]);
                          setPage(1);
                        }
                        setRegionSearchQuery('');
                      }}
                      className='w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100'>
                      {region.name}{' '}
                      <span className='text-neutral-500 dark:text-neutral-400'>
                        ({region.level})
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Region filter pills */}
          {regionFilters.length > 0 && (
            <div className='flex flex-wrap gap-2 mt-2'>
              {regionFilters.map(region => (
                <span
                  key={region.id}
                  className='inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full text-sm'>
                  {region.name}
                  <button
                    onClick={() => {
                      setRegionFilters(prev =>
                        prev.filter(r => r.id !== region.id)
                      );
                      setPage(1);
                    }}
                    className='hover:text-primary-900 dark:hover:text-primary-100'>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 overflow-hidden'>
        {isLoading ? (
          <div className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
            <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
              Loading languages...
            </p>
          </div>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}>
              <SortableContext
                items={displayedLanguages.map(language => language.id)}
                strategy={verticalListSortingStrategy}>
                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
                    <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                      <tr>
                        <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          <button
                            type='button'
                            onClick={() => handleSort('name')}
                            className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                            Name
                            <span>{getSortIndicator('name')}</span>
                          </button>
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          <button
                            type='button'
                            onClick={() => handleSort('budget')}
                            className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                            Budget
                            <span>{getSortIndicator('budget')}</span>
                          </button>
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          <button
                            type='button'
                            onClick={() => handleSort('priority')}
                            className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                            Priority
                            <span>{getSortIndicator('priority')}</span>
                          </button>
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          Status
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          External IDs
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          Regions
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          Population
                        </th>
                        <th className='px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                      {displayedLanguages && displayedLanguages.length > 0 ? (
                        displayedLanguages.map(language => (
                          <LanguageAvailabilityRow
                            key={language.id}
                            language={language}
                            displayPriority={
                              isReordering
                                ? (priorityDisplayById[language.id] ?? null)
                                : (language.language_funding?.priority ?? null)
                            }
                            isReordering={isReordering}
                            editingBudget={editingBudget}
                            budgetValue={budgetValue}
                            onBudgetChange={setBudgetValue}
                            onBudgetSave={handleSaveBudget}
                            onBudgetCancel={handleCancelEditBudget}
                            onBudgetStartEdit={handleStartEditBudget}
                            editingPriority={editingPriority}
                            priorityValue={priorityValue}
                            onPriorityChange={setPriorityValue}
                            onPrioritySave={handleSavePriority}
                            onPriorityCancel={handleCancelEditPriority}
                            onPriorityStartEdit={handleStartEditPriority}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDelete}
                            updateBudgetMutation={updateBudgetMutation}
                            updatePriorityMutation={updatePriorityMutation}
                            updateStatusMutation={updateStatusMutation}
                            deleteMutation={deleteMutation}
                          />
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={8}
                            className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'>
                            {debouncedSearch
                              ? 'No languages found matching your search'
                              : 'No languages found'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SortableContext>
              <DragOverlay>
                {activeDragId ? (
                  <div className='rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 shadow-lg'>
                    {displayedLanguages.find(
                      language => language.id === activeDragId
                    )?.name ?? 'Dragging'}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='mt-4 flex items-center justify-between px-6 py-3 border-t border-neutral-200 dark:border-neutral-800'>
                <div className='text-sm text-neutral-600 dark:text-neutral-400'>
                  Page {page} of {totalPages} ({totalCount.toLocaleString()}{' '}
                  total)
                </div>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                    <ChevronLeft className='h-4 w-4' />
                  </button>
                  <span className='text-sm text-neutral-600 dark:text-neutral-400 min-w-[100px] text-center'>
                    {((page - 1) * pageSize + 1).toLocaleString()} -{' '}
                    {Math.min(page * pageSize, totalCount).toLocaleString()}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                    <ChevronRight className='h-4 w-4' />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Language Modal */}
      {showAddModal && (
        <div className='fixed inset-0 z-50 overflow-y-auto'>
          <div className='flex min-h-screen items-center justify-center p-4'>
            <div
              className='fixed inset-0 bg-black/50 transition-opacity'
              onClick={() => {
                setShowAddModal(false);
                setAddModalSearchTerm('');
                setAddModalExternalIdSearch('');
                setAddModalPage(1);
              }}
            />
            <div className='relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-4xl w-full h-[80vh] overflow-hidden flex flex-col'>
              {/* Header */}
              <div className='flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0'>
                <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
                  Add Language
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setAddModalSearchTerm('');
                    setAddModalExternalIdSearch('');
                    setAddModalPage(1);
                  }}
                  className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'>
                  <X className='h-5 w-5 text-neutral-500 dark:text-neutral-400' />
                </button>
              </div>

              {/* Search */}
              <div className='p-6 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0 space-y-3'>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
                  <input
                    type='text'
                    placeholder='Search languages by name...'
                    value={addModalSearchTerm}
                    onChange={e => setAddModalSearchTerm(e.target.value)}
                    className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
                  />
                </div>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
                  <input
                    type='text'
                    placeholder='Search languages by external ID...'
                    value={addModalExternalIdSearch}
                    onChange={e => setAddModalExternalIdSearch(e.target.value)}
                    className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
                  />
                </div>
              </div>

              {/* Table */}
              <div className='flex-1 overflow-y-auto min-h-0'>
                {isLoadingAllLanguages ? (
                  <div className='p-8 text-center'>
                    <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
                    <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
                      Loading languages...
                    </p>
                  </div>
                ) : (
                  <div className='overflow-x-auto'>
                    <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
                      <thead className='bg-neutral-50 dark:bg-neutral-800/50 sticky top-0'>
                        <tr>
                          <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Name
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Level
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            External IDs
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Regions
                          </th>
                          <th className='px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                        {allLanguages && allLanguages.length > 0 ? (
                          allLanguages.map(language => (
                            <DraftLanguageRow
                              key={language.id}
                              language={language}
                              onAddLanguage={handleAddLanguage}
                              onCloseModal={() => setShowAddModal(false)}
                              isPending={setAvailableMutation.isPending}
                            />
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'>
                              {addModalDebouncedSearch ||
                              addModalDebouncedExternalIdSearch
                                ? 'No languages found matching your search'
                                : 'No languages available to add'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {!isLoadingAllLanguages && allLanguagesTotalPages > 1 && (
                <div className='flex items-center justify-between px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 flex-shrink-0'>
                  <div className='text-sm text-neutral-600 dark:text-neutral-400'>
                    Page {addModalPage} of {allLanguagesTotalPages} (
                    {allLanguagesTotalCount.toLocaleString()} total)
                  </div>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => setAddModalPage(p => Math.max(1, p - 1))}
                      disabled={addModalPage === 1}
                      className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                      <ChevronLeft className='h-4 w-4' />
                    </button>
                    <span className='text-sm text-neutral-600 dark:text-neutral-400 min-w-[100px] text-center'>
                      {((addModalPage - 1) * pageSize + 1).toLocaleString()} -{' '}
                      {Math.min(
                        addModalPage * pageSize,
                        allLanguagesTotalCount
                      ).toLocaleString()}
                    </span>
                    <button
                      onClick={() =>
                        setAddModalPage(p =>
                          Math.min(allLanguagesTotalPages, p + 1)
                        )
                      }
                      disabled={addModalPage === allLanguagesTotalPages}
                      className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                      <ChevronRight className='h-4 w-4' />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
