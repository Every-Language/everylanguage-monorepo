import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { EntityCard } from './EntityCard';
import type { DonateFlow } from '../../hooks/useDonateFlow';
import type { SelectedEntity, DonationIntent } from '../../state/types';
import {
  fetchOperationsForDonation,
  fetchLanguagesForDonationPaginated,
  fetchRegionsForDonationPaginated,
  type EntityForDonation,
} from '../../api/fundingApi';
import { Pagination } from '@/shared/components/ui/Pagination';

export const StepEntitySelection: React.FC<{ flow: DonateFlow }> = ({
  flow,
}) => {
  const pageSize = 25;
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [entities, setEntities] = React.useState<EntityForDonation[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);

  const intent = flow.state.intent;

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

  const normalizedQuery = debouncedQuery.trim();
  const hasSearch = normalizedQuery.length >= 2;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [intent?.type, normalizedQuery]);

  // Fetch entities based on intent type
  React.useEffect(() => {
    const fetchEntities = async () => {
      setLoading(true);
      try {
        let data: EntityForDonation[] = [];
        let count = 0;
        if (intent?.type === 'language') {
          const result = await fetchLanguagesForDonationPaginated({
            page: currentPage,
            pageSize,
            searchQuery: hasSearch ? normalizedQuery : undefined,
          });
          data = result.data;
          count = result.count;
        } else if (intent?.type === 'region') {
          const result = await fetchRegionsForDonationPaginated({
            page: currentPage,
            pageSize,
            searchQuery: hasSearch ? normalizedQuery : undefined,
          });
          data = result.data;
          count = result.count;
        } else if (intent?.type === 'operation') {
          const operations = await fetchOperationsForDonation();
          const filtered = hasSearch
            ? operations.filter(entity =>
                entity.name
                  .toLowerCase()
                  .includes(normalizedQuery.toLowerCase())
              )
            : operations;
          count = filtered.length;
          const from = (currentPage - 1) * pageSize;
          data = filtered.slice(from, from + pageSize);
        } else {
          data = [];
          count = 0;
        }
        setEntities(data);
        setTotalCount(data.length === 0 ? 0 : count);
      } catch (error) {
        console.error('Failed to fetch entities:', error);
      } finally {
        setLoading(false);
      }
    };

    if (intent?.type && intent.type !== 'unrestricted') {
      fetchEntities();
    }
  }, [intent?.type, currentPage, pageSize, hasSearch, normalizedQuery]);

  // Handle entity selection - immediately proceed to amount entry
  const handleSelectEntity = (entity: EntityForDonation) => {
    const selectedEntity: SelectedEntity = {
      id: entity.id,
      type: entityType,
      name: entity.name,
      budgetCents: entity.budgetCents,
    };

    // Set selected entity in flow state
    flow.setSelectedEntity(selectedEntity);

    // Update intent with the selected entity ID
    if (intent) {
      const updatedIntent: DonationIntent = {
        ...intent,
        ...(intent.type === 'language'
          ? { languageEntityId: entity.id }
          : intent.type === 'region'
            ? { regionId: entity.id }
            : { operationId: entity.id }),
        displayName: entity.name,
      };
      flow.setIntent(updatedIntent);
    }

    // Navigate to next step (amount entry)
    flow.next();
  };

  if (!intent || intent.type === 'unrestricted') {
    // Should not happen, but handle gracefully
    return null;
  }

  return (
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
      ) : entities.length === 0 ? (
        <div className='text-sm text-neutral-500 py-8 text-center'>
          {hasSearch
            ? `No ${entityTypeLabel}s found matching "${searchQuery}"`
            : `No ${entityTypeLabel}s available`}
        </div>
      ) : (
        <div className='space-y-2'>
          {entities.map(entity => (
            <EntityCard
              key={entity.id}
              entity={entity}
              onClick={() => handleSelectEntity(entity)}
            />
          ))}
        </div>
      )}

      {!loading && entities.length > 0 && totalCount > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.max(1, Math.ceil(totalCount / pageSize))}
          totalItems={totalCount}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          visibleItemsCount={entities.length}
          useVisibleItemsSummary={hasSearch}
          showInfo
        />
      )}
    </div>
  );
};

export default StepEntitySelection;
