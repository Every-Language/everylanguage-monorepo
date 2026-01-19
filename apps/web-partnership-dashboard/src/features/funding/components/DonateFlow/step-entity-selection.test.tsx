import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { render, screen, waitFor, userEvent } from '@/test/utils';
import { StepEntitySelection } from './StepEntitySelection';
import type { DonationIntent } from '../../state/types';
import type { DonateFlow } from '../../hooks/useDonateFlow';
import type { EntityForDonation } from '../../api/fundingApi';
import { fetchLanguagesForDonationPaginated } from '../../api/fundingApi';

vi.mock('../../api/fundingApi', () => ({
  fetchLanguagesForDonationPaginated: vi.fn(),
  fetchRegionsForDonationPaginated: vi.fn(),
  fetchOperationsForDonation: vi.fn(),
}));

const createFlow = (intent: DonationIntent): DonateFlow => ({
  state: { step: 0, intent },
  setDonor: vi.fn(),
  setDonorType: vi.fn(),
  setIntent: vi.fn(),
  setPaymentMethod: vi.fn(),
  setAmount: vi.fn(),
  setClientSecret: vi.fn(),
  setDonationId: vi.fn(),
  setCustomerId: vi.fn(),
  setPartnerOrgId: vi.fn(),
  setPaymentIntentId: vi.fn(),
  setSelectedEntity: vi.fn(),
  next: vi.fn(),
  back: vi.fn(),
  reset: vi.fn(),
  initializeWithState: vi.fn(),
});

describe('StepEntitySelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads paginated language results and shows pagination info', async () => {
    const entities: EntityForDonation[] = [
      { id: 'lang-1', name: 'English', budgetCents: 1000 },
    ];

    vi.mocked(fetchLanguagesForDonationPaginated).mockResolvedValue({
      data: entities,
      count: 2,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    });

    const flow = createFlow({ type: 'language' });

    render(<StepEntitySelection flow={flow} />);

    await waitFor(() => {
      expect(fetchLanguagesForDonationPaginated).toHaveBeenCalledWith({
        page: 1,
        pageSize: 25,
        searchQuery: undefined,
      });
    });

    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Showing 2 results')).toBeInTheDocument();
  });

  it('debounces name search and sends server-side query', async () => {
    const entities: EntityForDonation[] = [
      { id: 'lang-1', name: 'Spanish', budgetCents: 2000 },
    ];

    vi.mocked(fetchLanguagesForDonationPaginated).mockResolvedValue({
      data: entities,
      count: 1,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    });

    const flow = createFlow({ type: 'language' });
    const user = userEvent.setup();

    render(<StepEntitySelection flow={flow} />);

    const input = screen.getByPlaceholderText('Search languages...');
    await user.type(input, 'sp');

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    await waitFor(() => {
      expect(fetchLanguagesForDonationPaginated).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 25,
        searchQuery: 'sp',
      });
    });
  });
});
