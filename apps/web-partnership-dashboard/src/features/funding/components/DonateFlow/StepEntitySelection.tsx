import React from 'react';
import { Search, Info } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { TooltipProvider } from '@/shared/components/ui/Tooltip';
import { EntityCard } from './EntityCard';
import type { DonateFlow } from '../../hooks/useDonateFlow';
import type { SelectedEntity } from '../../state/types';
import {
  fetchLanguagesForDonation,
  fetchRegionsForDonation,
  fetchOperationsForDonation,
  type EntityForDonation,
} from '../../api/fundingApi';

export const StepEntitySelection: React.FC<{ flow: DonateFlow }> = ({
  flow,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [entities, setEntities] = React.useState<EntityForDonation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showFirstAddTooltip, setShowFirstAddTooltip] = React.useState(false);
  const [showMultiEditTooltip, setShowMultiEditTooltip] = React.useState(false);

  const intent = flow.state.intent;
  const selectedEntities = flow.state.selectedEntities || [];

  // Determine entity type from intent
  const entityType =
    intent?.type === 'language'
      ? 'language'
      : intent?.type === 'region'
        ? 'region'
        : 'operation';

  const entityTypeLabel =
    intent?.type === 'language'
      ? 'language'
      : intent?.type === 'region'
        ? 'region'
        : 'operation';

  // Fetch entities based on intent type
  React.useEffect(() => {
    const fetchEntities = async () => {
      setLoading(true);
      try {
        let data: EntityForDonation[];
        if (intent?.type === 'language') {
          data = await fetchLanguagesForDonation();
        } else if (intent?.type === 'region') {
          data = await fetchRegionsForDonation();
        } else if (intent?.type === 'operation') {
          data = await fetchOperationsForDonation();
        } else {
          data = [];
        }
        setEntities(data);
      } catch (error) {
        console.error('Failed to fetch entities:', error);
      } finally {
        setLoading(false);
      }
    };

    if (intent?.type && intent.type !== 'unrestricted') {
      fetchEntities();
    }
  }, [intent?.type]);

  // Filter entities by search query
  const filteredEntities = React.useMemo(() => {
    if (!searchQuery.trim()) return entities;
    const query = searchQuery.toLowerCase();
    return entities.filter(e => e.name.toLowerCase().includes(query));
  }, [entities, searchQuery]);

  // Check if entity is selected
  const isEntitySelected = (entityId: string): boolean => {
    return selectedEntities.some(
      e => e.id === entityId && e.type === entityType
    );
  };

  // Handle adding entity to cart
  const handleAddEntity = (entity: EntityForDonation) => {
    const isFirstAdd = selectedEntities.length === 0;
    const selectedEntity: SelectedEntity = {
      id: entity.id,
      type: entityType,
      name: entity.name,
      budgetCents: entity.budgetCents,
    };
    flow.addEntityToCart(selectedEntity);

    // Show tooltip on first add
    if (isFirstAdd) {
      setShowFirstAddTooltip(true);
      setTimeout(() => setShowFirstAddTooltip(false), 5000);
    }
  };

  // Show multi-edit tooltip when there are multiple items
  React.useEffect(() => {
    if (selectedEntities.length > 1) {
      setShowMultiEditTooltip(true);
      const timer = setTimeout(() => setShowMultiEditTooltip(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowMultiEditTooltip(false);
    }
  }, [selectedEntities.length]);

  if (!intent || intent.type === 'unrestricted') {
    // Should not happen, but handle gracefully
    return null;
  }

  return (
    <TooltipProvider>
      <div className='space-y-4'>
        <div className='text-sm text-neutral-600 dark:text-neutral-400'>
          Select {entityTypeLabel}s to support
        </div>

        {/* Search Input */}
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400' />
          <Input
            type='text'
            placeholder={`Search ${entityTypeLabel}s...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className='pl-9'
          />
        </div>

        {/* Entity List */}
        {loading ? (
          <div className='text-sm text-neutral-500 py-8 text-center'>
            Loading {entityTypeLabel}s...
          </div>
        ) : filteredEntities.length === 0 ? (
          <div className='text-sm text-neutral-500 py-8 text-center'>
            {searchQuery
              ? `No ${entityTypeLabel}s found matching "${searchQuery}"`
              : `No ${entityTypeLabel}s available`}
          </div>
        ) : (
          <div className='space-y-2 max-h-[600px] overflow-y-auto'>
            {filteredEntities.map(entity => (
              <EntityCard
                key={entity.id}
                entity={entity}
                isSelected={isEntitySelected(entity.id)}
                onAdd={() => handleAddEntity(entity)}
              />
            ))}
          </div>
        )}

        {/* First Add Tooltip */}
        {showFirstAddTooltip && (
          <div className='p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
            <div className='flex items-start gap-2'>
              <Info className='h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0' />
              <p className='text-sm text-blue-800 dark:text-blue-200'>
                Change the total if you just want to contribute to a{' '}
                {entityTypeLabel} without fully adopting it.
              </p>
            </div>
          </div>
        )}

        {/* Multi-Edit Tooltip */}
        {showMultiEditTooltip && (
          <div className='p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg'>
            <div className='flex items-start gap-2'>
              <Info className='h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0' />
              <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                If you want to contribute to a {entityTypeLabel}, select a
                single {entityTypeLabel} to contribute to.
              </p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default StepEntitySelection;
