import { useQuery } from '@tanstack/react-query';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit2, Check, X as XIcon, Trash2, GripVertical } from 'lucide-react';
import { Select, SelectItem } from '@everylanguage/shared-ui';
import { languagesApi } from '@/features/languages/api/languagesApi';
import type { LanguageFundingStatus, LanguageEntityWithRegions } from '@/types';

interface LanguageAvailabilityRowProps {
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
}

export function LanguageAvailabilityRow({
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
}: LanguageAvailabilityRowProps): React.JSX.Element {
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
