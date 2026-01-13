import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useDeleteProject } from '../useDeleteProject';
import { powerSyncSystem } from '@/shared/infrastructure/powersync/services/PowerSyncSystem';

// Mock PowerSync system
jest.mock('@/shared/infrastructure/powersync/services/PowerSyncSystem');

const mockPowerSyncSystem = powerSyncSystem as jest.Mocked<
  typeof powerSyncSystem
>;

describe('useDeleteProject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPowerSyncSystem.isInitialized = true;
    mockPowerSyncSystem.execute.mockResolvedValue(undefined);
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useDeleteProject());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.deleteProject).toBe('function');
  });

  it('should perform cascading soft delete correctly', async () => {
    const projectId = 'project-123';
    const { result } = renderHook(() => useDeleteProject());

    await act(async () => {
      await result.current.deleteProject(projectId);
    });

    // Should delete segments first
    expect(mockPowerSyncSystem.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE segments'),
      expect.arrayContaining([
        expect.any(String), // deleted_at timestamp
        expect.any(String), // updated_at timestamp
        projectId,
      ])
    );

    // Then sequences
    expect(mockPowerSyncSystem.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE sequences'),
      expect.arrayContaining([
        expect.any(String), // deleted_at timestamp
        expect.any(String), // updated_at timestamp
        projectId,
      ])
    );

    // Finally the project itself
    expect(mockPowerSyncSystem.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE projects'),
      expect.arrayContaining([
        expect.any(String), // deleted_at timestamp
        expect.any(String), // updated_at timestamp
        projectId,
      ])
    );

    // Verify all three operations were called
    expect(mockPowerSyncSystem.execute).toHaveBeenCalledTimes(3);
  });

  it('should use same timestamp for all deletions', async () => {
    const projectId = 'project-123';
    const { result } = renderHook(() => useDeleteProject());

    await act(async () => {
      await result.current.deleteProject(projectId);
    });

    const calls = mockPowerSyncSystem.execute.mock.calls;
    const deletedAtSegments = calls[0][1][0] as string;
    const deletedAtSequences = calls[1][1][0] as string;
    const deletedAtProject = calls[2][1][0] as string;

    // All should use the same timestamp
    expect(deletedAtSegments).toBe(deletedAtSequences);
    expect(deletedAtSequences).toBe(deletedAtProject);
  });

  it('should only soft delete non-deleted records', async () => {
    const projectId = 'project-123';
    const { result } = renderHook(() => useDeleteProject());

    await act(async () => {
      await result.current.deleteProject(projectId);
    });

    // Verify WHERE clauses include deleted_at IS NULL
    expect(mockPowerSyncSystem.execute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE project_id = ? AND deleted_at IS NULL'),
      expect.any(Array)
    );

    expect(mockPowerSyncSystem.execute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE project_id = ? AND deleted_at IS NULL'),
      expect.any(Array)
    );
  });

  it('should set loading state during deletion', async () => {
    let resolveExecute: () => void;
    const executePromise = new Promise<void>(resolve => {
      resolveExecute = resolve;
    });

    mockPowerSyncSystem.execute.mockReturnValue(executePromise);

    const { result } = renderHook(() => useDeleteProject());

    let deletePromise: Promise<void>;
    await act(async () => {
      deletePromise = result.current.deleteProject('project-123');
    });

    // Check loading state is true
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // Resolve the promise
    await act(async () => {
      resolveExecute!();
      await deletePromise!;
    });

    // Check loading state is false after completion
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle PowerSync not initialized error', async () => {
    mockPowerSyncSystem.isInitialized = false;

    const { result } = renderHook(() => useDeleteProject());

    await act(async () => {
      await expect(result.current.deleteProject('project-123')).rejects.toThrow(
        'PowerSync database not initialized'
      );
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe(
        'PowerSync database not initialized'
      );
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle database errors during segment deletion', async () => {
    const dbError = new Error('Failed to delete segments');
    mockPowerSyncSystem.execute.mockRejectedValueOnce(dbError);

    const { result } = renderHook(() => useDeleteProject());

    await act(async () => {
      await expect(result.current.deleteProject('project-123')).rejects.toThrow(
        'Failed to delete segments'
      );
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle database errors during sequence deletion', async () => {
    const dbError = new Error('Failed to delete sequences');
    // First call (segments) succeeds, second (sequences) fails
    mockPowerSyncSystem.execute
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(dbError);

    const { result } = renderHook(() => useDeleteProject());

    await act(async () => {
      await expect(result.current.deleteProject('project-123')).rejects.toThrow(
        'Failed to delete sequences'
      );
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle database errors during project deletion', async () => {
    const dbError = new Error('Failed to delete project');
    // First two calls (segments, sequences) succeed, third (project) fails
    mockPowerSyncSystem.execute
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(dbError);

    const { result } = renderHook(() => useDeleteProject());

    await act(async () => {
      await expect(result.current.deleteProject('project-123')).rejects.toThrow(
        'Failed to delete project'
      );
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should clear error state on successful deletion', async () => {
    const { result } = renderHook(() => useDeleteProject());

    // First, cause an error
    mockPowerSyncSystem.isInitialized = false;
    await act(async () => {
      await expect(
        result.current.deleteProject('project-123')
      ).rejects.toThrow();
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    // Then fix the issue and delete successfully
    mockPowerSyncSystem.isInitialized = true;
    mockPowerSyncSystem.execute.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.deleteProject('project-123');
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });
});
