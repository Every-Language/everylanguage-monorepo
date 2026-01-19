import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/shared/services/supabase';
import {
  fetchLanguagesForDonationPaginated,
  fetchRegionsForDonationPaginated,
} from './fundingApi';

vi.mock('@/shared/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

type QueryResponse = {
  data: unknown[] | null;
  error: null;
  count: number | null;
};

const createQueryMock = (response: QueryResponse) => ({
  select: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockResolvedValue(response),
});

describe('fundingApi pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('paginates languages with server-side search', async () => {
    const query = createQueryMock({
      data: [
        {
          language_entity_id: 'lang-1',
          remaining_budget_cents: 1200,
          language_entities: { id: 'lang-1', name: 'English' },
        },
      ],
      error: null,
      count: 40,
    });

    vi.mocked(supabase.from).mockReturnValue(query as never);

    const result = await fetchLanguagesForDonationPaginated({
      page: 2,
      pageSize: 25,
      searchQuery: 'en',
    });

    expect(supabase.from).toHaveBeenCalledWith('language_funding_balances');
    expect(query.ilike).toHaveBeenCalledWith('language_entities.name', '%en%');
    expect(query.order).toHaveBeenCalledWith('name', {
      ascending: true,
      referencedTable: 'language_entities',
    });
    expect(query.range).toHaveBeenCalledWith(25, 49);
    expect(result).toEqual({
      data: [{ id: 'lang-1', name: 'English', budgetCents: 1200 }],
      count: 40,
      page: 2,
      pageSize: 25,
      totalPages: 2,
    });
  });

  it('paginates regions without search', async () => {
    const query = createQueryMock({
      data: [
        {
          region_id: 'region-1',
          remaining_budget_cents: 500,
          region_name: 'West Africa',
        },
      ],
      error: null,
      count: 1,
    });

    vi.mocked(supabase.from).mockReturnValue(query as never);

    const result = await fetchRegionsForDonationPaginated({
      page: 1,
      pageSize: 25,
    });

    expect(supabase.from).toHaveBeenCalledWith('region_funding_cached');
    expect(query.ilike).not.toHaveBeenCalled();
    expect(query.order).toHaveBeenCalledWith('remaining_budget_cents', {
      ascending: false,
    });
    expect(query.range).toHaveBeenCalledWith(0, 24);
    expect(result).toEqual({
      data: [{ id: 'region-1', name: 'West Africa', budgetCents: 500 }],
      count: 1,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    });
  });
});
