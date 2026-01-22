import { describe, it, expect, vi, beforeEach } from 'vitest';
import { languageAvailabilityApi } from './languageAvailabilityApi';
import { supabase } from '@/shared/services/supabase';

vi.mock('@/shared/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('languageAvailabilityApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateLanguagePriority', () => {
    it('updates priority when funding record exists', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'funding-1' },
        error: null,
      });
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            maybeSingle: mockMaybeSingle,
          })),
        })),
      }));
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn().mockResolvedValue({ error: null }),
        })),
      }));
      const mockInsert = vi.fn();

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
        insert: mockInsert,
      } as never);

      await languageAvailabilityApi.updateLanguagePriority('lang-1', 2);

      expect(mockUpdate).toHaveBeenCalledWith({ priority: 2 });
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('creates funding record when none exists', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            maybeSingle: mockMaybeSingle,
          })),
        })),
      }));
      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      } as never);

      await languageAvailabilityApi.updateLanguagePriority('lang-1', null);

      expect(mockInsert).toHaveBeenCalledWith({
        language_entity_id: 'lang-1',
        funding_status: 'draft',
        budget_cents: null,
        priority: null,
      });
    });
  });
});
