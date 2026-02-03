import { UpdateType } from '@powersync/react-native';
import { PowerSyncConnector } from '../PowerSyncConnector';
import { supabase } from '@/shared/infrastructure/supabase/client';
import { env } from '@/shared/config/env/index';
import { logger } from '@/shared/utils/logger';
import type { AbstractPowerSyncDatabase } from '@powersync/react-native';

// Mock dependencies
jest.mock('@/shared/infrastructure/supabase/client');
jest.mock('@/shared/config/env');
jest.mock('@/shared/utils/logger');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockEnv = env as jest.Mocked<typeof env>;
const mockLogger = logger as jest.Mocked<typeof logger>;

const setPowerSyncEnv = (url: string | undefined): void => {
  Object.defineProperty(mockEnv, 'powersync', {
    configurable: true,
    value: { url } as typeof env.powersync,
  });
};

const getMockFromResult = (
  mockFrom: jest.Mock,
  index: number
): {
  upsert?: jest.Mock;
  update?: jest.Mock;
  delete?: jest.Mock;
} => {
  const result = mockFrom.mock.results[index]?.value as
    | { upsert?: jest.Mock; update?: jest.Mock; delete?: jest.Mock }
    | undefined;
  if (!result) {
    throw new Error('Expected Supabase client call result');
  }
  return result;
};

