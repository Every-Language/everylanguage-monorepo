import { PowerSyncConnector } from '../PowerSyncConnector';
import { supabase } from '@/shared/services/api/supabase';
import { env } from '@/app/config/env';
import { isUploadAllowed } from '../UploadPermissions';
import { powerSyncErrorHandler } from '../PowerSyncErrorHandler';
import { UpdateType, AbstractPowerSyncDatabase } from '@powersync/react-native';

// Mock dependencies
jest.mock('@/shared/services/api/supabase');
jest.mock('@/app/config/env');
jest.mock('../UploadPermissions');
jest.mock('../PowerSyncErrorHandler');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockEnv = env as jest.Mocked<typeof env>;
const mockIsUploadAllowed = isUploadAllowed as jest.MockedFunction<
  typeof isUploadAllowed
>;
const mockPowerSyncErrorHandler = powerSyncErrorHandler as jest.Mocked<
  typeof powerSyncErrorHandler
>;

describe('PowerSyncConnector', () => {
  let connector: PowerSyncConnector;
  let mockDatabase: {
    getNextCrudTransaction: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    connector = new PowerSyncConnector();

    // Setup default mocks
    mockEnv.powersync = {
      url: 'https://test.powersync.journeyapps.com',
    };

    mockDatabase = {
      getNextCrudTransaction: jest.fn(),
    };
  });

  describe('fetchCredentials', () => {
    it('should fetch credentials with authenticated session', async () => {
      const mockSession = {
        access_token: 'test-token',
        user: {
          id: 'user-123',
          is_anonymous: false,
        },
      };

      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const credentials = await connector.fetchCredentials();

      expect(credentials).toEqual({
        endpoint: 'https://test.powersync.journeyapps.com',
        token: 'test-token',
        parameters: {
          is_authenticated: 'true',
        },
      });
    });

    it('should fetch credentials with anonymous session', async () => {
      const mockSession = {
        access_token: 'test-token',
        user: {
          id: 'anon-123',
          is_anonymous: true,
        },
      };

      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const credentials = await connector.fetchCredentials();

      expect(credentials).toEqual({
        endpoint: 'https://test.powersync.journeyapps.com',
        token: 'test-token',
        parameters: {
          is_authenticated: 'false',
        },
      });
    });

    it('should throw error when PowerSync URL is not configured', async () => {
      mockEnv.powersync = {
        url: '',
      };

      await expect(connector.fetchCredentials()).rejects.toThrow(
        'PowerSync URL not configured'
      );
    });

    it('should throw error when no session is available', async () => {
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(connector.fetchCredentials()).rejects.toThrow(
        'No Supabase session available'
      );
    });

    it('should throw error when session fetch fails', async () => {
      const mockError = { message: 'Session fetch failed' };
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: mockError,
      });

      await expect(connector.fetchCredentials()).rejects.toEqual(mockError);
    });
  });

  describe('uploadData', () => {
    beforeEach(() => {
      mockIsUploadAllowed.mockReturnValue(true);
      mockPowerSyncErrorHandler.shouldSkipUpload = jest
        .fn()
        .mockReturnValue(false);
      mockPowerSyncErrorHandler.handleError = jest.fn().mockReturnValue({
        isRetryable: false,
        shouldSkip: false,
      });
    });

    it('should return early when no transaction available', async () => {
      mockDatabase.getNextCrudTransaction.mockResolvedValue(null);

      await connector.uploadData(
        mockDatabase as unknown as AbstractPowerSyncDatabase
      );

      expect(mockDatabase.getNextCrudTransaction).toHaveBeenCalledTimes(1);
    });

    it('should skip entire transaction when all operations are disallowed', async () => {
      const mockTransaction = {
        crud: [
          {
            id: 'op-1',
            table: 'read_only_table',
            op: UpdateType.PUT,
            opData: { id: 'op-1', name: 'test' },
          },
        ],
        complete: jest.fn(),
      };

      mockDatabase.getNextCrudTransaction.mockResolvedValue(mockTransaction);
      mockIsUploadAllowed.mockReturnValue(false);

      await connector.uploadData(
        mockDatabase as unknown as AbstractPowerSyncDatabase
      );

      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should skip operations for read-only tables', async () => {
      const mockTransaction = {
        crud: [
          {
            id: 'op-1',
            table: 'read_only_table',
            op: UpdateType.PUT,
            opData: { id: 'op-1', name: 'test' },
          },
          {
            id: 'op-2',
            table: 'writable_table',
            op: UpdateType.PUT,
            opData: { id: 'op-2', name: 'test2' },
          },
        ],
        complete: jest.fn(),
      };

      mockDatabase.getNextCrudTransaction.mockResolvedValue(mockTransaction);
      mockIsUploadAllowed.mockImplementation((table: string) => {
        return table === 'writable_table';
      });

      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockSupabase as any).from = mockFrom;

      await connector.uploadData(
        mockDatabase as unknown as AbstractPowerSyncDatabase
      );

      expect(mockFrom).toHaveBeenCalledWith('writable_table');
      expect(mockFrom).not.toHaveBeenCalledWith('read_only_table');
      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
    });

    it('should skip records that should be skipped by error handler', async () => {
      const mockTransaction = {
        crud: [
          {
            id: 'op-1',
            table: 'test_table',
            op: UpdateType.PUT,
            opData: { id: 'op-1', name: 'test' },
          },
        ],
        complete: jest.fn(),
      };

      mockDatabase.getNextCrudTransaction.mockResolvedValue(mockTransaction);
      mockPowerSyncErrorHandler.shouldSkipUpload = jest
        .fn()
        .mockReturnValue(true);

      await connector.uploadData(
        mockDatabase as unknown as AbstractPowerSyncDatabase
      );

      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
    });

    it('should handle PUT operations', async () => {
      const mockTransaction = {
        crud: [
          {
            id: 'op-1',
            table: 'test_table',
            op: UpdateType.PUT,
            opData: { id: 'op-1', name: 'test' },
          },
        ],
        complete: jest.fn(),
      };

      mockDatabase.getNextCrudTransaction.mockResolvedValue(mockTransaction);

      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      const mockFrom = jest.fn().mockReturnValue({
        upsert: mockUpsert,
      });
      (mockSupabase as any).from = mockFrom;

      await connector.uploadData(
        mockDatabase as unknown as AbstractPowerSyncDatabase
      );

      expect(mockFrom).toHaveBeenCalledWith('test_table');
      expect(mockUpsert).toHaveBeenCalledWith(
        { id: 'op-1', name: 'test' },
        { onConflict: 'id' }
      );
      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
    });

    it('should handle PATCH operations', async () => {
      const mockTransaction = {
        crud: [
          {
            id: 'op-1',
            table: 'test_table',
            op: UpdateType.PATCH,
            opData: { id: 'op-1', name: 'updated' },
          },
        ],
        complete: jest.fn(),
      };

      mockDatabase.getNextCrudTransaction.mockResolvedValue(mockTransaction);

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      const mockFrom = jest.fn().mockReturnValue({
        update: mockUpdate,
      });
      (mockSupabase as any).from = mockFrom;

      await connector.uploadData(
        mockDatabase as unknown as AbstractPowerSyncDatabase
      );

      expect(mockFrom).toHaveBeenCalledWith('test_table');
      expect(mockUpdate).toHaveBeenCalledWith({ name: 'updated' });
      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
    });

    it('should handle DELETE operations', async () => {
      const mockTransaction = {
        crud: [
          {
            id: 'op-1',
            table: 'test_table',
            op: UpdateType.DELETE,
            opData: {},
          },
        ],
        complete: jest.fn(),
      };

      mockDatabase.getNextCrudTransaction.mockResolvedValue(mockTransaction);

      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      const mockFrom = jest.fn().mockReturnValue({
        delete: mockDelete,
      });
      (mockSupabase as any).from = mockFrom;

      await connector.uploadData(
        mockDatabase as unknown as AbstractPowerSyncDatabase
      );

      expect(mockFrom).toHaveBeenCalledWith('test_table');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
    });

    it('should skip DELETE for analytics upload-only tables', async () => {
      const mockTransaction = {
        crud: [
          {
            id: 'op-1',
            table: 'sessions',
            op: UpdateType.DELETE,
            opData: {},
          },
        ],
        complete: jest.fn(),
      };

      mockDatabase.getNextCrudTransaction.mockResolvedValue(mockTransaction);

      await connector.uploadData(
        mockDatabase as unknown as AbstractPowerSyncDatabase
      );

      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully and continue with next operation', async () => {
      const mockTransaction = {
        crud: [
          {
            id: 'op-1',
            table: 'test_table',
            op: UpdateType.PUT,
            opData: { id: 'op-1', name: 'test' },
          },
          {
            id: 'op-2',
            table: 'test_table2',
            op: UpdateType.PUT,
            opData: { id: 'op-2', name: 'test2' },
          },
        ],
        complete: jest.fn(),
      };

      mockDatabase.getNextCrudTransaction.mockResolvedValue(mockTransaction);

      const mockUpsert1 = jest
        .fn()
        .mockResolvedValue({ error: { message: 'Error 1' } });
      const mockUpsert2 = jest.fn().mockResolvedValue({ error: null });
      const mockFrom = jest
        .fn()
        .mockReturnValueOnce({
          upsert: mockUpsert1,
        })
        .mockReturnValueOnce({
          upsert: mockUpsert2,
        });
      (mockSupabase as any).from = mockFrom;

      mockPowerSyncErrorHandler.handleError.mockReturnValue({
        isRetryable: false,
        shouldSkip: true,
      });

      await connector.uploadData(
        mockDatabase as unknown as AbstractPowerSyncDatabase
      );

      expect(mockFrom).toHaveBeenCalledTimes(2);
      expect(mockTransaction.complete).toHaveBeenCalledTimes(1);
    });

    it('should throw retryable errors', async () => {
      const mockTransaction = {
        crud: [
          {
            id: 'op-1',
            table: 'test_table',
            op: UpdateType.PUT,
            opData: { id: 'op-1', name: 'test' },
          },
        ],
        complete: jest.fn(),
      };

      mockDatabase.getNextCrudTransaction.mockResolvedValue(mockTransaction);

      const mockUpsert = jest
        .fn()
        .mockResolvedValue({ error: { message: 'Network error' } });
      const mockFrom = jest.fn().mockReturnValue({
        upsert: mockUpsert,
      });
      (mockSupabase as any).from = mockFrom;

      mockPowerSyncErrorHandler.handleError.mockReturnValue({
        isRetryable: true,
        shouldSkip: false,
      });

      await expect(
        connector.uploadData(
          mockDatabase as unknown as AbstractPowerSyncDatabase
        )
      ).rejects.toThrow();
    });
  });
});
