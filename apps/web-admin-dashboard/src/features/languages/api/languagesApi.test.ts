import { describe, it, expect, vi, beforeEach } from 'vitest';
import { languagesApi } from './languagesApi';
import { supabase } from '@/shared/services/supabase';

// Mock Supabase
vi.mock('@/shared/services/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}));

describe('languagesApi', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLanguageEntity', () => {
    it('should set created_by for non-external sources', async () => {
      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const mockEntity = { id: 'entity-123', name: 'Test Language' };
      const mockEntityInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockEntity,
            error: null,
          }),
        }),
      });

      let sourcesInsertData: unknown[] = [];
      const mockSourcesInsert = vi.fn((data: unknown[]) => {
        sourcesInsertData = data as unknown[];
        return Promise.resolve({ data: null, error: null });
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'language_entities') {
          return {
            insert: mockEntityInsert,
          } as never;
        }
        if (table === 'language_entity_sources') {
          return {
            insert: mockSourcesInsert,
          } as never;
        }
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as never;
      });

      await languagesApi.createLanguageEntity({
        name: 'Test Language',
        level: 'language',
        sources: [
          {
            source: 'Manual Entry',
            is_external: false,
          },
        ],
      });

      // Verify getUser was called
      expect(supabase.auth.getUser).toHaveBeenCalled();

      // Verify sources insert was called with created_by
      expect(mockSourcesInsert).toHaveBeenCalled();
      expect(sourcesInsertData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            created_by: 'user-123',
            is_external: false,
          }),
        ])
      );
    });

    it('should set created_by to null for external sources', async () => {
      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const mockEntity = { id: 'entity-123', name: 'Test Language' };
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockEntity,
            error: null,
          }),
        }),
      });

      let sourcesInsertData: unknown[] = [];
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'language_entities') {
          return {
            insert: mockInsert,
          } as never;
        }
        if (table === 'language_entity_sources') {
          return {
            insert: vi.fn((data: unknown[]) => {
              sourcesInsertData = data as unknown[];
              return Promise.resolve({ data: null, error: null });
            }),
          } as never;
        }
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as never;
      });

      await languagesApi.createLanguageEntity({
        name: 'Test Language',
        level: 'language',
        sources: [
          {
            source: 'Ethnologue',
            is_external: true,
            external_id: 'eth-123',
            external_id_type: 'ethnologue',
          },
        ],
      });

      // Verify sources insert was called with created_by: null
      expect(sourcesInsertData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            created_by: null,
            is_external: true,
            external_id: 'eth-123',
          }),
        ])
      );
    });

    it('should handle mixed sources (external and non-external)', async () => {
      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      const mockEntity = { id: 'entity-123', name: 'Test Language' };
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockEntity,
            error: null,
          }),
        }),
      });

      let sourcesInsertData: unknown[] = [];
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'language_entities') {
          return {
            insert: mockInsert,
          } as never;
        }
        if (table === 'language_entity_sources') {
          return {
            insert: vi.fn((data: unknown[]) => {
              sourcesInsertData = data as unknown[];
              return Promise.resolve({ data: null, error: null });
            }),
          } as never;
        }
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as never;
      });

      await languagesApi.createLanguageEntity({
        name: 'Test Language',
        level: 'language',
        sources: [
          {
            source: 'Manual Entry',
            is_external: false,
          },
          {
            source: 'Ethnologue',
            is_external: true,
            external_id: 'eth-123',
            external_id_type: 'ethnologue',
          },
        ],
      });

      // Verify mixed sources
      expect(sourcesInsertData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            created_by: 'user-123',
            is_external: false,
          }),
          expect.objectContaining({
            created_by: null,
            is_external: true,
          }),
        ])
      );
    });

    it('should throw error when user is not authenticated', async () => {
      // Mock no authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      await expect(
        languagesApi.createLanguageEntity({
          name: 'Test Language',
          level: 'language',
          sources: [
            {
              source: 'Manual Entry',
              is_external: false,
            },
          ],
        })
      ).rejects.toThrow(
        'User must be authenticated to create a language entity'
      );
    });
  });

  describe('createLanguageEntitySource', () => {
    it('should set created_by for non-external source', async () => {
      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      let insertData: unknown = null;
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn((data: unknown) => {
          insertData = data;
          return Promise.resolve({ data: null, error: null });
        }),
      } as never);

      await languagesApi.createLanguageEntitySource('entity-123', {
        source: 'Manual Entry',
        is_external: false,
      });

      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(insertData).toEqual(
        expect.objectContaining({
          created_by: 'user-123',
          is_external: false,
        })
      );
    });

    it('should set created_by to null for external source', async () => {
      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      let insertData: unknown = null;
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn((data: unknown) => {
          insertData = data;
          return Promise.resolve({ data: null, error: null });
        }),
      } as never);

      await languagesApi.createLanguageEntitySource('entity-123', {
        source: 'Ethnologue',
        is_external: true,
        external_id: 'eth-123',
        external_id_type: 'ethnologue',
      });

      expect(insertData).toEqual(
        expect.objectContaining({
          created_by: null,
          is_external: true,
        })
      );
    });

    it('should throw error when user is not authenticated for non-external source', async () => {
      // Mock no authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      await expect(
        languagesApi.createLanguageEntitySource('entity-123', {
          source: 'Manual Entry',
          is_external: false,
        })
      ).rejects.toThrow(
        'User must be authenticated to create a non-external language source'
      );
    });
  });

  describe('updateLanguageEntitySource', () => {
    it('should set created_by when updating is_external to false', async () => {
      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      let updateData: unknown = null;
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn((data: unknown) => {
          updateData = data;
          return {
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      } as never);

      await languagesApi.updateLanguageEntitySource('source-123', {
        is_external: false,
      });

      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(updateData).toEqual(
        expect.objectContaining({
          is_external: false,
          created_by: 'user-123',
        })
      );
    });

    it('should set created_by to null when updating is_external to true', async () => {
      // Mock authenticated user (not required for external, but we still call it)
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      let updateData: unknown = null;
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn((data: unknown) => {
          updateData = data;
          return {
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      } as never);

      await languagesApi.updateLanguageEntitySource('source-123', {
        is_external: true,
      });

      expect(updateData).toEqual(
        expect.objectContaining({
          is_external: true,
          created_by: null,
        })
      );
    });

    it('should throw error when user is not authenticated and updating to non-external', async () => {
      // Mock no authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      await expect(
        languagesApi.updateLanguageEntitySource('source-123', {
          is_external: false,
        })
      ).rejects.toThrow(
        'User must be authenticated to update a language source to non-external'
      );
    });

    it('should not modify created_by when is_external is not being updated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as never);

      let updateData: unknown = null;
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn((data: unknown) => {
          updateData = data;
          return {
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      } as never);

      await languagesApi.updateLanguageEntitySource('source-123', {
        source: 'Updated Source',
      });

      // Should not include created_by when is_external is not being updated
      expect(updateData).toEqual(
        expect.objectContaining({
          source: 'Updated Source',
        })
      );
      expect(updateData).not.toHaveProperty('created_by');
    });
  });
});