describe('PowerSyncConnector', () => {
  let connector: PowerSyncConnector;
  let mockDatabase: jest.Mocked<AbstractPowerSyncDatabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    connector = new PowerSyncConnector();

    // Setup default mocks
    setPowerSyncEnv('https://test-powersync.example.com');

    mockSupabase.auth = {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token-123',
            user: {
              id: 'user-123',
              email: 'test@example.com',
              is_anonymous: false,
            },
          },
        },
        error: null,
      }),
    } as any;

    // Mock database
    mockDatabase = {
      getNextCrudTransaction: jest.fn(),
    } as any;
  });

  describe('fetchCredentials', () => {
    it('should return credentials with authenticated user', async () => {
      const credentials = await connector.fetchCredentials();

      expect(credentials).toEqual({
        endpoint: 'https://test-powersync.example.com',
        token: 'test-token-123',
        parameters: {
          is_authenticated: 'true',
        },
      });
      expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1);
    });

    it('should return credentials with anonymous user', async () => {
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token-123',
            user: {
              id: 'user-123',
              is_anonymous: true,
            },
          },
        },
        error: null,
      }) as any;

      const credentials = await connector.fetchCredentials();

      expect(credentials?.parameters?.['is_authenticated']).toBe('false');
    });

    it('should throw error if PowerSync URL is not configured', async () => {
      setPowerSyncEnv(undefined);

      await expect(connector.fetchCredentials()).rejects.toThrow(
        'PowerSync URL not configured'
      );
    });

    it('should throw error if session error occurs', async () => {
      const sessionError = new Error('Session error');
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: sessionError,
      }) as any;

      await expect(connector.fetchCredentials()).rejects.toThrow(
        'Session error'
      );
    });

    it('should throw error if no access token available', async () => {
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: undefined,
            user: { id: 'user-123' },
          },
        },
        error: null,
      }) as any;

      await expect(connector.fetchCredentials()).rejects.toThrow(
        'No Supabase session available for credentials'
      );
    });

    it('should throw error if session is null', async () => {
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }) as any;

      await expect(connector.fetchCredentials()).rejects.toThrow(
        'No Supabase session available for credentials'
      );
    });
  });

  describe('uploadData', () => {
    let mockTransaction: {
      crud: Array<{
        table: string;
        op: UpdateType;
        id: string;
        opData: Record<string, unknown>;
      }>;
      complete: jest.Mock;
    };

    beforeEach(() => {
      mockTransaction = {
        crud: [],
        complete: jest.fn().mockResolvedValue(undefined),
      };
      mockDatabase.getNextCrudTransaction = jest
        .fn()
        .mockResolvedValue(mockTransaction);
    });

    it('should return early if no transaction available', async () => {
      mockDatabase.getNextCrudTransaction.mockResolvedValue(null);

      await connector.uploadData(mockDatabase);

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should batch PUT operations by table', async () => {
      mockTransaction.crud = [
        {
          table: 'projects',
          op: UpdateType.PUT,
          id: 'project-1',
          opData: { name: 'Project 1', description: 'Desc 1' },
        },
        {
          table: 'projects',
          op: UpdateType.PUT,
          id: 'project-2',
          opData: { name: 'Project 2', description: 'Desc 2' },
        },
        {
          table: 'sequences',
          op: UpdateType.PUT,
          id: 'seq-1',
          opData: { name: 'Sequence 1' },
        },
      ];

      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      mockSupabase.from = mockFrom as any;

      await connector.uploadData(mockDatabase);

      expect(mockFrom).toHaveBeenCalledTimes(2);
      expect(mockFrom).toHaveBeenCalledWith('projects');
      expect(mockFrom).toHaveBeenCalledWith('sequences');

      const projectsUpsert = getMockFromResult(mockFrom, 0).upsert;
      if (!projectsUpsert) {
        throw new Error('Expected projects upsert');
      }
      expect(projectsUpsert).toHaveBeenCalledWith(
        [
          { id: 'project-1', name: 'Project 1', description: 'Desc 1' },
          { id: 'project-2', name: 'Project 2', description: 'Desc 2' },
        ],
        { onConflict: 'id' }
      );

      const sequencesUpsert = getMockFromResult(mockFrom, 1).upsert;
      if (!sequencesUpsert) {
        throw new Error('Expected sequences upsert');
      }
      expect(sequencesUpsert).toHaveBeenCalledWith(
        [{ id: 'seq-1', name: 'Sequence 1' }],
        { onConflict: 'id' }
      );

      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
    });

    it('should handle PATCH operations individually', async () => {
      mockTransaction.crud = [
        {
          table: 'projects',
          op: UpdateType.PATCH,
          id: 'project-1',
          opData: { name: 'Updated Project', description: 'Updated Desc' },
        },
        {
          table: 'sequences',
          op: UpdateType.PATCH,
          id: 'seq-1',
          opData: { name: 'Updated Sequence' },
        },
      ];

      const mockFrom = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });
      mockSupabase.from = mockFrom as any;

      await connector.uploadData(mockDatabase);

      expect(mockFrom).toHaveBeenCalledTimes(2);
      expect(mockFrom).toHaveBeenCalledWith('projects');
      expect(mockFrom).toHaveBeenCalledWith('sequences');

      const projectsUpdate = getMockFromResult(mockFrom, 0).update;
      if (!projectsUpdate) {
        throw new Error('Expected projects update');
      }
      expect(projectsUpdate).toHaveBeenCalledWith({
        name: 'Updated Project',
        description: 'Updated Desc',
      });
      expect(projectsUpdate().eq).toHaveBeenCalledWith('id', 'project-1');

      const sequencesUpdate = getMockFromResult(mockFrom, 1).update;
      if (!sequencesUpdate) {
        throw new Error('Expected sequences update');
      }
      expect(sequencesUpdate).toHaveBeenCalledWith({
        name: 'Updated Sequence',
      });
      expect(sequencesUpdate().eq).toHaveBeenCalledWith('id', 'seq-1');

      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
    });

    it('should batch DELETE operations by table', async () => {
      mockTransaction.crud = [
        {
          table: 'projects',
          op: UpdateType.DELETE,
          id: 'project-1',
          opData: {},
        },
        {
          table: 'projects',
          op: UpdateType.DELETE,
          id: 'project-2',
          opData: {},
        },
        {
          table: 'sequences',
          op: UpdateType.DELETE,
          id: 'seq-1',
          opData: {},
        },
      ];

      const mockFrom = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });
      mockSupabase.from = mockFrom as any;

      await connector.uploadData(mockDatabase);

      expect(mockFrom).toHaveBeenCalledTimes(2);
      expect(mockFrom).toHaveBeenCalledWith('projects');
      expect(mockFrom).toHaveBeenCalledWith('sequences');

      const projectsDelete = getMockFromResult(mockFrom, 0).delete;
      if (!projectsDelete) {
        throw new Error('Expected projects delete');
      }
      expect(projectsDelete().in).toHaveBeenCalledWith('id', [
        'project-1',
        'project-2',
      ]);

      const sequencesDelete = getMockFromResult(mockFrom, 1).delete;
      if (!sequencesDelete) {
        throw new Error('Expected sequences delete');
      }
      expect(sequencesDelete().in).toHaveBeenCalledWith('id', ['seq-1']);

      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
    });

    it('should skip read-only tables (bible_versions, books, chapters, verses)', async () => {
      mockTransaction.crud = [
        {
          table: 'bible_versions',
          op: UpdateType.PUT,
          id: 'version-1',
          opData: { name: 'Version 1' },
        },
        {
          table: 'books',
          op: UpdateType.PATCH,
          id: 'book-1',
          opData: { name: 'Book 1' },
        },
        {
          table: 'chapters',
          op: UpdateType.DELETE,
          id: 'chapter-1',
          opData: {},
        },
        {
          table: 'verses',
          op: UpdateType.PUT,
          id: 'verse-1',
          opData: { text: 'Verse 1' },
        },
        {
          table: 'projects',
          op: UpdateType.PUT,
          id: 'project-1',
          opData: { name: 'Project 1' },
        },
      ];

      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      mockSupabase.from = mockFrom as any;

      await connector.uploadData(mockDatabase);

      // Should only call for projects, not read-only tables
      expect(mockFrom).toHaveBeenCalledTimes(1);
      expect(mockFrom).toHaveBeenCalledWith('projects');
      expect(mockLogger.debug).toHaveBeenCalledTimes(4); // One for each skipped table
      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed operation types', async () => {
      mockTransaction.crud = [
        {
          table: 'projects',
          op: UpdateType.PUT,
          id: 'project-1',
          opData: { name: 'Project 1' },
        },
        {
          table: 'projects',
          op: UpdateType.PATCH,
          id: 'project-2',
          opData: { name: 'Updated Project' },
        },
        {
          table: 'projects',
          op: UpdateType.DELETE,
          id: 'project-3',
          opData: {},
        },
      ];

      const mockUpsert = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      const mockDelete = jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        upsert: mockUpsert,
        update: mockUpdate,
        delete: mockDelete,
      }) as any;

      await connector.uploadData(mockDatabase);

      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
    });

    it('should throw error on PUT operation failure', async () => {
      mockTransaction.crud = [
        {
          table: 'projects',
          op: UpdateType.PUT,
          id: 'project-1',
          opData: { name: 'Project 1' },
        },
      ];

      // Use a non-fatal error code to test error throwing
      const putError = {
        error: { message: 'PUT failed', code: 'UNKNOWN_ERROR' },
      };
      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue(putError),
      });
      mockSupabase.from = mockFrom as any;

      await expect(connector.uploadData(mockDatabase)).rejects.toEqual(
        putError.error
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'PowerSync bulk PUT error for projects:',
        putError.error
      );
    });

    it('should throw error on PATCH operation failure', async () => {
      mockTransaction.crud = [
        {
          table: 'projects',
          op: UpdateType.PATCH,
          id: 'project-1',
          opData: { name: 'Updated Project' },
        },
      ];

      const patchError = { error: { message: 'PATCH failed' } };
      const mockFrom = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(patchError),
        }),
      });
      mockSupabase.from = mockFrom as any;

      await expect(connector.uploadData(mockDatabase)).rejects.toEqual(
        patchError.error
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'PowerSync PATCH error for projects:',
        patchError.error
      );
    });

    it('should throw error on DELETE operation failure', async () => {
      mockTransaction.crud = [
        {
          table: 'projects',
          op: UpdateType.DELETE,
          id: 'project-1',
          opData: {},
        },
      ];

      const deleteError = { error: { message: 'DELETE failed' } };
      const mockFrom = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue(deleteError),
        }),
      });
      mockSupabase.from = mockFrom as any;

      await expect(connector.uploadData(mockDatabase)).rejects.toEqual(
        deleteError.error
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'PowerSync bulk DELETE error for projects:',
        deleteError.error
      );
    });

    it('should discard transaction on fatal error (PGRST116)', async () => {
      mockTransaction.crud = [
        {
          table: 'projects',
          op: UpdateType.PUT,
          id: 'project-1',
          opData: { name: 'Project 1' },
        },
      ];

      const fatalError = { error: { message: 'Not found', code: 'PGRST116' } };
      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue(fatalError),
      });
      mockSupabase.from = mockFrom as any;

      await connector.uploadData(mockDatabase);

      // Should complete transaction (discard) instead of throwing
      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'PowerSync upload fatal error - discarding transaction:',
        expect.any(Error)
      );
    });

    it('should discard transaction on fatal error (unique violation)', async () => {
      mockTransaction.crud = [
        {
          table: 'projects',
          op: UpdateType.PUT,
          id: 'project-1',
          opData: { name: 'Project 1' },
        },
      ];

      const fatalError = {
        error: { message: 'Unique violation', code: '23505' },
      };
      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue(fatalError),
      });
      mockSupabase.from = mockFrom as any;

      await connector.uploadData(mockDatabase);

      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'PowerSync upload fatal error - discarding transaction:',
        expect.any(Error)
      );
    });

    it('should discard transaction on fatal error (foreign key violation)', async () => {
      mockTransaction.crud = [
        {
          table: 'projects',
          op: UpdateType.PUT,
          id: 'project-1',
          opData: { name: 'Project 1' },
        },
      ];

      const fatalError = { error: { message: 'FK violation', code: '23503' } };
      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue(fatalError),
      });
      mockSupabase.from = mockFrom as any;

      await connector.uploadData(mockDatabase);

      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'PowerSync upload fatal error - discarding transaction:',
        expect.any(Error)
      );
    });

    it('should discard transaction on fatal error (insufficient privilege)', async () => {
      mockTransaction.crud = [
        {
          table: 'projects',
          op: UpdateType.PUT,
          id: 'project-1',
          opData: { name: 'Project 1' },
        },
      ];

      const fatalError = {
        error: { message: 'Permission denied', code: '42501' },
      };
      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue(fatalError),
      });
      mockSupabase.from = mockFrom as any;

      await connector.uploadData(mockDatabase);

      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'PowerSync upload fatal error - discarding transaction:',
        expect.any(Error)
      );
    });

    it('should discard transaction on fatal error (HTTP 400)', async () => {
      mockTransaction.crud = [
        {
          table: 'projects',
          op: UpdateType.PUT,
          id: 'project-1',
          opData: { name: 'Project 1' },
        },
      ];

      const fatalError = { error: { message: 'Bad request', status: 400 } };
      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue(fatalError),
      });
      mockSupabase.from = mockFrom as any;

      await connector.uploadData(mockDatabase);

      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'PowerSync upload fatal error - discarding transaction:',
        expect.any(Error)
      );
    });

    it('should throw transient error (HTTP 500) for retry', async () => {
      mockTransaction.crud = [
        {
          table: 'projects',
          op: UpdateType.PUT,
          id: 'project-1',
          opData: { name: 'Project 1' },
        },
      ];

      const transientError = {
        error: { message: 'Server error', status: 500 },
      };
      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue(transientError),
      });
      mockSupabase.from = mockFrom as any;

      await expect(connector.uploadData(mockDatabase)).rejects.toEqual(
        transientError.error
      );
      expect(mockTransaction.complete).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'PowerSync upload transient error - will retry:',
        expect.any(Error)
      );
    });

    it('should throw transient error (HTTP 503) for retry', async () => {
      mockTransaction.crud = [
        {
          table: 'projects',
          op: UpdateType.PUT,
          id: 'project-1',
          opData: { name: 'Project 1' },
        },
      ];

      const transientError = {
        error: { message: 'Service unavailable', status: 503 },
      };
      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue(transientError),
      });
      mockSupabase.from = mockFrom as any;

      await expect(connector.uploadData(mockDatabase)).rejects.toEqual(
        transientError.error
      );
      expect(mockTransaction.complete).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'PowerSync upload transient error - will retry:',
        expect.any(Error)
      );
    });
  });
});
