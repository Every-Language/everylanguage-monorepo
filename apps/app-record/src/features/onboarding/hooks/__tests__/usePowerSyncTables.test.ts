import { renderHook, waitFor, act } from '@testing-library/react-native';
import { usePowerSyncTables } from '../usePowerSyncTables';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';

// Mock dependencies
jest.mock('@/shared/services/powersync/PowerSyncSystem');

const mockPowerSyncSystem = powerSyncSystem as jest.Mocked<
  typeof powerSyncSystem
>;

describe('usePowerSyncTables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockPowerSyncSystem.isInitialized = true;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return empty tables when PowerSync is not initialized', async () => {
    mockPowerSyncSystem.isInitialized = false;

    const { result } = renderHook(() => usePowerSyncTables());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tables).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch and return synced tables', async () => {
    const mockTables = [
      { name: 'bible_versions' },
      { name: 'books' },
      { name: 'chapters' },
      { name: 'media_files_downloads' }, // Should be filtered out
    ];

    mockPowerSyncSystem.getAll = jest.fn().mockResolvedValue(mockTables);
    mockPowerSyncSystem.get = jest.fn().mockResolvedValue({ count: 10 });

    const { result } = renderHook(() => usePowerSyncTables());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tables.length).toBeGreaterThan(0);
    expect(result.current.tables[0]).toHaveProperty('name');
    expect(result.current.tables[0]).toHaveProperty('rowCount');
    // Should filter out local-only tables
    expect(
      result.current.tables.find(t => t.name === 'media_files_downloads')
    ).toBeUndefined();
  });

  it('should filter out local-only tables', async () => {
    const mockTables = [
      { name: 'bible_versions' },
      { name: 'download_queue' }, // Local-only
      { name: 'user_queue' }, // Local-only
      { name: 'books' },
    ];

    mockPowerSyncSystem.getAll = jest.fn().mockResolvedValue(mockTables);
    mockPowerSyncSystem.get = jest.fn().mockResolvedValue({ count: 5 });

    const { result } = renderHook(() => usePowerSyncTables());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const tableNames = result.current.tables.map(t => t.name);
    expect(tableNames).not.toContain('download_queue');
    expect(tableNames).not.toContain('user_queue');
    expect(tableNames).toContain('bible_versions');
    expect(tableNames).toContain('books');
  });

  it('should limit to 10 tables', async () => {
    const mockTables = Array.from({ length: 15 }, (_, i) => ({
      name: `table_${i}`,
    }));

    mockPowerSyncSystem.getAll = jest.fn().mockResolvedValue(mockTables);
    mockPowerSyncSystem.get = jest.fn().mockResolvedValue({ count: 1 });

    const { result } = renderHook(() => usePowerSyncTables());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tables.length).toBeLessThanOrEqual(10);
  });

  it('should skip invalid table names', async () => {
    const mockTables = [
      { name: 'valid_table' },
      { name: 'invalid-table' }, // Contains hyphen
      { name: '123invalid' }, // Starts with number
      { name: 'valid_table_2' },
    ];

    mockPowerSyncSystem.getAll = jest.fn().mockResolvedValue(mockTables);
    mockPowerSyncSystem.get = jest.fn().mockResolvedValue({ count: 1 });

    const { result } = renderHook(() => usePowerSyncTables());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const tableNames = result.current.tables.map(t => t.name);
    expect(tableNames).toContain('valid_table');
    expect(tableNames).toContain('valid_table_2');
    expect(tableNames).not.toContain('invalid-table');
    expect(tableNames).not.toContain('123invalid');
  });

  it('should handle errors when fetching tables', async () => {
    mockPowerSyncSystem.getAll = jest
      .fn()
      .mockRejectedValue(new Error('Database error'));

    const { result } = renderHook(() => usePowerSyncTables());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.tables).toEqual([]);
  });

  it('should handle errors when querying individual table counts', async () => {
    const mockTables = [{ name: 'bible_versions' }, { name: 'books' }];

    mockPowerSyncSystem.getAll = jest.fn().mockResolvedValue(mockTables);
    mockPowerSyncSystem.get = jest
      .fn()
      .mockRejectedValueOnce(new Error('Query failed'))
      .mockResolvedValueOnce({ count: 5 });

    const { result } = renderHook(() => usePowerSyncTables());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should continue with other tables even if one fails
    expect(result.current.tables.length).toBeGreaterThan(0);
  });

  it('should refresh tables periodically', async () => {
    const mockTables = [{ name: 'bible_versions' }];
    mockPowerSyncSystem.getAll = jest.fn().mockResolvedValue(mockTables);
    mockPowerSyncSystem.get = jest.fn().mockResolvedValue({ count: 10 });

    const { result } = renderHook(() => usePowerSyncTables());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCallCount = mockPowerSyncSystem.getAll.mock.calls.length;

    // Advance timer by 5 seconds (refresh interval)
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(mockPowerSyncSystem.getAll.mock.calls.length).toBeGreaterThan(
        initialCallCount
      );
    });
  });

  it('should show loading state initially', () => {
    mockPowerSyncSystem.getAll = jest.fn().mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => usePowerSyncTables());

    expect(result.current.loading).toBe(true);
    expect(result.current.tables).toEqual([]);
  });

  it('should format row counts correctly', async () => {
    const mockTables = [{ name: 'bible_versions' }];
    mockPowerSyncSystem.getAll = jest.fn().mockResolvedValue(mockTables);
    mockPowerSyncSystem.get = jest.fn().mockResolvedValue({ count: 1234 });

    const { result } = renderHook(() => usePowerSyncTables());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tables[0]?.rowCount).toBe(1234);
  });
});
